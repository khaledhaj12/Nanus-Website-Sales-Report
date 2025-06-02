import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { startAutoSync, stopAutoSync, restartAutoSync, getSyncStatus } from "./syncManager";
import session from "express-session";
import { z } from "zod";
import axios from "axios";

// Simple authentication middleware for this demo
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.session?.user) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  }));

  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.validateUser(username, password);
      
      if (user) {
        req.session.user = user;
        res.json(user);
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get('/api/auth/user', (req, res) => {
    if (req.session?.user) {
      res.json(req.session.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  // User routes
  app.get('/api/users', isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.post('/api/users', isAuthenticated, async (req, res) => {
    try {
      const user = await storage.createUser(req.body);
      res.json(user);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.updateUser(userId, req.body);
      res.json(user);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      await storage.deleteUser(userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Location routes
  app.get('/api/locations', isAuthenticated, async (req, res) => {
    try {
      const locations = await storage.getAllLocations();
      res.json(locations);
    } catch (error) {
      console.error("Get locations error:", error);
      res.status(500).json({ message: "Failed to get locations" });
    }
  });

  app.post('/api/locations', isAuthenticated, async (req, res) => {
    try {
      const location = await storage.createLocation(req.body);
      res.json(location);
    } catch (error) {
      console.error("Create location error:", error);
      res.status(500).json({ message: "Failed to create location" });
    }
  });

  // WooCommerce orders routes
  app.get('/api/woo-orders', isAuthenticated, async (req, res) => {
    try {
      const { locationId, search, startDate, endDate } = req.query;
      
      let orders;
      if (search) {
        orders = await storage.searchWooOrders(search as string, locationId ? parseInt(locationId as string) : undefined);
      } else if (startDate && endDate) {
        orders = await storage.getWooOrdersByDateRange(startDate as string, endDate as string, locationId ? parseInt(locationId as string) : undefined);
      } else {
        orders = await storage.getAllWooOrders(locationId ? parseInt(locationId as string) : undefined);
      }
      
      res.json(orders);
    } catch (error) {
      console.error("Get WooCommerce orders error:", error);
      res.status(500).json({ message: "Failed to get WooCommerce orders" });
    }
  });

  // Auto sync settings endpoints
  app.get('/api/sync-settings/:platform', isAuthenticated, async (req, res) => {
    try {
      const { platform } = req.params;
      const settings = await storage.getSyncSettings(platform);
      res.json(settings || { platform, isActive: false, intervalMinutes: 5 });
    } catch (error) {
      console.error("Get sync settings error:", error);
      res.status(500).json({ message: "Failed to get sync settings" });
    }
  });

  app.post('/api/sync-settings', isAuthenticated, async (req, res) => {
    try {
      const { platform, isActive, intervalMinutes } = req.body;
      
      // Calculate next sync time
      const now = new Date();
      const nextSync = new Date(now.getTime() + (intervalMinutes || 5) * 60 * 1000);
      
      const settings = await storage.upsertSyncSettings({
        platform,
        isActive,
        intervalMinutes: intervalMinutes || 5,
        nextSyncAt: nextSync
      });
      
      // Restart auto sync with new settings
      if (isActive) {
        await restartAutoSync();
      } else {
        await stopAutoSync();
      }
      
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Update sync settings error:", error);
      res.status(500).json({ message: "Failed to update sync settings" });
    }
  });

  app.get('/api/sync-status', isAuthenticated, async (req, res) => {
    try {
      const systemStatus = getSyncStatus();
      const settings = await storage.getSyncSettings('woocommerce');
      
      res.json({
        ...systemStatus,
        settings: settings || { platform: 'woocommerce', isActive: false, intervalMinutes: 5 },
        nextSyncIn: settings?.nextSyncAt ? Math.max(0, Math.floor((new Date(settings.nextSyncAt).getTime() - Date.now()) / 1000)) : 0
      });
    } catch (error) {
      console.error("Get sync status error:", error);
      res.status(500).json({ message: "Failed to get sync status" });
    }
  });

  // REST API settings endpoints
  app.get('/api/rest-api-settings/:platform', isAuthenticated, async (req, res) => {
    try {
      const { platform } = req.params;
      const settings = await storage.getRestApiSettings(platform);
      res.json(settings || { platform, consumerKey: '', consumerSecret: '', storeUrl: '', isActive: true });
    } catch (error) {
      console.error("Get REST API settings error:", error);
      res.status(500).json({ message: "Failed to get REST API settings" });
    }
  });

  app.post('/api/rest-api-settings', isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.upsertRestApiSettings(req.body);
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Update REST API settings error:", error);
      res.status(500).json({ message: "Failed to update REST API settings" });
    }
  });

  // Manual import endpoint
  app.post('/api/import-woo-orders', isAuthenticated, async (req, res) => {
    try {
      const { storeUrl, consumerKey, consumerSecret, startDate, endDate } = req.body;
      
      if (!storeUrl || !consumerKey || !consumerSecret) {
        return res.status(400).json({ message: "Missing required API credentials" });
      }

      let imported = 0;
      let skipped = 0;
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const url = `${storeUrl}/wp-json/wc/v3/orders?per_page=100&page=${page}&orderby=date&order=desc&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
        
        const response = await axios.get(url);
        const orders = response.data;
        
        if (!Array.isArray(orders) || orders.length === 0) {
          hasMore = false;
          break;
        }

        for (const order of orders) {
          try {
            // Check if order already exists
            const existingOrder = await storage.getWooOrderByWooOrderId(order.id.toString());
            if (existingOrder) {
              skipped++;
              continue;
            }

            // Only assign location if orderable metadata exists
            let location = null;
            const orderableLocationMeta = order.meta_data?.find((meta: any) => meta.key === '_orderable_location_name')?.value;
            
            if (orderableLocationMeta) {
              location = await storage.getLocationByName(orderableLocationMeta);
              if (!location) {
                location = await storage.createLocation({ name: orderableLocationMeta });
              }
            } else {
              // Create or get "Unknown Location" for orders without orderable metadata
              location = await storage.getLocationByName('Unknown Location');
              if (!location) {
                location = await storage.createLocation({ name: 'Unknown Location' });
              }
            }

            // Create order data
            const orderData = {
              wooOrderId: order.id.toString(),
              orderId: order.number.toString(),
              locationId: location.id,
              customerName: `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim() || null,
              firstName: order.billing?.first_name || null,
              lastName: order.billing?.last_name || null,
              customerEmail: order.billing?.email || null,
              customerPhone: order.billing?.phone || null,
              customerId: order.customer_id?.toString() || null,
              amount: order.total,
              subtotal: order.subtotal || '0',
              shippingTotal: order.shipping_total || '0',
              taxTotal: order.tax_total || '0',
              discountTotal: order.discount_total || '0',
              refundAmount: '0',
              status: order.status,
              orderDate: new Date(order.date_created),
              wooOrderNumber: order.number.toString(),
              paymentMethod: order.payment_method || null,
              paymentMethodTitle: order.payment_method_title || null,
              currency: order.currency || 'USD',
              shippingFirstName: order.shipping?.first_name || null,
              shippingLastName: order.shipping?.last_name || null,
              shippingAddress1: order.shipping?.address_1 || null,
              shippingAddress2: order.shipping?.address_2 || null,
              shippingCity: order.shipping?.city || null,
              shippingState: order.shipping?.state || null,
              shippingPostcode: order.shipping?.postcode || null,
              shippingCountry: order.shipping?.country || null,
              billingFirstName: order.billing?.first_name || null,
              billingLastName: order.billing?.last_name || null,
              billingAddress1: order.billing?.address_1 || null,
              billingAddress2: order.billing?.address_2 || null,
              billingCity: order.billing?.city || null,
              billingState: order.billing?.state || null,
              billingPostcode: order.billing?.postcode || null,
              billingCountry: order.billing?.country || null,
              locationMeta: orderableLocationMeta || 'Unknown Location',
              orderNotes: order.customer_note || null,
              customerNote: order.customer_note || null,
              lineItems: JSON.stringify(order.line_items || []),
              metaData: JSON.stringify(order.meta_data || []),
              rawData: JSON.stringify(order)
            };

            await storage.createWooOrder(orderData);
            imported++;
          } catch (orderError) {
            console.error(`Failed to import order ${order.id}:`, orderError);
            skipped++;
          }
        }

        page++;
        if (orders.length < 100) {
          hasMore = false;
        }
      }

      res.json({ 
        success: true, 
        message: `Import completed: ${imported} orders imported, ${skipped} skipped`,
        imported,
        skipped
      });

    } catch (error) {
      console.error("Import orders error:", error);
      res.status(500).json({ 
        success: false, 
        message: `Import failed: ${error.message}` 
      });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/summary', isAuthenticated, async (req, res) => {
    try {
      const { locationId, month } = req.query;
      const summary = await storage.getDashboardSummary(
        locationId ? parseInt(locationId as string) : undefined,
        month as string
      );
      res.json(summary);
    } catch (error) {
      console.error("Dashboard summary error:", error);
      res.status(500).json({ message: "Failed to get dashboard summary" });
    }
  });

  app.get('/api/dashboard/monthly-breakdown', isAuthenticated, async (req, res) => {
    try {
      const { year, locationId } = req.query;
      const breakdown = await storage.getMonthlyBreakdown(
        year ? parseInt(year as string) : undefined,
        locationId ? parseInt(locationId as string) : undefined
      );
      res.json(breakdown);
    } catch (error) {
      console.error("Monthly breakdown error:", error);
      res.status(500).json({ message: "Failed to get monthly breakdown" });
    }
  });

  const httpServer = createServer(app);
  
  // Start auto sync on server startup
  setTimeout(async () => {
    try {
      await startAutoSync();
    } catch (error) {
      console.log("Auto sync not started:", error.message);
    }
  }, 5000);
  
  return httpServer;
}