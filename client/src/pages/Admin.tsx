import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  ArrowRight,
  Ban,
  BarChart3,
  Bell,
  ClipboardList,
  Check,
  ChevronLeft,
  Clock3,
  FileText,
  Grid2X2,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Power,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  UserCheck,
  X,
} from "lucide-react";

const members = [
  { initials: "م ح", name: "محمد حسن", email: "mohamed@example.com", role: "عضو", tools: "١٢", status: "نشط", color: "bg-teal-100 text-teal-700" },
  { initials: "س ع", name: "سارة العتيبي", email: "sara@example.com", role: "عضو", tools: "٢٨", status: "نشط", color: "bg-orange-100 text-orange-700" },
  { initials: "ع ن", name: "عمر ناصر", email: "omar@example.com", role: "محرر", tools: "٤١", status: "نشط", color: "bg-violet-100 text-violet-700" },
  { initials: "ل م", name: "ليان محمد", email: "layan@example.com", role: "عضو", tools: "٧", status: "معلّق", color: "bg-blue-100 text-blue-700" },
  { initials: "ر ك", name: "ريم خالد", email: "reem@example.com", role: "عضو", tools: "٢١", status: "نشط", color: "bg-rose-100 text-rose-700" },
];

const sideItems = [
  { id: "overview", label: "نظرة عامة", icon: LayoutDashboard },
  { id: "members", label: "الأعضاء", icon: Users, badge: "١٬٢٨٤" },
  { id: "tools", label: "إدارة الأدوات", icon: Grid2X2 },
  { id: "messages", label: "الرسائل والدعم", icon: MessageSquare, badge: "١٢" },
  { id: "faq", label: "الأسئلة الشائعة", icon: HelpCircle },
  { id: "analytics", label: "الإحصاءات", icon: BarChart3 },
  { id: "audit", label: "سجل النشاط", icon: ClipboardList },
  { id: "settings", label: "إعدادات الموقع", icon: Settings },
];

