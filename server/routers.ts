import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { User } from "../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { createAuditLog, createImprovementReport, createLocalUser, createNotification, getAnalyticsSummary, getImprovementReportById, getSiteSettings, getToolUsageSummary, getUserByUsername, isSiteMaintenanceActive, listAuditLogs, listImprovementReports, listNotifications, listUsers, markAllNotificationsRead, markNotificationRead, recordSiteVisit, recordToolUsage, setFeaturedTool, updateImprovementReportStatus, updateSiteSettings, updateUserAccess } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { ADMIN_USERNAME, clearLocalSession, ensureAdminUser, hashPassword, isAdminLogin, setLocalSession, verifyPassword } from "./_core/localAuth";
import { sendOwnerNotification } from "./_core/ownerNotifications";
import { invokeLLM } from "./_core/llm";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const usernamePattern = /^[a-zA-Z0-9_]{3,32}$/;

export async function runWeeklyImprovementReview() {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  let usage: Awaited<ReturnType<typeof getToolUsageSummary>> = [];
  let analytics = { visitsTotal: 0, activeMembers: 0, newMembers: 0 };
  try {
    [usage, analytics] = await Promise.all([getToolUsageSummary(periodStart), getAnalyticsSummary()]);
  } catch (error) {
    console.warn("[Weekly AI Review] Analytics unavailable; using safe defaults:", error instanceof Error ? error.message : error);
  }
  const usageText = usage.length ? usage.map((item, index) => `${index + 1}. ${item.toolId}: ${Number(item.uses)} استخدام`).join("\n") : "لا توجد بيانات استخدام كافية بعد.";
  let text = "";
  try {
    const result = await invokeLLM({
      model: "gpt-6.1-sol",
      reasoning: { effort: "low" },
      maxTokens: 1800,
      messages: [
        { role: "system", content: "أنت مستشار نمو آمن لمنصة أدواتي. حلّل البيانات وقدّم تقريرًا عربيًا عمليًا. لا تقترح حذف بيانات أو منح صلاحيات واسعة أو نشرًا تلقائيًا. اقترح تحسينات صغيرة قابلة للمراجعة من المدير، مستندة إلى الأدوات الأكثر استخدامًا وأنماط الطلبات الشائعة في منصات الأدوات الرقمية. اكتب: ملخص، ثم 3 اقتراحات مرقمة مع الفائدة والمخاطر وخطوة التنفيذ." },
        { role: "user", content: `الفترة: ${periodStart.toISOString()} إلى ${periodEnd.toISOString()}\nالزيارات الكلية: ${analytics.visitsTotal}\nالأعضاء النشطون: ${analytics.activeMembers}\nالأعضاء الجدد خلال 7 أيام: ${analytics.newMembers}\nاستخدام الأدوات خلال 7 أيام:\n${usageText}` },
      ],
    });
    const content = result.choices?.[0]?.message?.content;
    text = Array.isArray(content) ? content.map((part) => part.type === "text" ? part.text : "").join("") : content ?? "";
  } catch (error) {
    console.warn("[Weekly AI Review] AI unavailable; creating fallback report:", error instanceof Error ? error.message : error);
  }
  if (!text) text = `ملخص آلي احتياطي للفترة من ${periodStart.toLocaleDateString("ar-SA")} إلى ${periodEnd.toLocaleDateString("ar-SA")}: الزيارات ${analytics.visitsTotal}، الأعضاء النشطون ${analytics.activeMembers}، والأعضاء الجدد ${analytics.newMembers}.\n\nاقتراحات للمراجعة:\n1. تحسين الصفحة أو الميزة المرتبطة بالأداة الأعلى استخدامًا (${usage[0]?.toolId ?? "غير متاح بعد"}) مع قياس أثر التغيير.\n2. إضافة اختصار أو قالب جاهز للأداة الثانية الأكثر استخدامًا (${usage[1]?.toolId ?? "غير متاح بعد"}).\n3. جمع طلبات المستخدمين من الدعم قبل تنفيذ أي أداة جديدة.\n\nملاحظة: هذا تقرير احتياطي لأن خدمة الذكاء لم تُرجع نتيجة في هذه الدورة. لا يتم تطبيق أي تغيير تلقائيًا.`;
  let report: Awaited<ReturnType<typeof createImprovementReport>>;
  try {
    report = await createImprovementReport({ periodStart, periodEnd, summary: text.slice(0, 8000), recommendations: text.slice(0, 12000) });
  } catch (error) {
    console.error("[Weekly AI Review] Could not persist report; sending fallback notification:", error instanceof Error ? error.message : error);
    try { await createNotification({ type: "system", title: "تقرير تحسين أسبوعي جاهز للمراجعة", body: text.slice(0, 700) }); } catch (notificationError) { console.error("[Weekly AI Review] Fallback notification failed:", notificationError); }
    return undefined;
  }
  if (report) {
    const title = "تقرير تحسين أسبوعي جديد";
    const body = `أنشأ مساعد الذكاء تقريرًا جديدًا رقم #${report.id}. راجعه من قسم التقارير قبل الموافقة على أي تغيير.`;
    // Use the existing system notification enum for backward-compatible deployments.
    await createNotification({ type: "system", title, body });
    void sendOwnerNotification(title, body);
  }
  return report;
}

