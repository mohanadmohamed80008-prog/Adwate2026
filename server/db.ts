import { and, count, desc, eq, gte, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { auditLogs, improvementReports, InsertSiteSettings, InsertUser, notifications, siteSettings, siteStats, toolUsageEvents, users, visitEvents } from "../drizzle/schema";
import { ENV } from './_core/env';
import { sendOwnerNotification } from './_core/ownerNotifications';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
  values.lastSignedIn ??= new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserAccess(id: number, values: { role: "user" | "editor" | "admin"; isBlocked: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(users).set(values).where(eq(users.id, id));
  return getUserById(id);
}

export async function createLocalUser(values: { username: string; passwordHash: string; name: string; role?: "user" | "admin" }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [result] = await db.insert(users).values({
    openId: `local:${values.username}`,
    username: values.username,
    passwordHash: values.passwordHash,
    name: values.name,
    loginMethod: "local",
    role: values.role ?? "user",
  });
  return getUserById(Number(result.insertId));
}

export const defaultSiteSettings = {
  id: 1,
  maintenanceEnabled: 0,
  scheduledEnabled: 1,
  maintenanceFrom: "02:00",
  maintenanceTo: "04:00",
  allowRegistration: 1,
  adsensePublisherId: "",
  searchConsoleUrl: "",
  aiEnabled: 1,
  featuredToolId: null,
} as const;

export async function getSiteSettings() {
  const db = await getDb();
  if (!db) return defaultSiteSettings;
  const result = await db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1);
  return result[0] ?? defaultSiteSettings;
}

export async function ensureOptionalSchema() {
  const db = await getDb();
  if (!db) return;
  const statements = [
    sql`ALTER TABLE siteSettings ADD COLUMN IF NOT EXISTS aiEnabled INT NOT NULL DEFAULT 1`,
    sql`ALTER TABLE siteSettings ADD COLUMN IF NOT EXISTS featuredToolId VARCHAR(64) NULL`,
    sql`CREATE TABLE IF NOT EXISTS toolUsageEvents (id INT AUTO_INCREMENT PRIMARY KEY, toolId VARCHAR(64) NOT NULL, createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_tool_usage_createdAt (createdAt), INDEX idx_tool_usage_toolId (toolId))`,
    sql`CREATE TABLE IF NOT EXISTS improvementReports (id INT AUTO_INCREMENT PRIMARY KEY, periodStart TIMESTAMP NOT NULL, periodEnd TIMESTAMP NOT NULL, status ENUM('proposed','approved','rejected','applied') NOT NULL DEFAULT 'proposed', summary TEXT NOT NULL, recommendations TEXT NOT NULL, reviewedAt TIMESTAMP NULL, createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_improvement_status (status), INDEX idx_improvement_createdAt (createdAt))`,
  ];
  for (const statement of statements) {
    try { await db.execute(statement); }
    catch (error) { console.warn("[Database] Optional schema statement skipped:", error instanceof Error ? error.message : error); }
  }
}

export async function updateSiteSettings(values: Omit<InsertSiteSettings, "id">) {
  const db = await getDb();
  if (!db) return { ...defaultSiteSettings, ...values };
  await db.insert(siteSettings).values({ id: 1, ...values }).onDuplicateKeyUpdate({ set: values });
  return getSiteSettings();
}

export async function recordSiteVisit() {
  const db = await getDb();
  if (!db) return;
  await db.insert(siteStats).values({ id: 1, visitsTotal: 1 }).onDuplicateKeyUpdate({ set: { visitsTotal: sql`${siteStats.visitsTotal} + 1` } });
  await db.insert(visitEvents).values({});
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [hourly] = await db.select({ total: count() }).from(visitEvents).where(gte(visitEvents.createdAt, hourAgo));
  if (Number(hourly?.total ?? 0) >= 50) {
    const recentAlert = await db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.type, "traffic_spike"), gte(notifications.createdAt, hourAgo))).limit(1);
    if (!recentAlert.length) {
      const title = "ارتفاع غير معتاد في الزيارات";
      const body = "تم تسجيل أكثر من ٥٠ زيارة خلال الساعة الأخيرة في منصة أدواتي.";
      await createNotification({ type: "traffic_spike", title, body });
      void sendOwnerNotification(title, body);
    }
  }
}