export default function Admin() {
  const auth = useAuth();
  useEffect(() => {
    const robots = document.querySelector('meta[name="robots"]');
    robots?.setAttribute("content", "noindex,nofollow,noarchive");
    document.title = "لوحة تحكم المدير — أدواتي";
    return () => {
      robots?.setAttribute("content", "index,follow,max-image-preview:large");
      document.title = "أدواتي — منصة الأدوات اليومية";
    };
  }, []);
  const [active, setActive] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [scheduled, setScheduled] = useState(true);
  const [from, setFrom] = useState("02:00");
  const [to, setTo] = useState("04:00");
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [adsensePublisherId, setAdsensePublisherId] = useState("");
  const [searchConsoleUrl, setSearchConsoleUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberFilter, setMemberFilter] = useState<"all" | "new" | "active" | "blocked">("all");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const isAdmin = auth.user?.role === "admin";
  const membersQuery = trpc.admin.members.useQuery(undefined, { enabled: isAdmin });
  const updateMemberMutation = trpc.admin.updateMember.useMutation({ onSuccess: () => void membersQuery.refetch() });
  const notificationsQuery = trpc.admin.notifications.useQuery(undefined, { enabled: isAdmin, refetchInterval: 30000 });
  const markNotificationReadMutation = trpc.admin.markNotificationRead.useMutation({ onSuccess: () => void notificationsQuery.refetch() });
  const markAllNotificationsReadMutation = trpc.admin.markAllNotificationsRead.useMutation({ onSuccess: () => void notificationsQuery.refetch() });
  const filteredMembers = useMemo(() => {
    const now = Date.now();
    return (membersQuery.data ?? []).filter((member) => {
      const matchesQuery = `${member.name ?? ""} ${member.username ?? ""} ${member.email ?? ""}`.toLowerCase().includes(memberQuery.toLowerCase());
      const age = now - new Date(member.createdAt).getTime();
      const matchesFilter = memberFilter === "all" || (memberFilter === "new" && age <= 7 * 24 * 60 * 60 * 1000) || (memberFilter === "blocked" && Boolean(member.isBlocked)) || (memberFilter === "active" && !member.isBlocked);
      return matchesQuery && matchesFilter;
    });
  }, [memberQuery, memberFilter, membersQuery.data]);
  const siteSettingsQuery = trpc.site.settings.useQuery(undefined, { enabled: isAdmin });
  const updateSiteSettingsMutation = trpc.admin.updateSiteSettings.useMutation();
  const updateAIMutation = trpc.admin.updateAI.useMutation();

  useEffect(() => {
    if (!siteSettingsQuery.data) return;
    setMaintenanceEnabled(Boolean(siteSettingsQuery.data.maintenanceEnabled));
    setScheduled(Boolean(siteSettingsQuery.data.scheduledEnabled));
    setFrom(siteSettingsQuery.data.maintenanceFrom);
    setTo(siteSettingsQuery.data.maintenanceTo);
    setAllowRegistration(Boolean(siteSettingsQuery.data.allowRegistration));
    setAiEnabled(Boolean(siteSettingsQuery.data.aiEnabled));
    setAdsensePublisherId(siteSettingsQuery.data.adsensePublisherId ?? "");
    setSearchConsoleUrl(siteSettingsQuery.data.searchConsoleUrl ?? "");
  }, [siteSettingsQuery.data]);

  if (auth.loading) return <div className="admin-loading" dir="rtl"><div className="loading-orb" /><p>جارٍ التحقق من صلاحيات المدير...</p></div>;
  if (!auth.user) return <AccessGate title="سجّل الدخول للمتابعة" body="لوحة التحكم متاحة للمديرين المصرّح لهم فقط. استخدم حساب المدير المحلي للمتابعة." action="تسجيل الدخول" onAction={() => { window.location.href = "/?auth=login"; }} />;
  if (!isAdmin) return <AccessGate title="ليس لديك صلاحية كافية" body="هذه الصفحة مخصصة لحساب المدير. يمكنك العودة إلى الصفحة الرئيسية واستكشاف الأدوات." action="العودة إلى الموقع" onAction={() => { window.location.href = "/"; }} />;

  const saveSettings = () => {
      updateSiteSettingsMutation.mutate({ maintenanceEnabled, scheduledEnabled: scheduled, maintenanceFrom: from, maintenanceTo: to, allowRegistration, adsensePublisherId, searchConsoleUrl }, {
      onSuccess: () => { updateAIMutation.mutate({ enabled: aiEnabled }); setSaved(true); setTimeout(() => setSaved(false), 2400); },
    });
  };

  return (
    <div className="admin-shell" dir="rtl">
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="flex items-center justify-between px-6 py-6"><Link href="/" className="flex items-center gap-3"><div className="admin-mark">أ<span /></div><div><p className="text-base font-black text-white">أدواتي</p><p className="text-[10px] font-bold tracking-[0.18em] text-emerald-300">ADMIN CONSOLE</p></div></Link><button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1 text-slate-500 lg:hidden"><X size={18} /></button></div>
        <div className="mx-5 mb-7 rounded-2xl border border-white/10 bg-white/5 p-3"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-300 font-black text-slate-950">{(auth.user.name || "م").slice(0, 1)}</div><div className="min-w-0"><p className="truncate text-xs font-extrabold text-white">{auth.user.name || "المدير"}</p><p className="mt-1 truncate text-[10px] text-slate-400">{auth.user.email || "حساب المدير"}</p></div><ShieldCheck className="mr-auto shrink-0 text-emerald-300" size={15} /></div></div>
        <p className="px-7 text-[10px] font-black tracking-[0.18em] text-slate-500">الإدارة</p>
        <nav className="mt-3 space-y-1 px-3">{sideItems.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => { setActive(item.id); setSidebarOpen(false); }} className={`admin-nav-item ${active === item.id ? "active" : ""}`}><Icon size={17} /><span>{item.label}</span>{item.badge && <span className="mr-auto rounded-full bg-white/10 px-2 py-0.5 text-[9px] text-slate-300">{item.badge}</span>}</button>; })}</nav>
        <div className="mt-auto px-5 pb-6"><div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4"><div className="flex items-center gap-2 text-xs font-black text-emerald-300"><Activity size={15} /> حالة الموقع</div><div className="mt-3 flex items-center justify-between"><span className="text-xs text-slate-300">يعمل بشكل طبيعي</span><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" /></div></div><button onClick={() => void auth.logout()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-slate-400 transition hover:bg-white/5 hover:text-white"><LogOut size={16} /> تسجيل الخروج</button></div>
      </aside>
      {sidebarOpen && <button onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" aria-label="إغلاق القائمة" />}

      <main className="admin-main">
        <header className="admin-topbar"><button onClick={() => setSidebarOpen(true)} className="rounded-xl p-2 text-slate-500 lg:hidden"><Menu size={21} /></button><div className="hidden items-center gap-2 text-xs font-bold text-slate-400 sm:flex"><Link href="/" className="transition hover:text-emerald-700">الموقع العام</Link><ChevronLeft size={14} /><span className="text-slate-700">لوحة التحكم</span></div><div className="relative mr-auto flex items-center gap-3"><button onClick={() => setNotificationsOpen((open) => !open)} className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100" aria-label="الإشعارات"><Bell size={19} />{Boolean(notificationsQuery.data?.unreadCount) && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-orange-500 px-1.5 py-0.5 text-center text-[9px] font-black text-white">{notificationsQuery.data?.unreadCount}</span>}</button>{notificationsOpen && <NotificationsPanel items={notificationsQuery.data?.items ?? []} unreadCount={notificationsQuery.data?.unreadCount ?? 0} onRead={(id) => markNotificationReadMutation.mutate({ id })} onReadAll={() => markAllNotificationsReadMutation.mutate()} /> }<div className="hidden h-7 w-px bg-slate-200 sm:block" /><div className="flex items-center gap-2"><div className="hidden text-left sm:block"><p className="text-xs font-black text-slate-800">{auth.user.name || "المدير"}</p><p className="text-[10px] text-slate-400">مدير النظام</p></div><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">{(auth.user.name || "م").slice(0, 1)}</div></div></div></header>
        <div className="admin-content">
          {active === "overview" && <Overview onNavigate={setActive} />}
          {active === "members" && <Members currentUserId={auth.user.id} query={memberQuery} setQuery={setMemberQuery} filter={memberFilter} setFilter={setMemberFilter} data={filteredMembers} loading={membersQuery.isLoading} updatingId={updateMemberMutation.isPending ? updateMemberMutation.variables?.id : null} onUpdate={(id, role, isBlocked) => updateMemberMutation.mutate({ id, role, isBlocked })} />}
          {active === "tools" && <ToolsManager />}
          {active === "messages" && <Messages />}
          {active === "faq" && <FaqManager />}
          {active === "analytics" && <Analytics />}
          {active === "audit" && <AuditLog />}
          {active === "settings" && <SettingsPanel maintenanceEnabled={maintenanceEnabled} setMaintenanceEnabled={setMaintenanceEnabled} scheduled={scheduled} setScheduled={setScheduled} from={from} setFrom={setFrom} to={to} setTo={setTo} allowRegistration={allowRegistration} setAllowRegistration={setAllowRegistration} aiEnabled={aiEnabled} setAiEnabled={setAiEnabled} adsensePublisherId={adsensePublisherId} setAdsensePublisherId={setAdsensePublisherId} searchConsoleUrl={searchConsoleUrl} setSearchConsoleUrl={setSearchConsoleUrl} onSave={saveSettings} saved={saved} saving={updateSiteSettingsMutation.isPending || updateAIMutation.isPending} />}
        </div>
      </main>
    </div>
  );
}

