import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { User } from "../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { createAuditLog, createImprovementReport, createLocalUser, createNotification, createToolProposal, getAnalyticsSummary, getImprovementReportById, getMemberProfile, getSiteSettings, getToolUsageSummary, getUserByUsername, isSiteMaintenanceActive, listAuditLogs, listImprovementReports, listNotifications, listToolProposals, listUsers, markAllNotificationsRead, markNotificationRead, recordSiteVisit, recordToolUsage, reviewToolProposal, setFeaturedTool, updateImprovementReportStatus, updateSiteSettings, updateUserAccess, upsertMemberProfile } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { ADMIN_USERNAME, clearLocalSession, ensureAdminUser, hashPassword, isAdminLogin, setLocalSession, verifyPassword } from "./_core/localAuth";
import { sendOwnerNotification } from "./_core/ownerNotifications";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storageGetSignedUrl, storagePut } from "./storage";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const usernamePattern = /^[a-zA-Z0-9_]{3,32}$/;

async function inspectGithubRepository(url: string) {
  const match = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/#?]+)\/?$/i);
  if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "أدخل رابط مستودع GitHub عامًا بصيغة https://github.com/owner/repository" });
  const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(match[1])}/${encodeURIComponent(match[2])}`, { headers: { Accept: "application/vnd.github+json", "User-Agent": "Adawati-Security-Review" } });
  if (!response.ok) throw new TRPCError({ code: response.status === 404 ? "NOT_FOUND" : "BAD_REQUEST", message: "تعذر قراءة المستودع العام أو أنه غير موجود" });
  const data = await response.json() as { name?: string; full_name?: string; description?: string; html_url?: string; default_branch?: string; archived?: boolean; license?: { spdx_id?: string } | null; topics?: string[]; stargazers_count?: number };
  return { owner: match[1], repository: match[2], name: data.name ?? match[2], fullName: data.full_name ?? `${match[1]}/${match[2]}`, description: data.description ?? "لا يوجد وصف", url: data.html_url ?? url, branch: data.default_branch ?? "main", archived: Boolean(data.archived), license: data.license?.spdx_id ?? "غير محدد", topics: data.topics ?? [], stars: data.stargazers_count ?? 0 };
}

async function runProposalSecurityReview(input: { title: string; description: string; category: string; sourceType: "idea" | "github"; github?: Awaited<ReturnType<typeof inspectGithubRepository>> }) {
  const source = input.github ? `مستودع GitHub: ${JSON.stringify(input.github)}` : "فكرة جديدة دون مستودع";
  try {
    const result = await invokeLLM({ model: "gpt-6.1-sol", reasoning: { effort: "low" }, maxTokens: 1100, messages: [
      { role: "system", content: "أنت مراجع أمن برمجي لمنصة أدواتي. راجع طلب أداة قبل أن يراه المدير. لا تشغّل كودًا ولا تعتبر المستودع آمنًا لمجرد أن GitHub قرأ بياناته. اذكر المخاطر المحتملة، ما يحتاج فحصًا يدويًا، واقترح قرارًا. اكتب في أول سطر RISK_SCORE: رقم من 0 إلى 100، حيث 100 خطر مرتفع." },
      { role: "user", content: `العنوان: ${input.title}\nالوصف: ${input.description}\nالفئة: ${input.category}\nالمصدر: ${input.sourceType}\n${source}` },
    ] });
    const content = result.choices?.[0]?.message?.content;
    const text = Array.isArray(content) ? content.map((part) => part.type === "text" ? part.text : "").join("") : content ?? "";
    const score = Number(text.match(/RISK_SCORE\s*:\s*(\d{1,3})/i)?.[1] ?? 35);
    return { text: text || "RISK_SCORE: 35\nلم تُرجع خدمة الفحص تقريرًا مفصلًا؛ يلزم فحص يدوي قبل الدمج.", score: Math.min(100, Math.max(0, score)) };
  } catch (error) {
    console.warn("[Proposal Review] AI unavailable:", error instanceof Error ? error.message : error);
    return { text: "RISK_SCORE: 60\nتعذر تشغيل الفحص الآلي الآن. لا تنشر الطلب قبل مراجعة المدير وفحص المصدر يدويًا.", score: 60 };
  }
}

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
  voice: router({
    transcribe: protectedProcedure.input(z.object({
      dataUrl: z.string().min(20).max(23_000_000),
      fileName: z.string().max(180),
      mimeType: z.string().regex(/^audio\//),
      language: z.string().regex(/^[a-z]{2}$/).default("ar"),
    })).mutation(async ({ input }) => {
      const match = input.dataUrl.match(/^data:[^;]+;base64,(.+)$/);
      if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "ملف الصوت غير صالح" });
      const buffer = Buffer.from(match[1], "base64");
      if (buffer.length > 16 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "الحد الأقصى للصوت 16 ميجابايت" });
      const stored = await storagePut(`audio/${Date.now()}-${input.fileName.replace(/[^a-z0-9._-]/gi, "-")}`, buffer, input.mimeType);
      const signedUrl = await storageGetSignedUrl(stored.key);
      const result = await transcribeAudio({ audioUrl: signedUrl, language: input.language, prompt: "اكتب التفريغ باللغة العربية مع علامات ترقيم واضحة، وحافظ على أسماء الأشخاص والمصطلحات كما نُطقت." });
      if ("error" in result) throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
      return { text: result.text, language: result.language, duration: result.duration };
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
  member: router({
    profile: protectedProcedure.query(({ ctx }) => getMemberProfile(ctx.user.id)),
    updateProfile: protectedProcedure.input(z.object({ displayName: z.string().max(120).optional(), bio: z.string().max(2000).optional(), website: z.string().url().max(512).optional().or(z.literal("")), githubUsername: z.string().max(120).optional() })).mutation(async ({ input, ctx }) => {
      const profile = await upsertMemberProfile(ctx.user.id, input);
      await createAuditLog({ actorUserId: ctx.user.id, actorUsername: ctx.user.username, action: "member.profile.update", targetType: "memberProfile", targetId: ctx.user.id, req: ctx.req });
      return profile;
    }),
    proposals: protectedProcedure.query(({ ctx }) => listToolProposals(ctx.user.id)),
    createProposal: protectedProcedure.input(z.object({ title: z.string().min(3).max(160), description: z.string().min(20).max(5000), category: z.string().min(2).max(80), sourceType: z.enum(["idea", "github"]), githubUrl: z.string().url().max(512).optional().or(z.literal("")) })).mutation(async ({ input, ctx }) => {
      if (input.sourceType === "github" && !input.githubUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "أضف رابط GitHub قبل الفحص" });
      const github = input.sourceType === "github" && input.githubUrl ? await inspectGithubRepository(input.githubUrl) : undefined;
      const review = await runProposalSecurityReview({ ...input, github });
      const slug = `${input.title.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}-${Date.now().toString(36)}`;
      const proposal = await createToolProposal({ memberId: ctx.user.id, title: input.title, slug, description: input.description, category: input.category, sourceType: input.sourceType, githubUrl: input.githubUrl || null, aiReview: review.text, aiRiskScore: review.score });
      await createNotification({ type: "system", title: "طلب أداة جديد بانتظار المدير", body: `أرسل ${ctx.user.name || ctx.user.username || "عضو"} طلب «${input.title}» مع تقرير فحص آلي أولي.` });
      await createAuditLog({ actorUserId: ctx.user.id, actorUsername: ctx.user.username, action: "tool.proposal.create", targetType: "toolProposal", targetId: proposal?.id, metadata: { sourceType: input.sourceType, riskScore: review.score }, req: ctx.req });
      return proposal;
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
        let topTool = "compress";
        try { topTool = (await getToolUsageSummary())[0]?.toolId ?? topTool; }
        catch (error) { console.warn("[AI Approval] Usage table unavailable; using safe default:", error instanceof Error ? error.message : error); }
        try {
          await setFeaturedTool(topTool);
          report = await updateImprovementReportStatus(input.id, "applied") ?? report;
          await createNotification({ type: "system", title: "تم تطبيق التحسين تلقائيًا", body: `تم إبراز أداة «${topTool}» تلقائيًا لأنها الأكثر استخدامًا. يمكن التراجع عنها من إعدادات الموقع.` });
        } catch (error) {
          console.error("[AI Approval] Safe improvement could not be applied:", error instanceof Error ? error.message : error);
          await createNotification({ type: "system", title: "تمت الموافقة ويحتاج التطبيق لإعادة المحاولة", body: `تمت الموافقة على التقرير #${input.id}، لكن تعذر تحديث إبراز الأداة. لم يتم تغيير بيانات حساسة.` });
        }
      }
      await createAuditLog({ actorUserId: ctx.user.id, actorUsername: ctx.user.username, action: `ai.report.${input.status}`, targetType: "improvementReport", targetId: input.id, req: ctx.req });
      await createNotification({ type: "system", title: input.status === "approved" ? "تمت الموافقة على تقرير التحسين" : "تم رفض تقرير التحسين", body: input.status === "approved" ? `تمت الموافقة على التقرير #${input.id} وبدأ تطبيق التحسين الآمن تلقائيًا.` : `تم رفض التقرير #${input.id}.` });
      return report;
    }),
    members: adminProcedure.query(async () => (await listUsers()).map(publicUser)),
    toolProposals: adminProcedure.query(() => listToolProposals()),
    reviewToolProposal: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["approved", "rejected", "published"]), adminNote: z.string().max(3000).optional(), revenueSharePercent: z.number().min(0).max(100).default(0) })).mutation(async ({ input, ctx }) => {
      const proposal = await reviewToolProposal(input.id, { status: input.status, adminNote: input.adminNote ?? null, revenueShareBasisPoints: Math.round(input.revenueSharePercent * 100) });
      if (!proposal) throw new TRPCError({ code: "NOT_FOUND", message: "طلب الأداة غير موجود" });
      await createNotification({ type: "system", title: `تم تحديث طلب الأداة «${proposal.title}»`, body: input.status === "approved" ? "وافق المدير على الطلب، ويحتاج الدمج النهائي مراجعة نشر منفصلة." : input.status === "published" ? "تم اعتماد الطلب للنشر بعد المراجعة." : "تم رفض الطلب مع حفظ ملاحظة المدير." });
      await createAuditLog({ actorUserId: ctx.user.id, actorUsername: ctx.user.username, action: `tool.proposal.${input.status}`, targetType: "toolProposal", targetId: input.id, metadata: { revenueSharePercent: input.revenueSharePercent, adminNote: input.adminNote }, req: ctx.req });
      return proposal;
    }),
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
