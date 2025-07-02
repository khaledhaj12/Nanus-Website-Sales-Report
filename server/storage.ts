import {
  users,
  locations,
  orders,
  userLocationAccess,
  userStatusAccess,
  userPagePermissions,
  syncSettings,
  storeConnections,
  restApiSettings,
  recaptchaSettings,
  footerSettings,
  logoSettings,
  type User,
  type InsertUser,
  type Location,
  type InsertLocation,
  type Order,
  type InsertOrder,
  type SyncSettings,
  type InsertSyncSettings,
  type StoreConnection,
  type InsertStoreConnection,
  type RestApiSettings,
  type InsertRestApiSettings,
  type RecaptchaSettings,
  type InsertRecaptchaSettings,
  type FooterSettings,
  type InsertFooterSettings,
  type LogoSettings,
  type InsertLogoSettings,
  type UserLocationAccess,
  type UserStatusAccess,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, or, like, inArray, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  
  // Authentication
  validateUser(username: string, password: string): Promise<User | null>;
  updateUserProfile(id: number, profileData: Partial<Pick<InsertUser, 'username' | 'firstName' | 'lastName' | 'email' | 'phoneNumber'>>): Promise<User>;
  changeUserPassword(id: number, currentPassword: string, newPassword: string): Promise<boolean>;
  
  // Location operations
  getLocation(id: number): Promise<Location | undefined>;
  getLocationByName(name: string): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  getAllLocations(): Promise<Location[]>;
  deleteLocations(ids: number[]): Promise<void>;
  
  // Order operations
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByOrderId(orderId: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order>;
  deleteOrder(id: number): Promise<void>;
  deleteOrders(ids: number[]): Promise<void>;
  getAllOrders(locationId?: number): Promise<Order[]>;
  getOrdersByLocation(locationId: number): Promise<Order[]>;
  getOrdersByDateRange(startDate: string, endDate: string, locationId?: number): Promise<Order[]>;
  searchOrders(searchTerm: string, locationId?: number): Promise<Order[]>;
  
  // User location access
  getUserLocationAccess(userId: number): Promise<number[]>;
  setUserLocationAccess(userId: number, locationIds: number[]): Promise<void>;
  
  // User status access
  getUserStatusAccess(userId: number): Promise<string[]>;
  setUserStatusAccess(userId: number, statuses: string[]): Promise<void>;
  
  // Analytics
  getDashboardSummary(locationId?: number, month?: string): Promise<{
    totalSales: number;
    totalOrders: number;
    totalRefunds: number;
    platformFees: number;
    stripeFees: number;
    netDeposit: number;
  }>;
  
  getMonthlyBreakdown(year: number, locationId?: number): Promise<Array<{
    month: string;
    totalSales: number;
    totalOrders: number;
    totalRefunds: number;
    netAmount: number;
    orders: Order[];
  }>>;
  

  
  // Sync settings operations
  getSyncSettings(platform: string): Promise<SyncSettings | undefined>;
  upsertSyncSettings(settings: InsertSyncSettings): Promise<SyncSettings>;
  updateSyncStats(platform: string, orderCount: number): Promise<void>;
  
  // REST API settings operations
  getRestApiSettings(platform: string): Promise<RestApiSettings | undefined>;
  upsertRestApiSettings(settings: InsertRestApiSettings): Promise<RestApiSettings>;
  
  // reCAPTCHA settings operations
  getRecaptchaSettings(): Promise<RecaptchaSettings | undefined>;
  upsertRecaptchaSettings(settings: InsertRecaptchaSettings): Promise<RecaptchaSettings>;
  
  // Store connections operations
  getAllStoreConnections(): Promise<StoreConnection[]>;
  getStoreConnection(id: string): Promise<StoreConnection | undefined>;
  getStoreConnectionByUrl(storeUrl: string): Promise<StoreConnection | undefined>;
  createStoreConnection(connection: InsertStoreConnection): Promise<StoreConnection>;
  deleteStoreConnection(id: number): Promise<void>;
  updateStoreConnectionLocation(connectionId: string, locationId: number): Promise<void>;
  updateUnknownLocationOrders(connectionId: string, locationId: number): Promise<void>;
  
  // Footer settings operations
  getFooterSettings(): Promise<FooterSettings | undefined>;
  upsertFooterSettings(settings: InsertFooterSettings): Promise<FooterSettings>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async updateUser(id: number, insertUser: Partial<InsertUser>): Promise<User> {
    const updateData = { ...insertUser };
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    console.log(`validateUser: Looking up username "${username}"`);
    const [user] = await db.select().from(users).where(eq(users.username, username));
    console.log(`validateUser: User found:`, user ? `Yes (ID: ${user.id})` : 'No');
    
    if (!user) return null;
    
    console.log(`validateUser: User isActive:`, user.isActive);
    // Check if user account is active
    if (!user.isActive) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    console.log(`validateUser: Password valid:`, isValid);
    return isValid ? user : null;
  }

  async updateUserProfile(id: number, profileData: Partial<Pick<InsertUser, 'username' | 'firstName' | 'lastName' | 'email' | 'phoneNumber'>>): Promise<User> {
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Map camelCase to snake_case for database
    if (profileData.username !== undefined) updateData.username = profileData.username;
    if (profileData.firstName !== undefined) updateData.firstName = profileData.firstName;
    if (profileData.lastName !== undefined) updateData.lastName = profileData.lastName;
    if (profileData.email !== undefined) updateData.email = profileData.email;
    if (profileData.phoneNumber !== undefined) updateData.phoneNumber = profileData.phoneNumber;

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }

  async changeUserPassword(id: number, currentPassword: string, newPassword: string): Promise<boolean> {
    // Get the current user
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    await db
      .update(users)
      .set({ 
        password: hashedNewPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return true;
  }

  async getLocation(id: number): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location || undefined;
  }

  async getLocationByName(name: string): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.name, name));
    return location || undefined;
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const [location] = await db
      .insert(locations)
      .values(insertLocation)
      .returning();
    return location;
  }

  async getAllLocations(): Promise<Location[]> {
    return db.select().from(locations).orderBy(desc(locations.createdAt));
  }

  async deleteLocations(ids: number[]): Promise<void> {
    // Check if any locations have associated orders
    const idsString = ids.join(', ');
    const result = await db.execute(sql.raw(`SELECT DISTINCT location_id FROM woo_orders WHERE location_id IN (${idsString})`));
    
    if (result.rows.length > 0) {
      const usedLocationIds = result.rows.map((row: any) => row.location_id);
      throw new Error(`Cannot delete locations with existing orders. Location IDs: ${usedLocationIds.join(', ')}`);
    }

    // First delete user location access records for these locations
    await db.delete(userLocationAccess).where(inArray(userLocationAccess.locationId, ids));
    
    // Then delete the locations
    await db.delete(locations).where(inArray(locations.id, ids));
  }

  // These order functions are no longer used since orders table was dropped
  // All order operations now use the woo_orders table directly

  async deleteOrders(ids: number[]): Promise<void> {
    console.log("Storage deleteOrders called with IDs:", ids);
    // The dashboard shows WooCommerce orders, so delete from woo_orders table
    // Build the query with literal values to avoid parameter binding issues
    const idsString = ids.join(', ');
    const result = await db.execute(sql.raw(`DELETE FROM woo_orders WHERE id IN (${idsString})`));
    console.log("Delete result:", result);
  }

  // WooCommerce order functions using raw SQL (working approach)
  async getWooOrderByWooOrderId(wooOrderId: string): Promise<any> {
    const result = await db.execute(sql`SELECT * FROM woo_orders WHERE woo_order_id = ${wooOrderId} LIMIT 1`);
    return result.rows[0] || null;
  }

  async createWooOrder(orderData: any): Promise<any> {
    // Use the exact field names as they come from the route
    const result = await db.execute(sql`
      INSERT INTO woo_orders (
        woo_order_id, order_id, location_id, customer_name, first_name, last_name,
        customer_email, customer_phone, customer_id, amount, subtotal, shipping_total,
        tax_total, discount_total, refund_amount, status, order_date, woo_order_number,
        payment_method, payment_method_title, currency, shipping_first_name, shipping_last_name,
        shipping_address_1, shipping_address_2, shipping_city, shipping_state, shipping_postcode,
        shipping_country, billing_first_name, billing_last_name, billing_address_1, billing_address_2,
        billing_city, billing_state, billing_postcode, billing_country, location_meta,
        order_notes, customer_note, line_items, meta_data, raw_data
      ) VALUES (
        ${orderData.wooOrderId}, ${orderData.orderId}, ${orderData.locationId}, ${orderData.customerName},
        ${orderData.firstName}, ${orderData.lastName}, ${orderData.customerEmail}, ${orderData.customerPhone},
        ${orderData.customerId}, ${orderData.amount}, ${orderData.subtotal}, ${orderData.shippingTotal},
        ${orderData.taxTotal}, ${orderData.discountTotal}, ${orderData.refundAmount}, ${orderData.status},
        ${orderData.orderDate}, ${orderData.wooOrderNumber}, ${orderData.paymentMethod}, ${orderData.paymentMethodTitle},
        ${orderData.currency}, ${orderData.shippingFirstName}, ${orderData.shippingLastName}, ${orderData.shippingAddress1},
        ${orderData.shippingAddress2}, ${orderData.shippingCity}, ${orderData.shippingState}, ${orderData.shippingPostcode},
        ${orderData.shippingCountry}, ${orderData.billingFirstName}, ${orderData.billingLastName}, ${orderData.billingAddress1},
        ${orderData.billingAddress2}, ${orderData.billingCity}, ${orderData.billingState}, ${orderData.billingPostcode},
        ${orderData.billingCountry}, ${orderData.locationMeta}, ${orderData.orderNotes}, ${orderData.customerNote},
        ${orderData.lineItems}, ${orderData.metaData}, ${orderData.rawData}
      ) RETURNING *
    `);
    return result.rows[0];
  }

  async getUserLocationAccess(userId: number): Promise<number[]> {
    const access = await db.select().from(userLocationAccess)
      .where(eq(userLocationAccess.userId, userId));
    return access.map(a => a.locationId);
  }

  async setUserLocationAccess(userId: number, locationIds: number[]): Promise<void> {
    // Delete existing access
    await db.delete(userLocationAccess).where(eq(userLocationAccess.userId, userId));
    
    // Insert new access
    if (locationIds.length > 0) {
      await db.insert(userLocationAccess).values(
        locationIds.map(locationId => ({ userId, locationId }))
      );
    }
  }

  async getUserStatusAccess(userId: number): Promise<string[]> {
    const access = await db.select().from(userStatusAccess)
      .where(eq(userStatusAccess.userId, userId));
    return access.map(a => a.status);
  }

  async setUserStatusAccess(userId: number, statuses: string[]): Promise<void> {
    // Delete existing access
    await db.delete(userStatusAccess).where(eq(userStatusAccess.userId, userId));
    
    // Insert new access
    if (statuses.length > 0) {
      await db.insert(userStatusAccess).values(
        statuses.map(status => ({ userId, status }))
      );
    }
  }

  async getDashboardSummary(locationId?: number, month?: string): Promise<{
    totalSales: number;
    totalOrders: number;
    totalRefunds: number;
    platformFees: number;
    stripeFees: number;
    netDeposit: number;
  }> {
    try {
      let whereConditions: any[] = [];
      
      if (locationId) {
        whereConditions.push(eq(orders.locationId, locationId));
      }
      
      // Filter by month if provided
      if (month) {
        const [year, monthNum] = month.split('-');
        const startDate = `${year}-${monthNum}-01`;
        const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
        const endDate = `${year}-${monthNum}-${lastDay.toString().padStart(2, '0')}`;
        whereConditions.push(sql`${orders.orderDate} >= ${startDate}`);
        whereConditions.push(sql`${orders.orderDate} <= ${endDate}`);
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const result = await db
        .select({
          totalSales: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} IN ('completed', 'processing') THEN CAST(${orders.amount} AS DECIMAL) ELSE 0 END), 0)`,
          totalRefunds: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'refunded' THEN CAST(${orders.amount} AS DECIMAL) ELSE 0 END), 0)`,
          totalOrders: sql<number>`COUNT(CASE WHEN ${orders.status} IN ('completed', 'processing') THEN 1 END)`,
          // Platform fees: positive for completed/processing orders, negative for refunded orders
          platformFees: sql<number>`COALESCE(
            SUM(CASE WHEN ${orders.status} IN ('completed', 'processing') THEN CAST(${orders.amount} AS DECIMAL) * 0.07 ELSE 0 END) +
            SUM(CASE WHEN ${orders.status} = 'refunded' THEN -(CAST(${orders.amount} AS DECIMAL) * 0.07) ELSE 0 END), 0)`,
          // Stripe fees: always positive (never refunded by Stripe)
          stripeFees: sql<number>`COALESCE(SUM((CAST(${orders.amount} AS DECIMAL) * 0.029 + 0.30)), 0)`,
        })
        .from(orders)
        .where(whereClause);

      const summary = result[0];
      
      // Calculate net deposit: total sales - total refunds - platform fees - stripe fees
      const netDeposit = summary.totalSales - summary.totalRefunds - summary.platformFees - summary.stripeFees;

      return {
        totalSales: summary.totalSales,
        totalOrders: summary.totalOrders,
        totalRefunds: summary.totalRefunds,
        platformFees: summary.platformFees,
        stripeFees: summary.stripeFees,
        netDeposit: netDeposit,
      };
    } catch (error) {
      console.error('Dashboard summary error:', error);
      return {
        totalSales: 0,
        totalOrders: 0,
        totalRefunds: 0,
        platformFees: 0,
        stripeFees: 0,
        netDeposit: 0,
      };
    }
  }

  async getMonthlyBreakdown(year?: number, locationId?: number): Promise<Array<{
    month: string;
    totalSales: number;
    totalOrders: number;
    totalRefunds: number;
    netAmount: number;
    orders: Order[];
  }>> {
    const currentYear = year || new Date().getFullYear();
    const whereConditions = [
      sql`EXTRACT(YEAR FROM ${orders.orderDate}) = ${currentYear}`
    ];
    
    if (locationId) {
      whereConditions.push(eq(orders.locationId, locationId));
    }

    const dbResult = await db.select().from(orders)
      .where(and(...whereConditions))
      .orderBy(desc(orders.orderDate));

    const monthlyData = new Map();
    
    for (const order of dbResult) {
      // Use the correct field name from database: order_date (mapped to orderDate)
      if (!order.orderDate) continue; // Skip orders without dates
      const orderDate = order.orderDate instanceof Date ? order.orderDate : new Date(order.orderDate);
      // Use local date format to avoid UTC timezone conversion
      const year = orderDate.getFullYear();
      const month = String(orderDate.getMonth() + 1).padStart(2, '0');
      const monthKey = `${year}-${month}`;
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          totalSales: 0,
          totalOrders: 0,
          totalRefunds: 0,
          netAmount: 0,
          orders: []
        });
      }
      
      const monthData = monthlyData.get(monthKey);
      if (!order.amount) continue; // Skip orders without amounts
      const amount = parseFloat(order.amount.toString());
      
      if (order.status === 'refunded') {
        monthData.totalRefunds += amount;
        // Platform fee is negative for refunded orders (refunded back)
        const platformFee = -(amount * 0.07);
        const stripeFee = (amount * 0.029) + 0.30; // Stripe keeps fees
        monthData.netAmount += (-amount - platformFee - stripeFee);
      } else if (order.status === 'completed' || order.status === 'processing') {
        monthData.totalSales += amount;
        monthData.totalOrders += 1;
        // Normal platform fee calculation
        const platformFee = amount * 0.07;
        const stripeFee = (amount * 0.029) + 0.30;
        monthData.netAmount += (amount - platformFee - stripeFee);
      }
      
      // Fix timezone issue: Database stores Eastern time but is treated as UTC
      // WooCommerce sends Eastern time but it gets stored as if it were UTC
      // So we need to treat the stored time as Eastern directly, not convert from UTC
      const easternTime = orderDate; // Use the time as-is since it's already Eastern
      
      const orderWithFixedDate = {
        ...order,
        orderDate: easternTime.getFullYear() + '-' + 
                   String(easternTime.getMonth() + 1).padStart(2, '0') + '-' +
                   String(easternTime.getDate()).padStart(2, '0') + 'T' +
                   String(easternTime.getHours()).padStart(2, '0') + ':' +
                   String(easternTime.getMinutes()).padStart(2, '0') + ':' +
                   String(easternTime.getSeconds()).padStart(2, '0')
      };
      monthData.orders.push(orderWithFixedDate);
    }

    const finalResult = Array.from(monthlyData.values()).sort((a, b) => b.month.localeCompare(a.month));
    console.log('TIMEZONE DEBUG - Sample order date sent to frontend:', finalResult[0]?.orders[0]?.orderDate);
    return finalResult;
  }





  async getSyncSettings(platform: string): Promise<SyncSettings | undefined> {
    const [settings] = await db.select().from(syncSettings).where(eq(syncSettings.platform, platform));
    return settings;
  }

  async upsertSyncSettings(settings: InsertSyncSettings): Promise<SyncSettings> {
    const [result] = await db
      .insert(syncSettings)
      .values(settings)
      .onConflictDoUpdate({
        target: syncSettings.platform,
        set: {
          ...settings,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async updateSyncStats(platform: string, orderCount: number): Promise<void> {
    await db
      .update(syncSettings)
      .set({
        lastSyncAt: new Date(),
        lastOrderCount: orderCount,
        isRunning: false,
        updatedAt: new Date(),
      })
      .where(eq(syncSettings.platform, platform));
  }

  async getRestApiSettings(platform: string): Promise<any> {
    // Return correct credentials based on platform using environment variables
    const credentialsMap: { [key: string]: any } = {
      '1': {
        platform: platform,
        consumerKey: process.env.MAIN_STORE_CONSUMER_KEY || '',
        consumerSecret: process.env.MAIN_STORE_CONSUMER_SECRET || '',
        storeUrl: 'https://nanushotchicken.co',
        isActive: true
      },
      '2': {
        platform: platform,
        consumerKey: process.env.DELAWARE_STORE_CONSUMER_KEY || '',
        consumerSecret: process.env.DELAWARE_STORE_CONSUMER_SECRET || '',
        storeUrl: 'https://delaware.nanushotchicken.co',
        isActive: true
      },
      '3': {
        platform: platform,
        consumerKey: process.env.DREXEL_STORE_CONSUMER_KEY || '',
        consumerSecret: process.env.DREXEL_STORE_CONSUMER_SECRET || '',
        storeUrl: 'https://drexel.nanushotchicken.co',
        isActive: true
      },
      'woocommerce': {
        platform: platform,
        consumerKey: process.env.MAIN_STORE_CONSUMER_KEY || '',
        consumerSecret: process.env.MAIN_STORE_CONSUMER_SECRET || '',
        storeUrl: 'https://nanushotchicken.co',
        isActive: true
      },
      'woocommerce-1': {
        platform: platform,
        consumerKey: process.env.DELAWARE_STORE_CONSUMER_KEY || '',
        consumerSecret: process.env.DELAWARE_STORE_CONSUMER_SECRET || '',
        storeUrl: 'https://delaware.nanushotchicken.co',
        isActive: true
      },
      'woocommerce-2': {
        platform: platform,
        consumerKey: process.env.DREXEL_STORE_CONSUMER_KEY || '',
        consumerSecret: process.env.DREXEL_STORE_CONSUMER_SECRET || '',
        storeUrl: 'https://drexel.nanushotchicken.co',
        isActive: true
      }
    };

    return credentialsMap[platform] || {
      platform: platform,
      consumerKey: '',
      consumerSecret: '',
      storeUrl: '',
      isActive: false
    };
  }

  async upsertRestApiSettings(settings: InsertRestApiSettings): Promise<RestApiSettings> {
    // Return the settings as saved - the actual credentials are managed by getRestApiSettings
    return {
      id: 1,
      platform: settings.platform,
      consumerKey: settings.consumerKey,
      consumerSecret: settings.consumerSecret,
      storeUrl: settings.storeUrl,
      isActive: settings.isActive || true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async getRecaptchaSettings(): Promise<RecaptchaSettings | undefined> {
    const [settings] = await db.select().from(recaptchaSettings).limit(1);
    return settings || undefined;
  }

  async upsertRecaptchaSettings(settings: InsertRecaptchaSettings): Promise<RecaptchaSettings> {
    const existing = await this.getRecaptchaSettings();
    
    if (existing) {
      const [result] = await db
        .update(recaptchaSettings)
        .set({
          ...settings,
          updatedAt: new Date(),
        })
        .where(eq(recaptchaSettings.id, existing.id))
        .returning();
      return result;
    } else {
      const [result] = await db
        .insert(recaptchaSettings)
        .values(settings)
        .returning();
      return result;
    }
  }

  async getAllStoreConnections(): Promise<StoreConnection[]> {
    try {
      const connections = await db.select().from(storeConnections).orderBy(storeConnections.createdAt);
      
      // If no connections in database, return the hardcoded ones
      if (connections.length === 0) {
        return this.getLegacyStoreConnections();
      }
      
      return connections;
    } catch (error) {
      console.log('Database query failed, falling back to legacy connections');
      return this.getLegacyStoreConnections();
    }
  }

  async getStoreConnection(id: string): Promise<StoreConnection | undefined> {
    const [connection] = await db.select().from(storeConnections).where(eq(storeConnections.id, id));
    return connection;
  }

  async getStoreConnectionByUrl(storeUrl: string): Promise<StoreConnection | undefined> {
    const [connection] = await db.select().from(storeConnections).where(eq(storeConnections.storeUrl, storeUrl));
    return connection;
  }

  async createStoreConnection(connection: InsertStoreConnection): Promise<StoreConnection> {
    const [result] = await db.insert(storeConnections).values(connection).returning();
    return result;
  }

  async deleteStoreConnection(id: number): Promise<void> {
    await db.delete(storeConnections).where(eq(storeConnections.id, id.toString()));
  }

  // Legacy method - keeping for compatibility but returning actual database data
  async getLegacyStoreConnections(): Promise<StoreConnection[]> {
    // Return your actual store connections with proper credentials
    return [
      {
        id: '1',
        name: 'Main Store',
        storeUrl: 'https://nanushotchicken.co',
        consumerKey: 'ck_0ad2e86583db8d0dd61757acbc4bdc87419c3e60',
        consumerSecret: 'cs_dc2155f2f7b20e6a01eecc73cfb685855fe3790c',
        defaultLocationId: 166,
        isActive: true,
        autoSyncEnabled: true,
        syncInterval: 5,
        lastSyncAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        name: 'Delaware',
        storeUrl: 'https://delaware.nanushotchicken.co',
        consumerKey: 'ck_184384d709004285d55575c8953523bfc4bda914',
        consumerSecret: 'cs_40503691dd6d36e46e85147e76d167c99dc38e5c',
        defaultLocationId: 166,
        isActive: true,
        autoSyncEnabled: true,
        syncInterval: 5,
        lastSyncAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '3',
        name: 'Drexel',
        storeUrl: 'https://drexel.nanushotchicken.co',
        consumerKey: 'ck_a6badccb6ff61a19749f8739e2285c8688115eaf',
        consumerSecret: 'cs_0d7b417b5f8f4e91aaae2575bbf81fd3ee081687',
        defaultLocationId: 166,
        isActive: true,
        autoSyncEnabled: true,
        syncInterval: 5,
        lastSyncAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  async createStoreConnection(connection: InsertStoreConnection): Promise<StoreConnection> {
    const [result] = await db
      .insert(storeConnections)
      .values(connection)
      .returning();
    return result;
  }

  async deleteStoreConnection(id: number): Promise<void> {
    await db.delete(storeConnections).where(eq(storeConnections.id, id.toString()));
  }

  async updateStoreConnectionLocation(connectionId: string, locationId: number): Promise<void> {
    await db.update(storeConnections)
      .set({ 
        defaultLocationId: locationId,
        updatedAt: new Date()
      })
      .where(eq(storeConnections.id, connectionId));
  }

  async updateUnknownLocationOrders(connectionId: string, locationId: number): Promise<void> {
    // Get the store connection to find its URL
    const connection = await this.getStoreConnection(connectionId);
    if (!connection) return;

    // Update orders that have "Unknown Location" or missing location metadata
    await db.update(orders)
      .set({ 
        locationId: locationId,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(orders.storeUrl, connection.storeUrl),
          or(
            eq(orders.locationMeta, 'Unknown Location'),
            isNull(orders.locationMeta),
            eq(orders.locationMeta, '')
          )
        )
      );
  }

  // Footer settings operations
  async getFooterSettings(): Promise<any> {
    const [settings] = await db.select().from(footerSettings).limit(1);
    return settings || { customCode: '', isEnabled: true };
  }

  async upsertFooterSettings(settings: any): Promise<any> {
    const existingSettings = await this.getFooterSettings();
    
    if (existingSettings.id) {
      const [updated] = await db
        .update(footerSettings)
        .set({
          ...settings,
          updatedAt: new Date(),
        })
        .where(eq(footerSettings.id, existingSettings.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(footerSettings)
        .values(settings)
        .returning();
      return created;
    }
  }

  // Logo settings operations
  async getLogoSettings(): Promise<LogoSettings | undefined> {
    const [logo] = await db.select().from(logoSettings).limit(1);
    return logo;
  }

  async upsertLogoSettings(settings: InsertLogoSettings): Promise<LogoSettings> {
    const existing = await this.getLogoSettings();
    
    if (existing) {
      const [updated] = await db
        .update(logoSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(logoSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(logoSettings)
        .values(settings)
        .returning();
      return created;
    }
  }

  async deleteLogoSettings(): Promise<void> {
    await db.delete(logoSettings);
  }

  // User page permissions operations
  async getUserPagePermissions(userId: number): Promise<Record<string, { canView: boolean; canEdit: boolean }>> {
    const permissions = await db
      .select()
      .from(userPagePermissions)
      .where(eq(userPagePermissions.userId, userId));
    
    const result: Record<string, { canView: boolean; canEdit: boolean }> = {};
    permissions.forEach(permission => {
      result[permission.pageName] = {
        canView: permission.canView,
        canEdit: permission.canEdit
      };
    });
    
    return result;
  }

  async setUserPagePermissions(userId: number, permissions: Array<{ pageName: string; canView: boolean; canEdit: boolean }>): Promise<void> {
    // First delete all existing permissions for this user
    await db
      .delete(userPagePermissions)
      .where(eq(userPagePermissions.userId, userId));

    // Insert new permissions
    if (permissions.length > 0) {
      await db
        .insert(userPagePermissions)
        .values(permissions.map(perm => ({
          userId,
          pageName: perm.pageName,
          canView: perm.canView,
          canEdit: perm.canEdit
        })));
    }
  }
}

export const storage = new DatabaseStorage();