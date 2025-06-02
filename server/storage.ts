import {
  users,
  locations,
  orders,
  userLocationAccess,
  wooOrders,
  syncSettings,
  restApiSettings,
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
  type UserLocationAccess,
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
  
  // Sync settings operations
  getSyncSettings(platform: string): Promise<SyncSettings | undefined>;
  upsertSyncSettings(settings: InsertSyncSettings): Promise<SyncSettings>;
  
  // REST API settings operations
  getRestApiSettings(platform: string): Promise<RestApiSettings | undefined>;
  upsertRestApiSettings(settings: InsertRestApiSettings): Promise<RestApiSettings>;
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
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
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
    await db.delete(locations).where(inArray(locations.id, ids));
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrderByOrderId(orderId: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.orderId, orderId));
    return order || undefined;
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
      .set(insertOrder)
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async deleteOrder(id: number): Promise<void> {
    await db.delete(orders).where(eq(orders.id, id));
  }

  async deleteOrders(ids: number[]): Promise<void> {
    await db.delete(orders).where(inArray(orders.id, ids));
  }

  async getAllOrders(locationId?: number): Promise<Order[]> {
    if (locationId) {
      return db.select().from(orders)
        .where(eq(orders.locationId, locationId))
        .orderBy(desc(orders.createdAt));
    }
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrdersByLocation(locationId: number): Promise<Order[]> {
    return db.select().from(orders)
      .where(eq(orders.locationId, locationId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrdersByDateRange(startDate: string, endDate: string, locationId?: number): Promise<Order[]> {
    const query = db.select().from(orders)
      .where(
        and(
          gte(orders.orderDate, startDate),
          lte(orders.orderDate, endDate),
          locationId ? eq(orders.locationId, locationId) : undefined
        )
      )
      .orderBy(desc(orders.orderDate));
    
    return query;
  }

  async searchOrders(searchTerm: string, locationId?: number): Promise<Order[]> {
    const query = db.select().from(orders)
      .where(
        and(
          or(
            like(orders.customerName, `%${searchTerm}%`),
            like(orders.customerEmail, `%${searchTerm}%`),
            like(orders.orderId, `%${searchTerm}%`)
          ),
          locationId ? eq(orders.locationId, locationId) : undefined
        )
      )
      .orderBy(desc(orders.orderDate));
    
    return query;
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

  async getDashboardSummary(locationId?: number, month?: string): Promise<{
    totalSales: number;
    totalOrders: number;
    totalRefunds: number;
    platformFees: number;
    stripeFees: number;
    netDeposit: number;
  }> {
    const whereConditions = [];
    
    if (locationId) {
      whereConditions.push(eq(orders.locationId, locationId));
    }
    
    if (month) {
      const [year, monthNum] = month.split('-');
      whereConditions.push(
        sql`EXTRACT(YEAR FROM ${orders.orderDate}) = ${year}`,
        sql`EXTRACT(MONTH FROM ${orders.orderDate}) = ${monthNum}`
      );
    }

    const result = await db.select().from(orders)
      .where(whereConditions.length ? and(...whereConditions) : undefined);

    return result.reduce((acc, order) => ({
      totalSales: acc.totalSales + parseFloat(order.amount.toString()),
      totalOrders: acc.totalOrders + 1,
      totalRefunds: acc.totalRefunds + parseFloat(order.refundAmount?.toString() || '0'),
      platformFees: acc.platformFees + parseFloat(order.platformFee.toString()),
      stripeFees: acc.stripeFees + parseFloat(order.stripeFee.toString()),
      netDeposit: acc.netDeposit + parseFloat(order.netAmount.toString()),
    }), {
      totalSales: 0,
      totalOrders: 0,
      totalRefunds: 0,
      platformFees: 0,
      stripeFees: 0,
      netDeposit: 0,
    });
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

    const result = await db.select().from(orders)
      .where(and(...whereConditions))
      .orderBy(desc(orders.orderDate));

    const monthlyData = new Map();
    
    for (const order of result) {
      const monthKey = order.orderDate?.toISOString().substring(0, 7) || '';
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
      monthData.totalSales += parseFloat(order.amount.toString());
      monthData.totalOrders += 1;
      monthData.totalRefunds += parseFloat(order.refundAmount?.toString() || '0');
      monthData.netAmount += parseFloat(order.netAmount.toString());
      monthData.orders.push(order);
    }

    return Array.from(monthlyData.values()).sort((a, b) => b.month.localeCompare(a.month));
  }

  async getWooOrder(id: number): Promise<WooOrder | undefined> {
    const [order] = await db.select().from(wooOrders).where(eq(wooOrders.id, id));
    return order || undefined;
  }

  async getWooOrderByWooOrderId(wooOrderId: string): Promise<WooOrder | undefined> {
    const [order] = await db.select().from(wooOrders).where(eq(wooOrders.wooOrderId, wooOrderId));
    return order || undefined;
  }

  async createWooOrder(insertWooOrder: InsertWooOrder): Promise<WooOrder> {
    const [order] = await db
      .insert(wooOrders)
      .values(insertWooOrder)
      .returning();
    return order;
  }

  async updateWooOrder(id: number, insertWooOrder: Partial<InsertWooOrder>): Promise<WooOrder> {
    const [order] = await db
      .update(wooOrders)
      .set(insertWooOrder)
      .where(eq(wooOrders.id, id))
      .returning();
    return order;
  }

  async deleteWooOrder(id: number): Promise<void> {
    await db.delete(wooOrders).where(eq(wooOrders.id, id));
  }

  async deleteWooOrders(ids: number[]): Promise<void> {
    await db.delete(wooOrders).where(inArray(wooOrders.id, ids));
  }

  async getAllWooOrders(locationId?: number): Promise<WooOrder[]> {
    if (locationId) {
      return db.select().from(wooOrders)
        .where(eq(wooOrders.locationId, locationId))
        .orderBy(desc(wooOrders.createdAt));
    }
    return db.select().from(wooOrders).orderBy(desc(wooOrders.createdAt));
  }

  async getWooOrdersByLocation(locationId: number): Promise<WooOrder[]> {
    return db.select().from(wooOrders)
      .where(eq(wooOrders.locationId, locationId))
      .orderBy(desc(wooOrders.createdAt));
  }

  async getWooOrdersByDateRange(startDate: string, endDate: string, locationId?: number): Promise<WooOrder[]> {
    const query = db.select().from(wooOrders)
      .where(
        and(
          gte(wooOrders.orderDate, startDate),
          lte(wooOrders.orderDate, endDate),
          locationId ? eq(wooOrders.locationId, locationId) : undefined
        )
      )
      .orderBy(desc(wooOrders.orderDate));
    
    return query;
  }

  async searchWooOrders(searchTerm: string, locationId?: number): Promise<WooOrder[]> {
    const query = db.select().from(wooOrders)
      .where(
        and(
          or(
            like(wooOrders.customerName, `%${searchTerm}%`),
            like(wooOrders.customerEmail, `%${searchTerm}%`),
            like(wooOrders.orderId, `%${searchTerm}%`),
            like(wooOrders.wooOrderId, `%${searchTerm}%`)
          ),
          locationId ? eq(wooOrders.locationId, locationId) : undefined
        )
      )
      .orderBy(desc(wooOrders.orderDate));
    
    return query;
  }

  async getSyncSettings(platform: string): Promise<SyncSettings | undefined> {
    const [settings] = await db.select().from(syncSettings).where(eq(syncSettings.platform, platform));
    return settings || undefined;
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

  async getRestApiSettings(platform: string): Promise<RestApiSettings | undefined> {
    const [settings] = await db.select().from(restApiSettings).where(eq(restApiSettings.platform, platform));
    return settings || undefined;
  }

  async upsertRestApiSettings(settings: InsertRestApiSettings): Promise<RestApiSettings> {
    const [result] = await db
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
    return result;
  }
}

export const storage = new DatabaseStorage();