import {
  pgTable,
  uuid,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "sent",
  "approved",
  "rejected",
  "cancelled",
]);

export const authorizationStatusEnum = pgEnum("authorization_status", [
  "pending",
  "authorized",
  "used",
  "rejected",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: integer("role").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  brand: varchar("brand", { length: 255 }).notNull(),
  category: varchar("category", { length: 255 }).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: varchar("image_url", { length: 500 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  monthlyBudget: numeric("monthly_budget", { precision: 10, scale: 2 }).notNull(),
  supervisorId: uuid("supervisor_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  supervisorId: uuid("supervisor_id")
    .references(() => users.id)
    .notNull(),
  status: orderStatusEnum("status").notNull().default("draft"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  intendedMonth: varchar("intended_month", { length: 7 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .references(() => orders.id, { onDelete: "cascade" })
    .notNull(),
  productId: uuid("product_id")
    .references(() => products.id)
    .notNull(),
  nameSnapshot: varchar("name_snapshot", { length: 255 }).notNull(),
  brandSnapshot: varchar("brand_snapshot", { length: 255 }).notNull(),
  priceSnapshot: numeric("price_snapshot", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
});

export const remitos = pgTable("remitos", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .references(() => orders.id, { onDelete: "restrict" })
    .notNull()
    .unique(),
  internalNumber: integer("internal_number").generatedAlwaysAsIdentity(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const extraOrderAuthorizations = pgTable("extra_order_authorizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  supervisorId: uuid("supervisor_id")
    .references(() => users.id)
    .notNull(),
  adminId: uuid("admin_id")
    .references(() => users.id),
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM
  reason: varchar("reason", { length: 500 }).notNull(),
  status: authorizationStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Remito = typeof remitos.$inferSelect;
export type ExtraOrderAuthorization = typeof extraOrderAuthorizations.$inferSelect;

// Role constants
export const ROLES = {
  STAFF: 0,
  SUPERVISOR: 1,
  ADMIN: 2,
  SUPERADMIN: 3,
} as const;

export const ROLE_LABELS: Record<number, string> = {
  [ROLES.STAFF]: "Staff",
  [ROLES.SUPERVISOR]: "Supervisor",
  [ROLES.ADMIN]: "Administrador",
  [ROLES.SUPERADMIN]: "Superadmin",
};