function NotificationsPanel({ items, unreadCount, onRead, onReadAll }: { items: Array<{ id: number; type: "new_member" | "traffic_spike" | "system"; title: string; body: string; isRead: number; createdAt: Date | string }>; unreadCount: number; onRead: (id: number) => void; onReadAll: () => void }) {
  return <div className="absolute left-0 top-12 z-50 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-slate-200 bg-white text-right shadow-2xl" dir="rtl"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><p className="text-xs font-black text-slate-900">الإشعارات</p><p className="mt-1 text-[10px] text-slate-400">{unreadCount ? `${unreadCount} غير مقروءة` : "كل الإشعارات مقروءة"}</p></div>{unreadCount > 0 && <button onClick={onReadAll} className="text-[10px] font-black text-teal-700 hover:text-teal-900">تعليم الكل كمقروء</button>}</div><div className="max-h-[360px] overflow-y-auto">{items.length === 0 ? <div className="px-4 py-10 text-center text-xs font-bold text-slate-400">لا توجد إشعارات حتى الآن.</div> : items.map((item) => <button key={item.id} onClick={() => item.isRead ? undefined : onRead(item.id)} className={`flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-right transition hover:bg-slate-50 ${item.isRead ? "opacity-60" : "bg-amber-50/40"}`}><span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.type === "traffic_spike" ? "bg-orange-100 text-orange-600" : "bg-teal-100 text-teal-700"}`}><Bell size={15} /></span><span className="min-w-0"><span className="block text-xs font-black text-slate-800">{item.title}</span><span className="mt-1 block text-[10px] leading-5 text-slate-500">{item.body}</span><span className="mt-1 block text-[9px] font-bold text-slate-400">{new Date(item.createdAt).toLocaleString("ar-SA")}</span></span>{!item.isRead && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-orange-500" />}</button>)}</div></div>;
}

function Overview({ onNavigate }: { onNavigate: (id: string) => void }) {
  return <>
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="admin-kicker">الأحد، ١٥ نوفمبر ٢٠٢٦</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">صباح الخير، مدير.</h1><p className="mt-2 text-sm text-slate-500">هذه لمحة سريعة عمّا يحدث في «أدواتي» اليوم.</p></div><button onClick={() => onNavigate("settings")} className="admin-action"><Settings size={16} /> إعدادات الموقع</button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><AdminStat label="إجمالي الأعضاء" value="١٬٢٨٤" change="+١٢.٨٪" icon={Users} color="teal" /><AdminStat label="استخدامات هذا الشهر" value="٤٢٬٨٦٠" change="+٨.٤٪" icon={BarChart3} color="blue" /><AdminStat label="الأدوات النشطة" value="١٨" change="مستقرة" icon={Grid2X2} color="orange" /><AdminStat label="رسائل جديدة" value="١٢" change="تحتاج مراجعة" icon={MessageSquare} color="violet" /></div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]"><div className="admin-card"><div className="mb-6 flex items-center justify-between"><div><h2 className="admin-card-title">الاستخدام الأسبوعي</h2><p className="admin-card-subtitle">عدد مرات تشغيل الأدوات خلال آخر ٧ أيام</p></div><select className="admin-select"><option>آخر ٧ أيام</option><option>آخر ٣٠ يومًا</option></select></div><div className="chart-area"><div className="chart-y"><span>١٠K</span><span>٧.٥K</span><span>٥K</span><span>٢.٥K</span><span>٠</span></div><div className="chart-bars">{[{ d: "سبت", v: 42 }, { d: "أحد", v: 58 }, { d: "اثن", v: 46 }, { d: "ثلا", v: 72 }, { d: "أرب", v: 64 }, { d: "خمي", v: 87 }, { d: "جمع", v: 96 }].map((bar) => <div key={bar.d} className="chart-column"><div className="chart-bar" style={{ height: `${bar.v}%` }}><span>{(bar.v * 103).toLocaleString("ar-SA")}</span></div><small>{bar.d}</small></div>)}</div></div></div><div className="admin-card"><div className="mb-6 flex items-center justify-between"><div><h2 className="admin-card-title">الأدوات الأكثر استخدامًا</h2><p className="admin-card-subtitle">هذا الشهر</p></div><button onClick={() => onNavigate("tools")} className="text-xs font-black text-teal-700">عرض الكل</button></div><div className="space-y-4">{[{ name: "عداد الكلمات", value: "٨٬٤٢١", width: "91%", color: "bg-teal-600" }, { name: "ضغط الصور", value: "٦٬٨٧٠", width: "74%", color: "bg-orange-500" }, { name: "مولد QR", value: "٥٬٩٣٢", width: "63%", color: "bg-violet-500" }, { name: "النسبة والخصومات", value: "٤٬٨١٠", width: "51%", color: "bg-blue-500" }].map((item, index) => <div key={item.name}><div className="mb-2 flex items-center justify-between text-xs"><span className="flex items-center gap-2 font-bold text-slate-700"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-[10px] font-black text-slate-500">{index + 1}</span>{item.name}</span><span className="font-mono font-bold text-slate-400">{item.value}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.color}`} style={{ width: item.width }} /></div></div>)}</div></div></div>
    <div className="mt-6 grid gap-6 xl:grid-cols-2"><div className="admin-card"><div className="mb-5 flex items-center justify-between"><div><h2 className="admin-card-title">آخر الأعضاء</h2><p className="admin-card-subtitle">أحدث الحسابات المسجلة</p></div><button onClick={() => onNavigate("members")} className="text-xs font-black text-teal-700">إدارة الأعضاء</button></div>{members.slice(0, 4).map((member) => <div key={member.email} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0"><div className={`flex h-9 w-9 items-center justify-center rounded-xl text-[10px] font-black ${member.color}`}>{member.initials}</div><div className="min-w-0"><p className="text-xs font-extrabold text-slate-800">{member.name}</p><p className="mt-1 truncate text-[10px] text-slate-400">{member.email}</p></div><span className="mr-auto text-[10px] font-bold text-slate-400">منذ {member.tools} أداة</span></div>)}</div><div className="admin-card"><div className="mb-5 flex items-center justify-between"><div><h2 className="admin-card-title">تنبيهات الإدارة</h2><p className="admin-card-subtitle">ما يحتاج انتباهك</p></div><Bell size={17} className="text-orange-500" /></div><div className="space-y-3"><Notice icon={MessageSquare} title="١٢ رسالة جديدة" body="رسائل دعم تنتظر الرد" tone="orange" onClick={() => onNavigate("messages")} /><Notice icon={Clock3} title="نافذة صيانة مجدولة" body="اليوم من ٠٢:٠٠ إلى ٠٤:٠٠" tone="blue" onClick={() => onNavigate("settings")} /><Notice icon={ShieldCheck} title="كل الأنظمة تعمل" body="لا توجد مشاكل معروفة حاليًا" tone="teal" /></div></div></div>
  </>;
}

function AdminStat({ label, value, change, icon: Icon, color }: { label: string; value: string; change: string; icon: any; color: string }) { return <div className="admin-card"><div className="flex items-start justify-between"><span className={`admin-stat-icon ${color}`}><Icon size={18} /></span><span className={`text-[10px] font-black ${change.includes("٪") ? "text-emerald-600" : "text-slate-400"}`}>{change}</span></div><p className="mt-5 text-2xl font-black tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs font-bold text-slate-400">{label}</p></div>; }
function Notice({ icon: Icon, title, body, tone, onClick }: { icon: any; title: string; body: string; tone: string; onClick?: () => void }) { return <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-right transition hover:border-slate-200 hover:bg-white"><span className={`admin-notice-icon ${tone}`}><Icon size={16} /></span><span><span className="block text-xs font-black text-slate-800">{title}</span><span className="mt-1 block text-[10px] text-slate-400">{body}</span></span><ArrowRight className="mr-auto rotate-180 text-slate-300" size={15} /></button>; }

function Members({ currentUserId, query, setQuery, filter, setFilter, data, loading, updatingId, onUpdate }: { currentUserId: number; query: string; setQuery: (value: string) => void; filter: "all" | "new" | "active" | "blocked"; setFilter: (value: "all" | "new" | "active" | "blocked") => void; data: Array<{ id: number; username: string | null; name: string | null; email: string | null; role: "user" | "editor" | "admin"; isBlocked: number; createdAt: Date | string }>; loading: boolean; updatingId: number | null | undefined; onUpdate: (id: number, role: "user" | "editor" | "admin", isBlocked: boolean) => void }) {
  const roleLabel = (role: "user" | "editor" | "admin") => role === "admin" ? "مدير" : role === "editor" ? "محرر" : "عضو";
  return <Section title="إدارة الأعضاء" subtitle="استعرض الأعضاء الجدد، عدّل الصلاحيات، واحظر أو فك حظر الحسابات مباشرة.">
    <div className="admin-card">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="relative w-full max-w-xs"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو اسم المستخدم..." className="admin-input pr-10" /></div>
        <div className="flex flex-wrap gap-2">{([["all", "كل الأعضاء"], ["new", "جدد خلال ٧ أيام"], ["active", "نشطون"], ["blocked", "محظورون"]] as const).map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`category-chip ${filter === value ? "active" : ""}`}>{label}</button>)}</div>
      </div>
      {loading ? <div className="py-16 text-center text-sm font-bold text-slate-400">جارٍ تحميل الأعضاء...</div> : data.length === 0 ? <div className="py-16 text-center text-sm font-bold text-slate-400">لا توجد حسابات مطابقة لهذا الفلتر.</div> : <div className="overflow-x-auto"><table className="admin-table"><thead><tr><th>العضو</th><th>تاريخ التسجيل</th><th>الصلاحية</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>{data.map((member) => { const busy = updatingId === member.id; const isSelf = member.id === currentUserId; return <tr key={member.id}><td><div className="flex items-center gap-3"><div className={`flex h-9 w-9 items-center justify-center rounded-xl text-[10px] font-black ${member.isBlocked ? "bg-slate-100 text-slate-400" : "bg-teal-100 text-teal-700"}`}>{(member.name || member.username || "ع").slice(0, 2)}</div><div><p className="text-xs font-extrabold text-slate-800">{member.name || "بدون اسم"}</p><p className="mt-1 text-[10px] text-slate-400">@{member.username || "oauth"}{member.email ? ` · ${member.email}` : ""}</p></div></div></td><td className="text-xs text-slate-500">{new Date(member.createdAt).toLocaleDateString("ar-SA")}</td><td><select value={member.role} disabled={busy || isSelf} onChange={(event) => onUpdate(member.id, event.target.value as "user" | "editor" | "admin", Boolean(member.isBlocked))} className="admin-select text-[10px]"><option value="user">{roleLabel("user")}</option><option value="editor">{roleLabel("editor")}</option><option value="admin">{roleLabel("admin")}</option></select></td><td><span className={`inline-flex items-center gap-1 text-[10px] font-black ${member.isBlocked ? "text-rose-600" : "text-emerald-600"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{member.isBlocked ? "محظور" : "نشط"}</span></td><td><button disabled={busy || isSelf} onClick={() => onUpdate(member.id, member.role, !Boolean(member.isBlocked))} className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-[10px] font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${member.isBlocked ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-rose-200 text-rose-600 hover:bg-rose-50"}`}>{member.isBlocked ? <UserCheck size={14} /> : <Ban size={14} />}{member.isBlocked ? "فك الحظر" : "حظر"}</button></td></tr>; })}</tbody></table></div>}
    </div>
  </Section>;
}

