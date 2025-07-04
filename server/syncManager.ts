import { storage } from "./storage";
import axios from "axios";
import { findOrCreateLocation, getStandardLocationForDomain } from "./locationUtils";

interface SyncManager {
  intervalId: NodeJS.Timeout | null;
  isRunning: boolean;
  platform: string;
  lastSyncAt: Date | null;
  nextSyncAt: Date | null;
  intervalMinutes: number;
  isActive: boolean;
  lastOrderCount: number;
}

const syncManagers: Map<string, SyncManager> = new Map();

export async function startAutoSync(platform: string = 'woocommerce') {
  const manager = syncManagers.get(platform);
  if (manager?.isRunning) {
    console.log(`Auto sync already running for ${platform}`);
    return;
  }

  const settings = await storage.getSyncSettings(platform);
  if (!settings || !settings.isActive) {
    console.log(`Auto sync is disabled for ${platform}`);
    return;
  }

  const intervalMs = (settings.intervalMinutes || 5) * 60 * 1000;
  
  const intervalId = setInterval(async () => {
    await performSync(platform);
  }, intervalMs);
  
  syncManagers.set(platform, {
    intervalId,
    isRunning: true,
    platform,
    lastSyncAt: settings.lastSyncAt,
    nextSyncAt: new Date(Date.now() + intervalMs),
    intervalMinutes: settings.intervalMinutes || 5,
    isActive: true,
    lastOrderCount: 0
  });
  
  // Update sync settings to reflect running state
  await storage.upsertSyncSettings({
    platform: platform,
    isActive: settings.isActive,
    intervalMinutes: settings.intervalMinutes,
    isRunning: true,
    lastSyncAt: settings.lastSyncAt,
    nextSyncAt: settings.nextSyncAt
  });
  
  console.log(`Auto sync started for ${platform} - running every ${settings.intervalMinutes} minutes`);
  
  // Perform initial sync
  await performSync(platform);
}

export async function stopAutoSync(platform: string = 'woocommerce') {
  const manager = syncManagers.get(platform);
  if (manager?.intervalId) {
    clearInterval(manager.intervalId);
    syncManagers.delete(platform);
    console.log(`Auto sync stopped for ${platform}`);
    
    // Update sync settings to reflect stopped state
    const settings = await storage.getSyncSettings(platform);
    if (settings) {
      await storage.upsertSyncSettings({
        platform: platform,
        isActive: settings.isActive,
        intervalMinutes: settings.intervalMinutes,
        isRunning: false,
        lastSyncAt: settings.lastSyncAt,
        nextSyncAt: null
      });
    }
  }
}

export async function restartAutoSync(platform: string = 'woocommerce') {
  await stopAutoSync(platform);
  await startAutoSync(platform);
}

export function getSyncStatus(platform?: string) {
  if (platform) {
    const manager = syncManagers.get(platform);
    return {
      isRunning: manager?.isRunning || false,
      platform: platform
    };
  }
  
  // Return overall sync status
  const allManagers = Array.from(syncManagers.values());
  return {
    isRunning: allManagers.some(m => m.isRunning),
    activeConnections: allManagers.filter(m => m.isRunning).length,
    totalConnections: allManagers.length
  };
}

async function performSync(platform: string = 'woocommerce') {
  try {
    console.log(`=== AUTO SYNC STARTED for ${platform} ===`);
    
    // Update sync status to running
    const settings = await storage.getSyncSettings(platform);
    if (!settings) return;
    
    await storage.upsertSyncSettings({
      platform: platform,
      isActive: settings.isActive,
      intervalMinutes: settings.intervalMinutes,
      isRunning: true,
      lastSyncAt: settings.lastSyncAt,
      nextSyncAt: settings.nextSyncAt
    });

    // Get API settings
    const apiSettings = await storage.getRestApiSettings(platform);
    if (!apiSettings || !apiSettings.consumerKey || !apiSettings.consumerSecret || !apiSettings.storeUrl) {
      console.log("WooCommerce API not configured for auto sync");
      return;
    }

    // Calculate date range - sync orders from last sync time or last 24 hours
    // Add 1-hour buffer to catch orders created during sync windows and timezone issues
    const now = new Date();
    const lastSync = settings.lastSyncAt ? 
      new Date(settings.lastSyncAt.getTime() - 60 * 60 * 1000) : // 1 hour before last sync
      new Date(now.getTime() - 48 * 60 * 60 * 1000); // or last 48 hours for first sync
    const nextSync = new Date(now.getTime() + (settings.intervalMinutes || 5) * 60 * 1000);
    
    // Fetch new/updated orders using comprehensive approach
    const result = await fetchWooCommerceOrders(
      apiSettings.storeUrl,
      apiSettings.consumerKey,
      apiSettings.consumerSecret,
      lastSync.toISOString(),
      now.toISOString()
    );

    // Update sync status with order count and completion time for the specific platform
    await storage.updateSyncStats(platform, result.imported);
    
    // Update the last sync timestamp
    await storage.upsertSyncSettings({
      platform: platform,
      isActive: settings.isActive,
      intervalMinutes: settings.intervalMinutes,
      isRunning: false,
      lastSyncAt: now,
      nextSyncAt: nextSync
    });

    console.log(`Auto sync completed: ${result.imported} imported, ${result.skipped} skipped`);
  } catch (error) {
    console.error("Auto sync failed:", error);
    
    // Update sync status to not running for the specific platform
    const settings = await storage.getSyncSettings(platform);
    if (settings) {
      await storage.upsertSyncSettings({
        platform: platform,
        isActive: settings.isActive,
        intervalMinutes: settings.intervalMinutes,
        isRunning: false,
        lastSyncAt: settings.lastSyncAt,
        nextSyncAt: settings.nextSyncAt
      });
    }
  }
}

