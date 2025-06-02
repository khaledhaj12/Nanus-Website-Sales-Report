import {
  users,
  locations,
  orders,
  userLocationAccess,
  wooOrders,
  syncSettings,
  restApiSettings,
  storeConnections,
  type User,
  type InsertUser,
  type Location,
  type InsertLocation,
  type Order,
  type InsertOrder,
  type WooOrder,
  type InsertWooOrder,
  type SyncSettings,
  type InsertSyncSettings,
  type RestApiSettings,
  type InsertRestApiSettings,
  type StoreConnection,
  type InsertStoreConnection,
  type UserLocationAccess,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, like, or, gte, lte, sql, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";

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
  

  
  // WooCommerce orders operations
  getWooOrder(id: number): Promise<WooOrder | undefined>;
  getWooOrderByWooOrderId(wooOrderId: string): Promise<WooOrder | undefined>;
  createWooOrder(wooOrder: InsertWooOrder): Promise<WooOrder>;
  updateWooOrder(id: number, wooOrder: Partial<InsertWooOrder>): Promise<WooOrder>;
  deleteWooOrder(id: number): Promise<void>;
  deleteWooOrders(ids: number[]): Promise<void>;
  getAllWooOrders(locationId?: number): Promise<WooOrder[]>;
  getWooOrdersByLocation(locationId: number): Promise<WooOrder[]>;
  getWooOrdersByDateRange(startDate: string, endDate: string, locationId?: number): Promise<WooOrder[]>;
  searchWooOrders(searchTerm: string, locationId?: number): Promise<WooOrder[]>;
  
  // Webhook settings operations
  getWebhookSettings(platform: string): Promise<WebhookSettings | undefined>;
  upsertWebhookSettings(settings: InsertWebhookSettings): Promise<WebhookSettings>;
  
  // Webhook logs operations
  createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog>;
  getRecentWebhookLogs(platform?: string, limit?: number): Promise<WebhookLog[]>;
  
  // REST API settings operations
  getRestApiSettings(platform: string): Promise<RestApiSettings | undefined>;
  upsertRestApiSettings(settings: InsertRestApiSettings): Promise<RestApiSettings>;
  
  // Store connections operations
  getAllStoreConnections(): Promise<StoreConnection[]>;
  getStoreConnection(connectionId: string): Promise<StoreConnection | undefined>;
  createStoreConnection(connection: InsertStoreConnection): Promise<StoreConnection>;
  deleteStoreConnection(connectionId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, password: hashedPassword })
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
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.username));
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async getLocation(id: number): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location;
  }

  async getLocationByName(name: string): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.name, name));
    return location;
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const [location] = await db
      .insert(locations)
      .values(insertLocation)
      .returning();
    return location;
  }

  async getAllLocations(): Promise<Location[]> {
    return await db.select().from(locations).where(eq(locations.isActive, true)).orderBy(asc(locations.name));
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrderByOrderId(orderId: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.orderId, orderId));
    return order;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db
      .insert(orders)
      .values(insertOrder)
      .returning();
    return order;
  }

  async updateOrder(id: number, insertOrder: Partial<InsertOrder>): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set({ ...insertOrder, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async deleteOrder(id: number): Promise<void> {
    console.log("Deleting single order with ID:", id, "Type:", typeof id);
    if (isNaN(id) || id === null || id === undefined) {
      throw new Error(`Invalid order ID: ${id}`);
    }
    await db.delete(orders).where(eq(orders.id, id));
  }

  async deleteOrders(ids: number[]): Promise<void> {
    console.log("Deleting multiple orders with IDs:", ids);
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("Invalid IDs array");
    }
    
    // Validate all IDs
    for (const id of ids) {
      if (isNaN(id) || id === null || id === undefined) {
        throw new Error(`Invalid order ID in array: ${id}`);
      }
    }
    
    await db.delete(orders).where(inArray(orders.id, ids));
  }

  async getAllOrders(locationId?: number): Promise<Order[]> {
    if (locationId) {
      return await db.select().from(orders).where(eq(orders.locationId, locationId)).orderBy(desc(orders.orderDate));
    }
    return await db.select().from(orders).orderBy(desc(orders.orderDate));
  }

  async getOrdersByLocation(locationId: number): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.locationId, locationId))
      .orderBy(desc(orders.orderDate));
  }

  async getOrdersByDateRange(startDate: string, endDate: string, locationId?: number): Promise<Order[]> {
    let query = db
      .select()
      .from(orders)
      .where(
        and(
          gte(orders.orderDate, startDate),
          lte(orders.orderDate, endDate)
        )
      );

    if (locationId) {
      query = query.where(
        and(
          gte(orders.orderDate, startDate),
          lte(orders.orderDate, endDate),
          eq(orders.locationId, locationId)
        )
      );
    }

    return await query.orderBy(desc(orders.orderDate));
  }

  async searchOrders(searchTerm: string, locationId?: number): Promise<Order[]> {
    let whereClause = or(
      like(orders.orderId, `%${searchTerm}%`),
      like(orders.customerName, `%${searchTerm}%`),
      like(orders.customerEmail, `%${searchTerm}%`),
      like(orders.cardLast4, `%${searchTerm}%`)
    );

    if (locationId) {
      whereClause = and(whereClause, eq(orders.locationId, locationId));
    }

    return await db
      .select()
      .from(orders)
      .where(whereClause)
      .orderBy(desc(orders.orderDate));
  }

  async createFileUpload(insertFileUpload: InsertFileUpload): Promise<FileUpload> {
    const [fileUpload] = await db
      .insert(fileUploads)
      .values(insertFileUpload)
      .returning();
    return fileUpload;
  }

  async updateFileUpload(id: number, insertFileUpload: Partial<InsertFileUpload>): Promise<FileUpload> {
    const [fileUpload] = await db
      .update(fileUploads)
      .set(insertFileUpload)
      .where(eq(fileUploads.id, id))
      .returning();
    return fileUpload;
  }

  async getFileUpload(id: number): Promise<FileUpload | undefined> {
    const [fileUpload] = await db
      .select()
      .from(fileUploads)
      .where(eq(fileUploads.id, id));
    return fileUpload || undefined;
  }

  async getRecentFileUploads(limit = 10): Promise<FileUpload[]> {
    return await db
      .select()
      .from(fileUploads)
      .orderBy(desc(fileUploads.createdAt))
      .limit(limit);
  }

  async getAllFileUploads(): Promise<FileUpload[]> {
    return await db
      .select()
      .from(fileUploads)
      .orderBy(desc(fileUploads.createdAt));
  }

  async deleteFileUploads(ids: number[]): Promise<void> {
    await db.delete(fileUploads).where(inArray(fileUploads.id, ids));
  }

  async deleteLocations(ids: number[]): Promise<void> {
    // Check if any locations have associated orders
    const locationsWithOrders = await db
      .selectDistinct({ locationId: orders.locationId })
      .from(orders)
      .where(inArray(orders.locationId, ids));

    if (locationsWithOrders.length > 0) {
      const usedLocationIds = Array.from(new Set(locationsWithOrders.map(o => o.locationId)));
      throw new Error(`Cannot delete locations with existing orders. Location IDs: ${usedLocationIds.join(', ')}`);
    }

    // First delete user location access records for these locations
    await db.delete(userLocationAccess).where(inArray(userLocationAccess.locationId, ids));
    
    // Then delete the locations
    await db.delete(locations).where(inArray(locations.id, ids));
  }

  async getUserLocationAccess(userId: number): Promise<number[]> {
    const access = await db
      .select({ locationId: userLocationAccess.locationId })
      .from(userLocationAccess)
      .where(eq(userLocationAccess.userId, userId));
    
    return access.map(a => a.locationId);
  }

  async setUserLocationAccess(userId: number, locationIds: number[]): Promise<void> {
    // Remove existing access
    await db.delete(userLocationAccess).where(eq(userLocationAccess.userId, userId));
    
    // Add new access
    if (locationIds.length > 0) {
      const accessRecords = locationIds.map(locationId => ({
        userId,
        locationId,
      }));
      
      await db.insert(userLocationAccess).values(accessRecords);
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
    let whereConditions: any[] = [];
    
    if (locationId) {
      whereConditions.push(eq(orders.locationId, locationId));
    }
    
    // If no month is specified, get the latest month from the data
    let targetMonth = month;
    if (!targetMonth) {
      const latestOrder = await db
        .select({ orderDate: orders.orderDate })
        .from(orders)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(orders.orderDate))
        .limit(1);
      
      if (latestOrder.length > 0) {
        const latestDate = new Date(latestOrder[0].orderDate);
        const year = latestDate.getFullYear();
        const monthNum = latestDate.getMonth() + 1;
        targetMonth = `${year}-${monthNum.toString().padStart(2, '0')}`;
      }
    }
    
    if (targetMonth) {
      const [year, monthNum] = targetMonth.split('-');
      const startDate = `${year}-${monthNum}-01`;
      // Get the last day of the month properly
      const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
      const endDate = `${year}-${monthNum}-${lastDay.toString().padStart(2, '0')}`;
      whereConditions.push(gte(orders.orderDate, startDate));
      whereConditions.push(lte(orders.orderDate, endDate));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const result = await db
      .select({
        totalSales: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} != 'refunded' THEN CAST(${orders.amount} AS DECIMAL) ELSE 0 END), 0)`,
        totalRefunds: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'refunded' THEN CAST(${orders.amount} AS DECIMAL) ELSE 0 END), 0)`,
        totalOrders: sql<number>`COUNT(CASE WHEN ${orders.status} != 'refunded' THEN 1 END)`,
        platformFees: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} != 'refunded' THEN CAST(${orders.platformFee} AS DECIMAL) ELSE 0 END), 0)`,
        stripeFees: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} != 'refunded' THEN CAST(${orders.stripeFee} AS DECIMAL) ELSE 0 END), 0)`,
        netDeposit: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} != 'refunded' THEN CAST(${orders.netAmount} AS DECIMAL) ELSE 0 END), 0)`,
      })
      .from(orders)
      .where(whereClause);

    return result[0] || {
      totalSales: 0,
      totalOrders: 0,
      totalRefunds: 0,
      platformFees: 0,
      stripeFees: 0,
      netDeposit: 0,
    };
  }

  async getMonthlyBreakdown(year?: number, locationId?: number): Promise<Array<{
    month: string;
    totalSales: number;
    totalOrders: number;
    totalRefunds: number;
    netAmount: number;
    orders: Order[];
  }>> {
    // Get all orders and group by month in JavaScript to avoid SQL ORDER BY conflict
    let whereConditions: any[] = [];
    if (locationId) {
      whereConditions.push(eq(orders.locationId, locationId));
    }

    const allOrders = await db
      .select()
      .from(orders)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(orders.orderDate));

    // Group orders by month
    const monthGroups = new Map<string, Order[]>();
    
    for (const order of allOrders) {
      const orderDate = new Date(order.orderDate);
      const year = orderDate.getFullYear();
      const month = orderDate.getMonth() + 1;
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
      
      if (!monthGroups.has(monthKey)) {
        monthGroups.set(monthKey, []);
      }
      monthGroups.get(monthKey)!.push(order);
    }

    // Convert to result format
    const months = [];
    for (const [monthKey, monthOrders] of monthGroups.entries()) {
      const completedOrders = monthOrders.filter(order => order.status !== 'refunded');
      const refundedOrders = monthOrders.filter(order => order.status === 'refunded');

      const totalSales = completedOrders.reduce((sum, order) => sum + parseFloat(order.amount), 0);
      const totalRefunds = refundedOrders.reduce((sum, order) => sum + parseFloat(order.amount), 0);
      const netAmount = completedOrders.reduce((sum, order) => sum + parseFloat(order.netAmount), 0);

      months.push({
        month: monthKey,
        totalSales,
        totalOrders: completedOrders.length,
        totalRefunds,
        netAmount,
        orders: monthOrders,
      });
    }
    
    // Sort by month descending
    months.sort((a, b) => b.month.localeCompare(a.month));
    
    return months;
  }

  // Notes operations (admin only)
  async getNotes(userId: number): Promise<Note[]> {
    return await db
      .select()
      .from(notes)
      .where(eq(notes.createdBy, userId))
      .orderBy(desc(notes.updatedAt));
  }

  async getNote(id: number, userId: number): Promise<Note | undefined> {
    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.createdBy, userId)));
    return note;
  }

  async createNote(insertNote: InsertNote): Promise<Note> {
    const [note] = await db
      .insert(notes)
      .values(insertNote)
      .returning();
    return note;
  }

  async updateNote(id: number, insertNote: Partial<InsertNote>, userId: number): Promise<Note> {
    const [note] = await db
      .update(notes)
      .set({ ...insertNote, updatedAt: new Date() })
      .where(and(eq(notes.id, id), eq(notes.createdBy, userId)))
      .returning();
    return note;
  }

  async deleteNote(id: number, userId: number): Promise<void> {
    await db
      .delete(notes)
      .where(and(eq(notes.id, id), eq(notes.createdBy, userId)));
  }

  // WooCommerce orders operations
  async getWooOrder(id: number): Promise<WooOrder | undefined> {
    const [wooOrder] = await db.select().from(wooOrders).where(eq(wooOrders.id, id));
    return wooOrder || undefined;
  }

  async getWooOrderByWooOrderId(wooOrderId: string): Promise<WooOrder | undefined> {
    const [wooOrder] = await db.select().from(wooOrders).where(eq(wooOrders.wooOrderId, wooOrderId));
    return wooOrder || undefined;
  }

  async createWooOrder(insertWooOrder: InsertWooOrder): Promise<WooOrder> {
    const [wooOrder] = await db
      .insert(wooOrders)
      .values(insertWooOrder)
      .returning();
    return wooOrder;
  }

  async updateWooOrder(id: number, insertWooOrder: Partial<InsertWooOrder>): Promise<WooOrder> {
    const [wooOrder] = await db
      .update(wooOrders)
      .set({ ...insertWooOrder, updatedAt: new Date() })
      .where(eq(wooOrders.id, id))
      .returning();
    return wooOrder;
  }

  async deleteWooOrder(id: number): Promise<void> {
    await db.delete(wooOrders).where(eq(wooOrders.id, id));
  }

  async deleteWooOrders(ids: number[]): Promise<void> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("Invalid IDs array");
    }
    await db.delete(wooOrders).where(inArray(wooOrders.id, ids));
  }

  async getAllWooOrders(locationId?: number): Promise<WooOrder[]> {
    if (locationId) {
      return await db.select().from(wooOrders).where(eq(wooOrders.locationId, locationId)).orderBy(desc(wooOrders.orderDate));
    }
    return await db.select().from(wooOrders).orderBy(desc(wooOrders.orderDate));
  }

  async getWooOrdersByLocation(locationId: number): Promise<WooOrder[]> {
    return await db.select().from(wooOrders).where(eq(wooOrders.locationId, locationId)).orderBy(desc(wooOrders.orderDate));
  }

  async getWooOrdersByDateRange(startDate: string, endDate: string, locationId?: number): Promise<WooOrder[]> {
    let query = db.select().from(wooOrders).where(
      and(
        gte(wooOrders.orderDate, new Date(startDate)),
        lte(wooOrders.orderDate, new Date(endDate))
      )
    );

    if (locationId) {
      query = query.where(
        and(
          gte(wooOrders.orderDate, new Date(startDate)),
          lte(wooOrders.orderDate, new Date(endDate)),
          eq(wooOrders.locationId, locationId)
        )
      );
    }

    return await query.orderBy(desc(wooOrders.orderDate));
  }

  async searchWooOrders(searchTerm: string, locationId?: number): Promise<WooOrder[]> {
    const searchConditions = or(
      like(wooOrders.orderId, `%${searchTerm}%`),
      like(wooOrders.customerName, `%${searchTerm}%`),
      like(wooOrders.customerEmail, `%${searchTerm}%`),
      like(wooOrders.wooOrderNumber, `%${searchTerm}%`)
    );

    if (locationId) {
      return await db.select().from(wooOrders).where(
        and(searchConditions, eq(wooOrders.locationId, locationId))
      ).orderBy(desc(wooOrders.orderDate));
    }

    return await db.select().from(wooOrders).where(searchConditions).orderBy(desc(wooOrders.orderDate));
  }

  // Webhook settings operations
  async getWebhookSettings(platform: string): Promise<WebhookSettings | undefined> {
    const [settings] = await db.select().from(webhookSettings).where(eq(webhookSettings.platform, platform));
    return settings || undefined;
  }

  async upsertWebhookSettings(settings: InsertWebhookSettings): Promise<WebhookSettings> {
    const [webhookSetting] = await db
      .insert(webhookSettings)
      .values(settings)
      .onConflictDoUpdate({
        target: webhookSettings.platform,
        set: {
          secretKey: settings.secretKey,
          isActive: settings.isActive,
          updatedAt: new Date(),
        },
      })
      .returning();
    return webhookSetting;
  }

  async createWebhookLog(insertWebhookLog: InsertWebhookLog): Promise<WebhookLog> {
    const [webhookLog] = await db
      .insert(webhookLogs)
      .values(insertWebhookLog)
      .returning();
    return webhookLog;
  }

  async getRecentWebhookLogs(platform = 'woocommerce', limit = 20): Promise<WebhookLog[]> {
    const logs = await db
      .select()
      .from(webhookLogs)
      .where(eq(webhookLogs.platform, platform))
      .orderBy(desc(webhookLogs.receivedAt))
      .limit(limit);
    return logs;
  }

  async getRestApiSettings(platform: string): Promise<RestApiSettings | undefined> {
    const [settings] = await db
      .select()
      .from(restApiSettings)
      .where(eq(restApiSettings.platform, platform));
    return settings;
  }

  async upsertRestApiSettings(settings: InsertRestApiSettings): Promise<RestApiSettings> {
    const [restApiSetting] = await db
      .insert(restApiSettings)
      .values(settings)
      .onConflictDoUpdate({
        target: restApiSettings.platform,
        set: {
          ...settings,
          updatedAt: new Date(),
        },
      })
      .returning();
    return restApiSetting;
  }

  async getAllStoreConnections(): Promise<StoreConnection[]> {
    const connections = await db.select().from(storeConnections).orderBy(asc(storeConnections.createdAt));
    return connections;
  }

  async getStoreConnection(connectionId: string): Promise<StoreConnection | undefined> {
    const [connection] = await db
      .select()
      .from(storeConnections)
      .where(eq(storeConnections.connectionId, connectionId));
    return connection;
  }

  async createStoreConnection(connection: InsertStoreConnection): Promise<StoreConnection> {
    const [newConnection] = await db
      .insert(storeConnections)
      .values(connection)
      .returning();
    return newConnection;
  }

  async deleteStoreConnection(connectionId: string): Promise<void> {
    await db.delete(storeConnections).where(eq(storeConnections.connectionId, connectionId));
  }

  async getSyncSettings(platform: string): Promise<any> {
    const [settings] = await db
      .select()
      .from(syncSettings)
      .where(eq(syncSettings.platform, platform));
    return settings;
  }

  async upsertSyncSettings(settings: any): Promise<any> {
    const [syncSetting] = await db
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
    return syncSetting;
  }

  async getUserStatusAccess(userId: number): Promise<string[]> {
    // For now, return all statuses as this feature isn't implemented yet
    return ['pending', 'processing', 'shipped', 'completed', 'cancelled', 'refunded'];
  }

  async setUserStatusAccess(userId: number, statuses: string[]): Promise<void> {
    // This feature isn't implemented yet, so we'll just return
    return;
  }

  async importWooOrders(storeUrl: string, consumerKey: string, consumerSecret: string, startDate: string, endDate: string): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const url = `${storeUrl}/wp-json/wc/v3/orders?per_page=100&page=${page}&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`WooCommerce API Error ${response.status}: ${errorText}`);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const orders = await response.json();
        
        if (!Array.isArray(orders) || orders.length === 0) {
          hasMore = false;
          break;
        }

        for (const order of orders) {
          try {
            // Check if order already exists
            const existingOrder = await this.getWooOrderByWooOrderId(order.id.toString());
            if (existingOrder) {
              skipped++;
              continue;
            }

            // Extract location from order meta data
            let locationId = 1; // Default fallback
            let locationName = "Default Location";
            
            // Look for orderable location in meta data
            if (order.meta_data && Array.isArray(order.meta_data)) {
              const orderableLocationMeta = order.meta_data.find((meta: any) => 
                meta.key === 'orderable_location' || 
                meta.key === '_orderable_location' ||
                meta.key === 'store_location' ||
                meta.key === '_store_location'
              );
              
              if (orderableLocationMeta && orderableLocationMeta.value) {
                locationName = orderableLocationMeta.value;
                console.log(`Found location in meta data: ${locationName}`);
              }
            }
            
            // Also check line items for location info
            if (order.line_items && Array.isArray(order.line_items)) {
              for (const item of order.line_items) {
                if (item.meta_data && Array.isArray(item.meta_data)) {
                  const itemLocationMeta = item.meta_data.find((meta: any) => 
                    meta.key === 'orderable_location' || 
                    meta.key === '_orderable_location' ||
                    meta.key === 'store_location' ||
                    meta.key === '_store_location'
                  );
                  
                  if (itemLocationMeta && itemLocationMeta.value) {
                    locationName = itemLocationMeta.value;
                    console.log(`Found location in line item meta data: ${locationName}`);
                    break;
                  }
                }
              }
            }
            
            // Create or get location
            let existingLocation = await this.getLocationByName(locationName);
            if (!existingLocation) {
              console.log(`Creating new location: ${locationName}`);
              existingLocation = await this.createLocation({ name: locationName });
            }
            locationId = existingLocation.id;

            // Create order data
            const orderData = {
              wooOrderId: order.id.toString(),
              orderId: order.number || order.id.toString(),
              status: order.status,
              currency: order.currency || 'USD',
              amount: order.total || '0',
              total: order.total || '0',
              totalTax: order.total_tax || '0',
              shippingTotal: order.shipping_total || '0',
              orderDate: new Date(order.date_created),
              customerNote: order.customer_note || null,
              billingFirstName: order.billing?.first_name || null,
              billingLastName: order.billing?.last_name || null,
              billingAddress1: order.billing?.address_1 || null,
              billingCity: order.billing?.city || null,
              billingState: order.billing?.state || null,
              billingPostcode: order.billing?.postcode || null,
              billingCountry: order.billing?.country || null,
              billingEmail: order.billing?.email || null,
              billingPhone: order.billing?.phone || null,
              shippingFirstName: order.shipping?.first_name || null,
              shippingLastName: order.shipping?.last_name || null,
              shippingAddress1: order.shipping?.address_1 || null,
              shippingCity: order.shipping?.city || null,
              shippingState: order.shipping?.state || null,
              shippingPostcode: order.shipping?.postcode || null,
              shippingCountry: order.shipping?.country || null,
              lineItems: JSON.stringify(order.line_items || []),
              rawData: JSON.stringify(order),
              locationId: locationId
            };

            await this.createWooOrder(orderData);
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
      } catch (pageError) {
        console.error(`Failed to fetch page ${page}:`, pageError);
        hasMore = false;
      }
    }

    return { imported, skipped };
  }
}

export const storage = new DatabaseStorage();