const publicUser = (user: User) => ({
  id: user.id,
  username: user.username,
  name: user.name,
  email: user.email,
  loginMethod: user.loginMethod,
  role: user.role,
  isBlocked: user.isBlocked,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  lastSignedIn: user.lastSignedIn,
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user ? publicUser(opts.ctx.user) : null),
    localRegister: publicProcedure.input(z.object({
      username: z.string().regex(usernamePattern, "اسم المستخدم يجب أن يكون من 3 إلى 32 حرفًا أو رقمًا"),
      password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
      name: z.string().min(2).max(100),
    })).mutation(async ({ input, ctx }) => {
      const settings = await getSiteSettings();
      if (!settings.allowRegistration) throw new TRPCError({ code: "FORBIDDEN", message: "التسجيل متوقف مؤقتًا من الإدارة" });
      if (input.username.toLowerCase() === ADMIN_USERNAME) throw new TRPCError({ code: "CONFLICT", message: "اسم المستخدم محجوز" });
      if (await getUserByUsername(input.username)) throw new TRPCError({ code: "CONFLICT", message: "اسم المستخدم مستخدم بالفعل" });
      const user = await createLocalUser({ username: input.username, passwordHash: hashPassword(input.password), name: input.name });
      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر إنشاء الحساب" });
      const notificationTitle = "عضو جديد سجّل حسابًا";
      const notificationBody = `انضم ${input.name} (@${input.username}) إلى المنصة.`;
      await createNotification({ type: "new_member", title: notificationTitle, body: notificationBody });
      void sendOwnerNotification(notificationTitle, notificationBody);
      await createAuditLog({ actorUserId: user.id, actorUsername: user.username, action: "member.register", targetType: "user", targetId: user.id, req: ctx.req });
      setLocalSession(ctx.res, ctx.req, user);
      return publicUser(user);
    }),
    localLogin: publicProcedure.input(z.object({ username: z.string().min(3), password: z.string().min(1) })).mutation(async ({ input, ctx }) => {
      let user = await getUserByUsername(input.username);
      if (isAdminLogin(input.username, input.password)) user = await ensureAdminUser(input.password);
      if (!user || !user.passwordHash || !verifyPassword(input.password, user.passwordHash)) throw new TRPCError({ code: "UNAUTHORIZED", message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      setLocalSession(ctx.res, ctx.req, user);
      await createAuditLog({ actorUserId: user.id, actorUsername: user.username, action: "auth.login", targetType: "user", targetId: user.id, req: ctx.req });
      return publicUser(user);
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      if (ctx.user) void createAuditLog({ actorUserId: ctx.user.id, actorUsername: ctx.user.username, action: "auth.logout", targetType: "user", targetId: ctx.user.id, req: ctx.req });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      clearLocalSession(ctx.res, ctx.req);
      return { success: true } as const;
    }),
  }),
  analytics: router({
    recordVisit: publicProcedure.mutation(async () => { await recordSiteVisit(); return { success: true } as const; }),
    recordToolUsage: protectedProcedure.input(z.object({ toolId: z.string().regex(/^[a-z0-9-]{1,64}$/) })).mutation(async ({ input }) => { await recordToolUsage(input.toolId); return { success: true } as const; }),
  }),
  ai: router({
    assistant: protectedProcedure.input(z.object({
      task: z.enum(["rewrite", "summarize", "proofread", "diagnose"]),
      text: z.string().min(1).max(12000),
      context: z.string().max(2000).optional(),
    })).mutation(async ({ input }) => {
      const settings = await getSiteSettings();
      if (!settings.aiEnabled) throw new TRPCError({ code: "FORBIDDEN", message: "مساعد الذكاء الاصطناعي متوقف حاليًا من لوحة الإدارة" });
      const taskLabel = { rewrite: "إعادة صياغة", summarize: "تلخيص", proofread: "تدقيق لغوي", diagnose: "تحليل مشكلة تقنية" }[input.task];
      const result = await invokeLLM({
        model: "gpt-6.1-sol",
        reasoning: { effort: "low" },
        maxTokens: 1400,
        messages: [
          { role: "system", content: "أنت مساعد عربي عملي داخل منصة أدواتي. أجب بالعربية الواضحة، لا تدّع تنفيذ تغييرات على الخادم أو الملفات، ولا تطلب كلمات مرور أو أسرارًا. عند تحليل مشكلة تقنية، قدّم خطوات آمنة قابلة للتنفيذ." },
          { role: "user", content: `المهمة: ${taskLabel}\n${input.context ? `السياق: ${input.context}\n` : ""}النص أو المشكلة:\n${input.text}` },
        ],
      });
      const content = result.choices?.[0]?.message?.content;
      const text = Array.isArray(content) ? content.map((part) => part.type === "text" ? part.text : "").join("") : content;
      if (!text) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "لم تصل نتيجة من نموذج الذكاء الاصطناعي" });
      return { text };
    }),
  }),
  site: router({
    status: publicProcedure.query(async ({ ctx }) => {
      const settings = await getSiteSettings();
      const active = Boolean(ctx.user?.role === "admin" ? false : isSiteMaintenanceActive(settings));
      return { maintenanceActive: active, settings: { allowRegistration: Boolean(settings.allowRegistration), aiEnabled: Boolean(settings.aiEnabled), featuredToolId: settings.featuredToolId } };
    }),
    verification: publicProcedure.query(async () => {
      const settings = await getSiteSettings();
      return { adsensePublisherId: settings.adsensePublisherId || null };
    }),
    settings: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "You do not have required permission (10002)" });
      return getSiteSettings();
    }),
  }),
  admin: router({
    auditLogs: adminProcedure.input(z.object({ search: z.string().optional(), action: z.string().optional() }).optional()).query(({ input }) => listAuditLogs(input ?? {})),
    notifications: adminProcedure.query(() => listNotifications()),
    markNotificationRead: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { await markNotificationRead(input.id); return { success: true } as const; }),
    markAllNotificationsRead: adminProcedure.mutation(async () => { await markAllNotificationsRead(); return { success: true } as const; }),
    analytics: adminProcedure.query(() => getAnalyticsSummary()),
    improvementReports: adminProcedure.query(() => listImprovementReports()),
    reviewImprovementReport: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["approved", "rejected"]) })).mutation(async ({ input, ctx }) => {
      let report = await updateImprovementReportStatus(input.id, input.status);
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "تقرير التحسين غير موجود" });
      if (input.status === "approved") {
        const topTool = (await getToolUsageSummary())[0]?.toolId;
        if (topTool) {
          await setFeaturedTool(topTool);
          report = await updateImprovementReportStatus(input.id, "applied") ?? report;
          await createNotification({ type: "system", title: "تم تطبيق التحسين تلقائيًا", body: `تم إبراز أداة «${topTool}» تلقائيًا لأنها الأكثر استخدامًا. يمكن التراجع عنها من إعدادات الموقع.` });
        }
      }
      await createAuditLog({ actorUserId: ctx.user.id, actorUsername: ctx.user.username, action: `ai.report.${input.status}`, targetType: "improvementReport", targetId: input.id, req: ctx.req });
      await createNotification({ type: "system", title: input.status === "approved" ? "تمت الموافقة على تقرير التحسين" : "تم رفض تقرير التحسين", body: input.status === "approved" ? `تمت الموافقة على التقرير #${input.id} وبدأ تطبيق التحسين الآمن تلقائيًا.` : `تم رفض التقرير #${input.id}.` });
      return report;
    }),
    members: adminProcedure.query(async () => (await listUsers()).map(publicUser)),
    updateMember: adminProcedure.input(z.object({
      id: z.number().int().positive(),
      role: z.enum(["user", "editor", "admin"]),
      isBlocked: z.boolean(),
    })).mutation(async ({ input, ctx }) => {
      if (input.id === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكنك تغيير صلاحية حسابك من هنا" });
      const member = await updateUserAccess(input.id, { role: input.role, isBlocked: input.isBlocked ? 1 : 0 });
      if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "العضو غير موجود" });
      await createAuditLog({ actorUserId: ctx.user.id, actorUsername: ctx.user.username, action: input.isBlocked ? "member.block" : "member.unblock", targetType: "user", targetId: input.id, metadata: { role: input.role, isBlocked: input.isBlocked }, req: ctx.req });
      return publicUser(member);
    }),
    updateSiteSettings: adminProcedure.input(z.object({
      maintenanceEnabled: z.boolean(),
      scheduledEnabled: z.boolean(),
      maintenanceFrom: z.string().regex(timePattern),
      maintenanceTo: z.string().regex(timePattern),
      allowRegistration: z.boolean(),
      adsensePublisherId: z.string().regex(/^pub-\d{16}$/, "معرّف AdSense يجب أن يبدأ بـ pub- ويتبعه 16 رقمًا").or(z.literal("")),
      searchConsoleUrl: z.string().regex(/^https:\/\/[^\s]+$/, "يجب أن يبدأ الرابط بـ https://").or(z.literal("")),
    })).mutation(async ({ input, ctx }) => { const updated = await updateSiteSettings({
      maintenanceEnabled: input.maintenanceEnabled ? 1 : 0,
      scheduledEnabled: input.scheduledEnabled ? 1 : 0,
      maintenanceFrom: input.maintenanceFrom,
      maintenanceTo: input.maintenanceTo,
      allowRegistration: input.allowRegistration ? 1 : 0,
      adsensePublisherId: input.adsensePublisherId || null,
      searchConsoleUrl: input.searchConsoleUrl || null,
    }); await createAuditLog({ actorUserId: ctx.user.id, actorUsername: ctx.user.username, action: "site.settings.update", targetType: "siteSettings", targetId: 1, metadata: input, req: ctx.req }); return updated; }),
    updateAI: adminProcedure.input(z.object({ enabled: z.boolean() })).mutation(async ({ input, ctx }) => {
      const updated = await updateSiteSettings({ aiEnabled: input.enabled ? 1 : 0 });
      await createAuditLog({ actorUserId: ctx.user.id, actorUsername: ctx.user.username, action: "ai.settings.update", targetType: "siteSettings", targetId: 1, metadata: { enabled: input.enabled }, req: ctx.req });
      return updated;
    }),
  }),
});

export type AppRouter = typeof appRouter;
