import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  username: varchar("username", { length: 64 }).unique(),
  passwordHash: text("passwordHash"),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "editor", "admin"]).default("user").notNull(),
  isBlocked: int("isBlocked").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const siteSettings = mysqlTable("siteSettings", {
  id: int("id").primaryKey(),
  maintenanceEnabled: int("maintenanceEnabled").default(0).notNull(),
  scheduledEnabled: int("scheduledEnabled").default(1).notNull(),
  maintenanceFrom: varchar("maintenanceFrom", { length: 5 }).default("02:00").notNull(),
  maintenanceTo: varchar("maintenanceTo", { length: 5 }).default("04:00").notNull(),
  allowRegistration: int("allowRegistration").default(1).notNull(),
  adsensePublisherId: varchar("adsensePublisherId", { length: 32 }),
  searchConsoleUrl: varchar("searchConsoleUrl", { length: 512 }),
  aiEnabled: int("aiEnabled").default(1).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SiteSettings = typeof siteSettings.$inferSelect;
export type InsertSiteSettings = typeof siteSettings.$inferInsert;

export const siteStats = mysqlTable("siteStats", {
  id: int("id").primaryKey(),
  visitsTotal: int("visitsTotal").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SiteStats = typeof siteStats.$inferSelect;

export const visitEvents = mysqlTable("visitEvents", {
  id: int("id").autoincrement().primaryKey(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["new_member", "traffic_spike", "system"]).default("system").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body").notNull(),
  isRead: int("isRead").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;

export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId"),
  actorUsername: varchar("actorUsername", { length: 64 }),
  action: varchar("action", { length: 80 }).notNull(),
  targetType: varchar("targetType", { length: 40 }),
  targetId: varchar("targetId", { length: 80 }),
  metadata: text("metadata"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
