import {
  users,
  locations,
  orders,
  fileUploads,
  userLocationAccess,
  notes,
  type User,
  type InsertUser,
  type Location,
  type InsertLocation,
  type Order,
  type InsertOrder,
  type FileUpload,
  type InsertFileUpload,
  type Note,
  type InsertNote,
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
  
  // File upload operations
  createFileUpload(fileUpload: InsertFileUpload): Promise<FileUpload>;
  updateFileUpload(id: number, fileUpload: Partial<InsertFileUpload>): Promise<FileUpload>;
  getRecentFileUploads(limit?: number): Promise<FileUpload[]>;
  deleteFileUploads(ids: number[]): Promise<void>;
  
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
  
  // Notes operations (admin only)
  getNotes(userId: number): Promise<Note[]>;
  getNote(id: number, userId: number): Promise<Note | undefined>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: number, note: Partial<InsertNote>, userId: number): Promise<Note>;
  deleteNote(id: number, userId: number): Promise<void>;
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

  async getRecentFileUploads(limit = 10): Promise<FileUpload[]> {
    return await db
      .select()
      .from(fileUploads)
      .orderBy(desc(fileUploads.createdAt))
      .limit(limit);
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
        totalSales: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} != 'refunded' THEN ${orders.amount} ELSE 0 END), 0)`,
        totalRefunds: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'refunded' THEN ${orders.amount} ELSE 0 END), 0)`,
        totalOrders: sql<number>`COUNT(CASE WHEN ${orders.status} != 'refunded' THEN 1 END)`,
        platformFees: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} != 'refunded' THEN ${orders.platformFee} ELSE 0 END), 0)`,
        stripeFees: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} != 'refunded' THEN ${orders.stripeFee} ELSE 0 END), 0)`,
        netDeposit: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} != 'refunded' THEN ${orders.netAmount} ELSE 0 END), 0)`,
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
}

export const storage = new DatabaseStorage();