function ToolsManager() { return <Section title="إدارة الأدوات" subtitle="تحكم في ظهور الأدوات وترتيبها وحالتها."><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{["عداد الكلمات", "ضغط الصور", "مولد QR", "النسبة والخصومات", "محول العملات", "منشئ السيرة الذاتية"].map((name, index) => <div key={name} className="admin-card"><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Grid2X2 size={18} /></span><span className="flex items-center gap-1 text-[10px] font-black text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-current" /> نشطة</span></div><h3 className="mt-5 text-sm font-black text-slate-900">{name}</h3><p className="mt-1 text-xs leading-6 text-slate-400">واجهة أداة متاحة للزوار مع تشغيل من جهة العميل.</p><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-[10px] font-bold text-slate-400">{(index + 4) * 1270} استخدام</span><button className="text-[10px] font-black text-teal-700">تعديل</button></div></div>)}</div></Section>; }
function Messages() { return <Section title="الرسائل والدعم" subtitle="راجع استفسارات الزوار وتابع الردود."><div className="admin-card divide-y divide-slate-100">{["اقتراح إضافة محول التاريخ الهجري", "مشكلة في تحميل ملف PDF", "شكرًا على أداة عداد الكلمات", "هل يمكن إضافة وضع ليلي؟"].map((message, index) => <div key={message} className="flex items-center gap-4 py-4"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${index === 1 ? "bg-orange-50 text-orange-600" : "bg-teal-50 text-teal-700"}`}><MessageSquare size={18} /></span><div><p className="text-xs font-black text-slate-800">{message}</p><p className="mt-1 text-[10px] text-slate-400">منذ {index + 1} ساعة · {index === 1 ? "تحتاج ردًا" : "مفتوحة"}</p></div><button className="mr-auto rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-600 hover:border-teal-300 hover:text-teal-700">فتح الرسالة</button></div>)}</div></Section>; }
function FaqManager() { return <Section title="الأسئلة الشائعة" subtitle="حرر الإجابات التي تظهر للزوار."><div className="space-y-3">{["هل استخدام الأدوات مجاني؟", "هل تحفظون ملفاتي أو نصوصي؟", "هل أحتاج إلى إنشاء حساب؟", "كيف أتواصل مع الدعم؟"].map((question, index) => <div key={question} className="admin-card flex items-center gap-4"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-500">٠{index + 1}</span><div><p className="text-sm font-black text-slate-800">{question}</p><p className="mt-1 text-xs text-slate-400">إجابة منشورة للزوار</p></div><button className="mr-auto rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-600">تعديل</button></div>)}</div></Section>; }
function Analytics() {
  const query = trpc.admin.analytics.useQuery();
  const stats = query.data;
  return <Section title="الإحصاءات العامة" subtitle="مؤشرات حية مبنية على زيارات الموقع ونشاط الأعضاء.">
    <div className="grid gap-4 sm:grid-cols-3">
      <AdminStat label="إجمالي الزيارات" value={query.isLoading ? "—" : Number(stats?.visitsTotal ?? 0).toLocaleString("ar-SA")} change="منذ إطلاق الموقع" icon={Activity} color="teal" />
      <AdminStat label="الأعضاء النشطون" value={query.isLoading ? "—" : Number(stats?.activeMembers ?? 0).toLocaleString("ar-SA")} change="آخر ٣٠ يومًا" icon={Users} color="blue" />
      <AdminStat label="أعضاء جدد" value={query.isLoading ? "—" : Number(stats?.newMembers ?? 0).toLocaleString("ar-SA")} change="آخر ٧ أيام" icon={BarChart3} color="violet" />
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
      <div className="admin-card"><div className="flex items-start gap-3"><span className="admin-stat-icon teal"><Activity size={18} /></span><div><h2 className="admin-card-title">كيف تُحسب المؤشرات؟</h2><p className="admin-card-subtitle mt-2 leading-7">تُسجّل الزيارة عند فتح الصفحة العامة، بينما يُحسب العضو النشط إذا سجّل دخوله خلال آخر ٣٠ يومًا ولم يكن محظورًا.</p></div></div></div>
      <div className="admin-card"><h2 className="admin-card-title">حالة جمع البيانات</h2><div className="mt-5 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /><div><p className="text-xs font-black text-emerald-800">التتبع يعمل</p><p className="mt-1 text-[10px] text-emerald-700">يتم تحديث الزيارات عند فتح الموقع.</p></div></div></div>
    </div>
  </Section>;
}

function AuditLog() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const query = trpc.admin.auditLogs.useQuery({ search: search || undefined, action: action === "all" ? undefined : action });
  const actionLabel = (value: string) => ({ "auth.login": "تسجيل دخول", "auth.logout": "تسجيل خروج", "member.register": "تسجيل عضو", "member.block": "حظر عضو", "member.unblock": "فك حظر عضو", "site.settings.update": "تعديل إعدادات الموقع" }[value] ?? value);
  return <Section title="سجل النشاط" subtitle="مراجعة تحركات الأعضاء والأدمن والعمليات الحساسة داخل الموقع.">
    <div className="admin-card"><div className="mb-6 flex flex-col gap-4 sm:flex-row"><div className="relative w-full max-w-sm"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث باسم المستخدم..." className="admin-input pr-10" /></div><select value={action} onChange={(event) => setAction(event.target.value)} className="admin-select"><option value="all">كل العمليات</option><option value="auth.login">تسجيل الدخول</option><option value="auth.logout">تسجيل الخروج</option><option value="member.register">تسجيل عضو</option><option value="member.block">حظر عضو</option><option value="member.unblock">فك حظر عضو</option><option value="site.settings.update">تعديل إعدادات الموقع</option></select></div>{query.isLoading ? <div className="py-16 text-center text-sm font-bold text-slate-400">جارٍ تحميل السجل...</div> : query.data?.length ? <div className="overflow-x-auto"><table className="admin-table"><thead><tr><th>الوقت</th><th>المستخدم</th><th>العملية</th><th>الهدف</th><th>عنوان IP</th></tr></thead><tbody>{query.data.map((log) => <tr key={log.id}><td className="whitespace-nowrap text-[10px] text-slate-500">{new Date(log.createdAt).toLocaleString("ar-SA")}</td><td><span className="text-xs font-black text-slate-800">{log.actorUsername || "زائر"}</span></td><td><span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-black text-teal-700">{actionLabel(log.action)}</span></td><td className="text-xs text-slate-500">{log.targetType ? `${log.targetType}${log.targetId ? ` #${log.targetId}` : ""}` : "—"}</td><td className="font-mono text-[10px] text-slate-400">{log.ipAddress || "غير متاح"}</td></tr>)}</tbody></table></div> : <div className="py-16 text-center text-sm font-bold text-slate-400">لا توجد أنشطة مطابقة.</div>}</div>
  </Section>;
}

function SettingsPanel({ maintenanceEnabled, setMaintenanceEnabled, scheduled, setScheduled, from, setFrom, to, setTo, allowRegistration, setAllowRegistration, aiEnabled, setAiEnabled, adsensePublisherId, setAdsensePublisherId, searchConsoleUrl, setSearchConsoleUrl, onSave, saved, saving }: { maintenanceEnabled: boolean; setMaintenanceEnabled: (value: boolean) => void; scheduled: boolean; setScheduled: (value: boolean) => void; from: string; setFrom: (value: string) => void; to: string; setTo: (value: string) => void; allowRegistration: boolean; setAllowRegistration: (value: boolean) => void; aiEnabled: boolean; setAiEnabled: (value: boolean) => void; adsensePublisherId: string; setAdsensePublisherId: (value: string) => void; searchConsoleUrl: string; setSearchConsoleUrl: (value: string) => void; onSave: () => void; saved: boolean; saving: boolean }) { return <Section title="إعدادات الموقع" subtitle="تحكم في حالة الموقع، الساعات، والرسائل العامة."><div className="grid gap-6 xl:grid-cols-[1fr_0.78fr]"><div className="space-y-6"><div className="admin-card"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Power size={18} className="text-orange-500" /><h2 className="admin-card-title">وضع تعطيل الموقع</h2></div><p className="admin-card-subtitle mt-2 max-w-lg">عند التفعيل، تظهر للزوار صفحة صيانة بدل محتوى الموقع. حسابات المديرين تبقى قادرة على الدخول.</p></div><button onClick={() => setMaintenanceEnabled(!maintenanceEnabled)} className={`toggle ${maintenanceEnabled ? "on" : ""}`} aria-label="تفعيل تعطيل الموقع"><span /></button></div><div className={`mt-6 rounded-2xl border p-4 ${maintenanceEnabled ? "border-orange-200 bg-orange-50" : "border-emerald-100 bg-emerald-50"}`}><div className="flex items-center gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${maintenanceEnabled ? "bg-orange-500 text-white" : "bg-emerald-500 text-white"}`}>{maintenanceEnabled ? <Power size={17} /> : <Check size={17} />}</span><div><p className={`text-xs font-black ${maintenanceEnabled ? "text-orange-800" : "text-emerald-800"}`}>{maintenanceEnabled ? "الموقع في وضع التعطيل" : "الموقع يعمل بشكل طبيعي"}</p><p className="mt-1 text-[10px] text-slate-500">{maintenanceEnabled ? "لن يتمكن الزوار من استخدام الأدوات." : "جميع الأدوات متاحة للزوار الآن."}</p></div></div></div></div><div className="admin-card"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Clock3 size={18} className="text-teal-700" /><h2 className="admin-card-title">جدولة التعطيل بالساعات</h2></div><p className="admin-card-subtitle mt-2">اختر نافذة يومية يتوقف خلالها الموقع تلقائيًا.</p></div><button onClick={() => setScheduled(!scheduled)} className={`toggle ${scheduled ? "on" : ""}`} aria-label="تفعيل الجدولة"><span /></button></div>{scheduled && <div className="mt-6 grid gap-4 sm:grid-cols-2"><label><span className="admin-label">يبدأ التعطيل</span><input type="time" value={from} onChange={(event) => setFrom(event.target.value)} className="admin-input" /></label><label><span className="admin-label">ينتهي التعطيل</span><input type="time" value={to} onChange={(event) => setTo(event.target.value)} className="admin-input" /></label><div className="sm:col-span-2 rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-500"><span className="font-black text-slate-800">المعاينة:</span> سيتم تعطيل الموقع يوميًا من <strong className="text-teal-700">{from}</strong> إلى <strong className="text-teal-700">{to}</strong> حسب توقيت الخادم.</div></div>}</div><button disabled={saving} onClick={onSave} className="admin-action w-full justify-center disabled:cursor-wait disabled:opacity-60">{saved ? <><Check size={16} /> تم حفظ الإعدادات</> : saving ? "جارٍ الحفظ..." : <>حفظ تغييرات الموقع <SlidersHorizontal size={16} /></>}</button></div><div className="admin-card h-fit"><div className="flex items-center gap-2"><Sparkles size={18} className="text-teal-700" /><h2 className="admin-card-title">التحقق من Google AdSense</h2></div><p className="admin-card-subtitle mt-2 leading-6">اترك الحقل فارغًا حتى تجهز معرّف الناشر. لن يتم عرض أي إعلانات من هذا الحقل.</p><label className="mt-5 block"><span className="admin-label">معرّف الناشر</span><input value={adsensePublisherId} onChange={(event) => setAdsensePublisherId(event.target.value)} className="admin-input" placeholder="pub-xxxxxxxxxxxxxxxx" inputMode="numeric" /></label><div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="text-[11px] leading-6 text-blue-800">يُحفظ المعرّف لإكمال التحقق لاحقًا فقط، ولا توجد وحدات إعلانية مفعّلة حاليًا.</p></div><label className="mt-5 block"><span className="admin-label">رابط Google Search Console</span><input value={searchConsoleUrl} onChange={(event) => setSearchConsoleUrl(event.target.value)} className="admin-input" placeholder="https://search.google.com/search-console" dir="ltr" /></label><p className="mt-2 text-[10px] leading-5 text-slate-400">احفظ رابط الملكية أو صفحة الموقع في Search Console للرجوع إليه من لوحة الإدارة.</p></div><div className="admin-card h-fit"><div className="flex items-center gap-2"><Sparkles size={18} className="text-teal-700" /><h2 className="admin-card-title">إعدادات سريعة</h2></div><div className="mt-5 space-y-3">{[{ label: "السماح بتسجيل أعضاء جدد", on: allowRegistration, action: () => setAllowRegistration(!allowRegistration) }, { label: "مساعد الذكاء الاصطناعي", on: aiEnabled, action: () => setAiEnabled(!aiEnabled) }, { label: "إظهار الأدوات الجديدة", on: true }, { label: "رسائل الدعم للمدير", on: true }, { label: "تفعيل الدردشة المباشرة", on: false }].map((item) => <button key={item.label} onClick={item.action} className="flex w-full items-center justify-between rounded-2xl bg-slate-50 p-4 text-right"><span className="text-xs font-bold text-slate-700">{item.label}</span><span className={`toggle scale-75 ${item.on ? "on" : ""}`}><span /></span></button>)}</div><div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4"><div className="flex items-start gap-3"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-blue-600" /><p className="text-[11px] leading-6 text-blue-800">صلاحيات المدير محمية من الخادم. لا يمكن لعضو عادي الوصول إلى هذه الإعدادات حتى لو عرف الرابط.</p></div></div></div></div></Section>; }

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) { return <><div className="mb-8"><p className="admin-kicker">وحدة الإدارة</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{title}</h1><p className="mt-2 text-sm text-slate-500">{subtitle}</p></div>{children}</>; }
function AccessGate({ title, body, action, onAction }: { title: string; body: string; action: string; onAction: () => void }) { return <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7] p-5" dir="rtl"><div className="w-full max-w-md rounded-[30px] border border-slate-200 bg-white p-8 text-center shadow-[0_22px_70px_rgba(15,23,42,0.1)]"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-3xl font-black text-white">أ<span className="absolute mt-9 ml-7 h-1.5 w-1.5 rounded-full bg-orange-400" /></div><h1 className="mt-6 text-2xl font-black text-slate-950">{title}</h1><p className="mt-3 text-sm leading-7 text-slate-500">{body}</p><button onClick={onAction} className="action-button mt-7 w-full justify-center">{action} <ArrowRight size={16} /></button><Link href="/" className="mt-4 block text-xs font-bold text-slate-400 hover:text-teal-700">العودة إلى أدواتي</Link></div></div>; }