async function fetchWooCommerceOrders(
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string,
  startDate: string,
  endDate: string
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    // Use 'after' parameter to catch orders by creation date rather than modification date
    // This ensures we catch all orders created since the last sync
    const url = `${storeUrl}/wp-json/wc/v3/orders?per_page=100&page=${page}&orderby=date&order=desc&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}&after=${startDate}&status=processing,completed,refunded`;
    
    console.log(`Fetching auto sync page ${page}...`);
    console.log(`Sync query: after=${startDate}`);
    
    let response: any;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        response = await axios.get(url, { timeout: 30000 });
        break;
      } catch (error: any) {
        retryCount++;
        console.log(`API call failed (attempt ${retryCount}/${maxRetries}):`, error.message);
        if (retryCount >= maxRetries) {
          throw error;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
    
    const orders = response?.data || [];
    
    if (!Array.isArray(orders) || orders.length === 0) {
      hasMore = false;
      break;
    }
    
    console.log(`Found ${orders.length} orders on page ${page}`);
    
    // Log first few order IDs for debugging
    if (orders.length > 0) {
      const orderIds = orders.slice(0, 5).map(o => o.id);
      console.log(`Page ${page} order IDs: ${orderIds.join(', ')}`);
    }

    for (const order of orders) {
      try {
        // Check if order already exists
        const existingOrder = await storage.getWooOrderByWooOrderId(order.id.toString());
        if (existingOrder) {
          skipped++;
          continue;
        }

        // Enhanced location assignment logic with normalization and duplicate prevention
        let targetLocationName = '';
        const orderableLocationMeta = order.meta_data?.find((meta: any) => meta.key === '_orderable_location_name')?.value;
        
        if (orderableLocationMeta) {
          // Use orderable metadata if available
          targetLocationName = orderableLocationMeta;
        } else {
          // No orderable metadata - assign default location based on store domain
          targetLocationName = getStandardLocationForDomain(storeUrl);
        }
        
        // Use the enhanced location finder
        const location = await findOrCreateLocation(targetLocationName);

        // Extract comprehensive order data
        const orderData = {
          wooOrderId: order.id.toString(),
          orderId: order.number.toString(),
          locationId: location.id,
          
          // Customer information
          customerName: `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim() || null,
          firstName: order.billing?.first_name || null,
          lastName: order.billing?.last_name || null,
          customerEmail: order.billing?.email || null,
          customerPhone: order.billing?.phone || null,
          customerId: order.customer_id?.toString() || null,
          
          // Financial details
          amount: order.total,
          subtotal: order.subtotal || '0',
          shippingTotal: order.shipping_total || '0',
          taxTotal: order.tax_total || '0',
          discountTotal: order.discount_total || '0',
          refundAmount: '0',
          
          // Order details
          status: order.status,
          orderDate: new Date(order.date_created),
          wooOrderNumber: order.number.toString(),
          paymentMethod: order.payment_method || null,
          paymentMethodTitle: order.payment_method_title || null,
          currency: order.currency || 'USD',
          
          // Shipping information
          shippingFirstName: order.shipping?.first_name || null,
          shippingLastName: order.shipping?.last_name || null,
          shippingAddress1: order.shipping?.address_1 || null,
          shippingAddress2: order.shipping?.address_2 || null,
          shippingCity: order.shipping?.city || null,
          shippingState: order.shipping?.state || null,
          shippingPostcode: order.shipping?.postcode || null,
          shippingCountry: order.shipping?.country || null,
          
          // Billing information
          billingFirstName: order.billing?.first_name || null,
          billingLastName: order.billing?.last_name || null,
          billingAddress1: order.billing?.address_1 || null,
          billingAddress2: order.billing?.address_2 || null,
          billingCity: order.billing?.city || null,
          billingState: order.billing?.state || null,
          billingPostcode: order.billing?.postcode || null,
          billingCountry: order.billing?.country || null,
          
          // Metadata and notes
          locationMeta: orderableLocationMeta || 'Unknown Location',
          orderNotes: order.customer_note || null,
          customerNote: order.customer_note || null,
          
          // Raw data storage
          lineItems: JSON.stringify(order.line_items || []),
          metaData: JSON.stringify(order.meta_data || []),
          rawData: JSON.stringify(order)
        };

        await storage.createWooOrder(orderData);
        imported++;
      } catch (error) {
        console.error(`Failed to process order ${order.id}:`, error);
        skipped++;
      }
    }

    page++;
    if (orders.length < 100) {
      hasMore = false;
    }
  }

  return { imported, skipped };
}

export function getSyncManager() {
  return {
    getStatus: (platform: string) => {
      const manager = syncManagers.get(platform);
      if (!manager) {
        return {
          isRunning: false,
          isActive: false,
          lastSyncAt: null,
          nextSyncAt: null,
          intervalMinutes: 5,
          lastOrderCount: 0,
        };
      }
      return {
        isRunning: manager.isRunning,
        isActive: manager.isActive,
        lastSyncAt: manager.lastSyncAt,
        nextSyncAt: manager.nextSyncAt,
        intervalMinutes: manager.intervalMinutes,
        lastOrderCount: manager.lastOrderCount,
      };
    }
  };
}

export function getAllSyncManagers() {
  return Array.from(syncManagers.values());
}