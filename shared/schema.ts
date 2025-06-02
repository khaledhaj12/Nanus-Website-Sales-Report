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



// WooCommerce orders table - comprehensive data capture
export const wooOrders = pgTable("woo_orders", {
  id: serial("id").primaryKey(),
  wooOrderId: varchar("woo_order_id", { length: 50 }).notNull().unique(),
  orderId: varchar("order_id", { length: 255 }).notNull(),
  locationId: integer("location_id").references(() => locations.id),
  
  // Customer information
  customerName: varchar("customer_name", { length: 255 }),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  customerEmail: varchar("customer_email", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
  customerId: varchar("customer_id", { length: 50 }),
  
  // Order financial details
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default('0'),
  shippingTotal: decimal("shipping_total", { precision: 10, scale: 2 }).default('0'),
  taxTotal: decimal("tax_total", { precision: 10, scale: 2 }).default('0'),
  discountTotal: decimal("discount_total", { precision: 10, scale: 2 }).default('0'),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }).default('0'),
  
  // Order details
  status: varchar("status", { length: 50 }).notNull(),
  orderDate: timestamp("order_date").notNull(),
  wooOrderNumber: varchar("woo_order_number", { length: 50 }),
  paymentMethod: varchar("payment_method", { length: 100 }),
  paymentMethodTitle: varchar("payment_method_title", { length: 255 }),
  currency: varchar("currency", { length: 10 }).default('USD'),
  
  // Shipping information
  shippingFirstName: varchar("shipping_first_name", { length: 255 }),
  shippingLastName: varchar("shipping_last_name", { length: 255 }),
  shippingAddress1: varchar("shipping_address_1", { length: 255 }),
  shippingAddress2: varchar("shipping_address_2", { length: 255 }),
  shippingCity: varchar("shipping_city", { length: 100 }),
  shippingState: varchar("shipping_state", { length: 100 }),
  shippingPostcode: varchar("shipping_postcode", { length: 20 }),
  shippingCountry: varchar("shipping_country", { length: 10 }),
  
  // Billing information
  billingFirstName: varchar("billing_first_name", { length: 255 }),
  billingLastName: varchar("billing_last_name", { length: 255 }),
  billingAddress1: varchar("billing_address_1", { length: 255 }),
  billingAddress2: varchar("billing_address_2", { length: 255 }),
  billingCity: varchar("billing_city", { length: 100 }),
  billingState: varchar("billing_state", { length: 100 }),
  billingPostcode: varchar("billing_postcode", { length: 20 }),
  billingCountry: varchar("billing_country", { length: 10 }),
  
  // Metadata and notes
  locationMeta: varchar("location_meta", { length: 255 }),
  orderNotes: text("order_notes"),
  customerNote: text("customer_note"),
  
  // Raw data storage
  lineItems: text("line_items"), // JSON string of products/items
  metaData: text("meta_data"), // JSON string of all metadata
  rawData: text("raw_data"), // Store full WooCommerce order data as JSON
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Webhook settings table
export const webhookSettings = pgTable("webhook_settings", {
  id: serial("id").primaryKey(),
  platform: varchar("platform", { length: 50 }).notNull().unique(), // 'woocommerce'
  secretKey: varchar("secret_key", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Webhook request logs table
export const webhookLogs = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  platform: varchar("platform", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // 'success', 'error', 'unauthorized'
  orderId: varchar("order_id", { length: 100 }),
  orderTotal: varchar("order_total", { length: 50 }),
  customerName: varchar("customer_name", { length: 255 }),
  location: varchar("location", { length: 255 }),
  errorMessage: text("error_message"),
  payload: jsonb("payload").notNull(),
  headers: jsonb("headers"),
  receivedAt: timestamp("received_at").defaultNow(),
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
}));

export const locationsRelations = relations(locations, ({ many }) => ({
  orders: many(orders),
  wooOrders: many(wooOrders),
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

export const ordersRelations = relations(orders, ({ one }) => ({
  location: one(locations, {
    fields: [orders.locationId],
    references: [locations.id],
  }),
}));



export const wooOrdersRelations = relations(wooOrders, ({ one }) => ({
  location: one(locations, {
    fields: [wooOrders.locationId],
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



export const insertWooOrderSchema = createInsertSchema(wooOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWebhookSettingsSchema = createInsertSchema(webhookSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWebhookLogSchema = createInsertSchema(webhookLogs).omit({
  id: true,
  receivedAt: true,
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

export type WooOrder = typeof wooOrders.$inferSelect;
export type InsertWooOrder = z.infer<typeof insertWooOrderSchema>;
export type WebhookSettings = typeof webhookSettings.$inferSelect;
export type InsertWebhookSettings = z.infer<typeof insertWebhookSettingsSchema>;
export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;
export type RestApiSettings = typeof restApiSettings.$inferSelect;
export type InsertRestApiSettings = z.infer<typeof insertRestApiSettingsSchema>;
export type UserLocationAccess = typeof userLocationAccess.$inferSelect;
