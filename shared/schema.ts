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

// Users table with role-based permissions
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
  mustChangePassword: boolean("must_change_password").notNull().default(false),
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
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  locationId: integer("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// User page permissions table
export const userPagePermissions = pgTable("user_page_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pageName: varchar("page_name", { length: 100 }).notNull(), // dashboard, reports, locations, users, etc.
  canView: boolean("can_view").notNull().default(false),
  canEdit: boolean("can_edit").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// User status access table (for order statuses)
export const userStatusAccess = pgTable("user_status_access", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderId: varchar("order_id", { length: 255 }).notNull().unique(),
  locationId: integer("location_id").notNull().references(() => locations.id),
  status: varchar("status", { length: 100 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }),
  taxTotal: decimal("tax_total", { precision: 10, scale: 2 }),
  shippingTotal: decimal("shipping_total", { precision: 10, scale: 2 }),
  discountTotal: decimal("discount_total", { precision: 10, scale: 2 }),
  refundedAmount: decimal("refunded_amount", { precision: 10, scale: 2 }).default("0"),
  customerEmail: varchar("customer_email", { length: 255 }),
  customerFirstName: varchar("customer_first_name", { length: 255 }),
  customerLastName: varchar("customer_last_name", { length: 255 }),
  paymentMethod: varchar("payment_method", { length: 100 }),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).default("0"),
  stripeFee: decimal("stripe_fee", { precision: 10, scale: 2 }).default("0"),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).default("0"),
  dateCreated: timestamp("date_created"),
  dateModified: timestamp("date_modified"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Logo settings table
export const logoSettings = pgTable("logo_settings", {
  id: serial("id").primaryKey(),
  logoPath: varchar("logo_path", { length: 500 }),
  faviconPath: varchar("favicon_path", { length: 500 }),
  originalName: varchar("original_name", { length: 255 }),
  faviconOriginalName: varchar("favicon_original_name", { length: 255 }),
  mimeType: varchar("mime_type", { length: 100 }),
  faviconMimeType: varchar("favicon_mime_type", { length: 100 }),
  fileSize: integer("file_size"),
  faviconFileSize: integer("favicon_file_size"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recaptcha settings table
export const recaptchaSettings = pgTable("recaptcha_settings", {
  id: serial("id").primaryKey(),
  siteKey: varchar("site_key", { length: 255 }),
  secretKey: varchar("secret_key", { length: 255 }),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Footer settings table
export const footerSettings = pgTable("footer_settings", {
  id: serial("id").primaryKey(),
  customCode: text("custom_code"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Store connections table
export const storeConnections = pgTable("store_connections", {
  id: varchar("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  storeUrl: varchar("store_url", { length: 500 }).notNull(),
  consumerKey: varchar("consumer_key", { length: 255 }).notNull(),
  consumerSecret: varchar("consumer_secret", { length: 255 }).notNull(),
  defaultLocationId: integer("default_location_id").references(() => locations.id),
  isActive: boolean("is_active").notNull().default(true),
  autoSyncEnabled: boolean("auto_sync_enabled").notNull().default(false),
  syncInterval: integer("sync_interval").notNull().default(5),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// REST API settings table
export const restApiSettings = pgTable("rest_api_settings", {
  id: serial("id").primaryKey(),
  connectionId: varchar("connection_id").references(() => storeConnections.id),
  endpoint: varchar("endpoint", { length: 500 }).notNull(),
  method: varchar("method", { length: 10 }).notNull().default("GET"),
  headers: jsonb("headers"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sync settings table
export const syncSettings = pgTable("sync_settings", {
  id: serial("id").primaryKey(),
  connectionId: varchar("connection_id").references(() => storeConnections.id),
  autoSyncEnabled: boolean("auto_sync_enabled").notNull().default(false),
  syncInterval: integer("sync_interval").notNull().default(5),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  locationAccess: many(userLocationAccess),
  pagePermissions: many(userPagePermissions),
  statusAccess: many(userStatusAccess),
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

export const userPagePermissionsRelations = relations(userPagePermissions, ({ one }) => ({
  user: one(users, {
    fields: [userPagePermissions.userId],
    references: [users.id],
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

// Insert schemas with validation
export const insertUserSchema = createInsertSchema(users, {
  password: z.string().min(8).regex(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, {
    message: "Password must be at least 8 characters with letters, numbers and at least 1 symbol"
  }),
  email: z.string().email().optional(),
}).omit({
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

export const insertUserLocationAccessSchema = createInsertSchema(userLocationAccess).omit({
  id: true,
  createdAt: true,
});

export const insertUserPagePermissionsSchema = createInsertSchema(userPagePermissions).omit({
  id: true,
  createdAt: true,
});

export const insertUserStatusAccessSchema = createInsertSchema(userStatusAccess).omit({
  id: true,
  createdAt: true,
});

export const insertLogoSettingsSchema = createInsertSchema(logoSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecaptchaSettingsSchema = createInsertSchema(recaptchaSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFooterSettingsSchema = createInsertSchema(footerSettings).omit({
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

export const insertSyncSettingsSchema = createInsertSchema(syncSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type UserLocationAccess = typeof userLocationAccess.$inferSelect;
export type InsertUserLocationAccess = z.infer<typeof insertUserLocationAccessSchema>;
export type UserPagePermissions = typeof userPagePermissions.$inferSelect;
export type InsertUserPagePermissions = z.infer<typeof insertUserPagePermissionsSchema>;
export type UserStatusAccess = typeof userStatusAccess.$inferSelect;
export type InsertUserStatusAccess = z.infer<typeof insertUserStatusAccessSchema>;
export type LogoSettings = typeof logoSettings.$inferSelect;
export type InsertLogoSettings = z.infer<typeof insertLogoSettingsSchema>;
export type RecaptchaSettings = typeof recaptchaSettings.$inferSelect;
export type InsertRecaptchaSettings = z.infer<typeof insertRecaptchaSettingsSchema>;
export type FooterSettings = typeof footerSettings.$inferSelect;
export type InsertFooterSettings = z.infer<typeof insertFooterSettingsSchema>;
export type StoreConnection = typeof storeConnections.$inferSelect;
export type InsertStoreConnection = z.infer<typeof insertStoreConnectionSchema>;
export type RestApiSettings = typeof restApiSettings.$inferSelect;
export type InsertRestApiSettings = z.infer<typeof insertRestApiSettingsSchema>;
export type SyncSettings = typeof syncSettings.$inferSelect;
export type InsertSyncSettings = z.infer<typeof insertSyncSettingsSchema>;