export async function createNotification(values: { type: "new_member" | "traffic_spike" | "system" | "ai_report"; title: string; body: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values({ ...values, isRead: 0 });
}

export async function listNotifications() {
  const db = await getDb();
  if (!db) return { items: [], unreadCount: 0 };
  const [items, unread] = await Promise.all([
    db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(30),
    db.select({ total: count() }).from(notifications).where(eq(notifications.isRead, 0)),
  ]);
  return { items, unreadCount: Number(unread[0]?.total ?? 0) };
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: 1 }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead() {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: 1 }).where(eq(notifications.isRead, 0));
}

export async function createAuditLog(values: { actorUserId?: number | null; actorUsername?: string | null; action: string; targetType?: string; targetId?: string | number; metadata?: Record<string, unknown>; req?: { ip?: string; headers: Record<string, string | string[] | undefined> } }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({
    actorUserId: values.actorUserId ?? null,
    actorUsername: values.actorUsername ?? null,
    action: values.action,
    targetType: values.targetType ?? null,
    targetId: values.targetId === undefined ? null : String(values.targetId),
    metadata: values.metadata ? JSON.stringify(values.metadata) : null,
    ipAddress: values.req?.ip ?? null,
    userAgent: typeof values.req?.headers?.["user-agent"] === "string" ? values.req.headers["user-agent"] : null,
  });
}

export async function listAuditLogs(filters: { search?: string; action?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters.action && filters.action !== "all") conditions.push(eq(auditLogs.action, filters.action));
  if (filters.search) conditions.push(like(auditLogs.actorUsername, `%${filters.search}%`));
  return db.select().from(auditLogs).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(auditLogs.createdAt)).limit(Math.min(filters.limit ?? 100, 200));
}

export async function getAnalyticsSummary() {
  const db = await getDb();
  if (!db) return { visitsTotal: 0, activeMembers: 0, newMembers: 0 };
  const stats = await db.select().from(siteStats).where(eq(siteStats.id, 1)).limit(1);
  const activeSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const newSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [activeResult, newResult] = await Promise.all([
    db.select({ total: count() }).from(users).where(and(eq(users.isBlocked, 0), gte(users.lastSignedIn, activeSince))),
    db.select({ total: count() }).from(users).where(and(eq(users.isBlocked, 0), gte(users.createdAt, newSince))),
  ]);
  return { visitsTotal: stats[0]?.visitsTotal ?? 0, activeMembers: Number(activeResult[0]?.total ?? 0), newMembers: Number(newResult[0]?.total ?? 0) };
}

function minutes(value: string) {
  const [hours, mins] = value.split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(mins) ? mins : 0);
}

export function isSiteMaintenanceActive(settings: Awaited<ReturnType<typeof getSiteSettings>>, now = new Date()) {
  if (settings.maintenanceEnabled) return true;
  if (!settings.scheduledEnabled) return false;
  const start = minutes(settings.maintenanceFrom);
  const end = minutes(settings.maintenanceTo);
  const current = now.getHours() * 60 + now.getMinutes();
  return start === end ? false : start < end ? current >= start && current < end : current >= start || current < end;
}


export async function recordToolUsage(toolId: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(toolUsageEvents).values({ toolId: toolId.slice(0, 64) });
}

export async function getToolUsageSummary(since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ toolId: toolUsageEvents.toolId, uses: count() }).from(toolUsageEvents).where(gte(toolUsageEvents.createdAt, since)).groupBy(toolUsageEvents.toolId).orderBy(desc(sql`uses`)).limit(20);
}

export async function createImprovementReport(values: { periodStart: Date; periodEnd: Date; summary: string; recommendations: string }) {
  const db = await getDb();
  if (!db) return undefined;
  const [result] = await db.insert(improvementReports).values({ ...values, status: "proposed" });
  return getImprovementReportById(Number(result.insertId));
}

export async function getImprovementReportById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(improvementReports).where(eq(improvementReports.id, id)).limit(1);
  return result[0];
}

export async function listImprovementReports() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(improvementReports).orderBy(desc(improvementReports.createdAt)).limit(12);
}

export async function setFeaturedTool(toolId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(siteSettings).set({ featuredToolId: toolId.slice(0, 64) }).where(eq(siteSettings.id, 1));
}

export async function updateImprovementReportStatus(id: number, status: "approved" | "rejected" | "applied") {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(improvementReports).set({ status, reviewedAt: new Date() }).where(eq(improvementReports.id, id));
  return getImprovementReportById(id);
}
