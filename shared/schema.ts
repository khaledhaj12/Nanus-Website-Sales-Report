import { 
  pgTable, 
  text, 
  varchar, 
  timestamp, 
  jsonb, 
  index, 
  serial,
  decimal,
  integer,
  boolean,
  date
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  role: varchar("role", { length: 50 }).notNull().default("user"), // admin, user
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Locations table
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User location access table
export const userLocationAccess = pgTable("user_location_access", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  locationId: integer("location_id").notNull().references(() => locations.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// User status access table
export const userStatusAccess = pgTable("user_status_access", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderId: varchar("order_id", { length: 255 }).notNull().unique(),
  locationId: integer("location_id").notNull().references(() => locations.id),
  customerName: varchar("customer_name", { length: 255 }),
  firstName: varchar("first_name", { length: 255 }),
  customerEmail: varchar("customer_email", { length: 255 }),
  cardLast4: varchar("card_last4", { length: 4 }),
  paymentMethod: varchar("payment_method", { length: 100 }),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }).default("0"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 50 }).notNull(), // completed, refunded, pending
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).notNull(),
  stripeFee: decimal("stripe_fee", { precision: 10, scale: 2 }).notNull(),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  orderNotes: text("order_notes"),
  orderDate: date("order_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});





// Sync settings table for automated data fetching
export const syncSettings = pgTable("sync_settings", {
  id: serial("id").primaryKey(),
  platform: varchar("platform", { length: 50 }).notNull().unique(), // 'woocommerce'
  isActive: boolean("is_active").default(true),
  intervalMinutes: integer("interval_minutes").default(5), // How often to sync in minutes
  lastSyncAt: timestamp("last_sync_at"),
  nextSyncAt: timestamp("next_sync_at"),
  isRunning: boolean("is_running").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Store connections table
export const storeConnections = pgTable("store_connections", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  domain: varchar("domain", { length: 255 }),
  platform: varchar("platform", { length: 50 }).notNull(),
  connectionId: varchar("connection_id", { length: 100 }).notNull().unique(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// REST API settings table
export const restApiSettings = pgTable("rest_api_settings", {
  id: serial("id").primaryKey(),
  platform: varchar("platform", { length: 50 }).notNull().unique(),
  consumerKey: varchar("consumer_key", { length: 255 }),
  consumerSecret: varchar("consumer_secret", { length: 255 }),
  storeUrl: varchar("store_url", { length: 255 }),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  locationAccess: many(userLocationAccess),
  statusAccess: many(userStatusAccess),
}));

export const locationsRelations = relations(locations, ({ many }) => ({
  orders: many(orders),
  userAccess: many(userLocationAccess),
}));

export const userLocationAccessRelations = relations(userLocationAccess, ({ one }) => ({
  user: one(users, {
    fields: [userLocationAccess.userId],
    references: [users.id],
  }),
  location: one(locations, {
    fields: [userLocationAccess.locationId],
    references: [locations.id],
  }),
}));

export const userStatusAccessRelations = relations(userStatusAccess, ({ one }) => ({
  user: one(users, {
    fields: [userStatusAccess.userId],
    references: [users.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  location: one(locations, {
    fields: [orders.locationId],
    references: [locations.id],
  }),
}));





// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});





export const insertSyncSettingsSchema = createInsertSchema(syncSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStoreConnectionSchema = createInsertSchema(storeConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRestApiSettingsSchema = createInsertSchema(restApiSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;


export type SyncSettings = typeof syncSettings.$inferSelect;
export type InsertSyncSettings = z.infer<typeof insertSyncSettingsSchema>;
export type StoreConnection = typeof storeConnections.$inferSelect;
export type InsertStoreConnection = z.infer<typeof insertStoreConnectionSchema>;
export type RestApiSettings = typeof restApiSettings.$inferSelect;
export type InsertRestApiSettings = z.infer<typeof insertRestApiSettingsSchema>;
export type UserLocationAccess = typeof userLocationAccess.$inferSelect;
export type UserStatusAccess = typeof userStatusAccess.$inferSelect;
