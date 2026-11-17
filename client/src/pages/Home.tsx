import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowUpLeft,
  BarChart3,
  Calculator,
  Check,
  ChevronDown,
  Clock3,
  CloudUpload,
  Code2,
  FileArchive,
  FileText,
  Filter,
  Gauge,
  Globe2,
  Hash,
  HelpCircle,
  Image as ImageIcon,
  KeyRound,
  LayoutGrid,
  Link2,
  LockKeyhole,
  Menu,
  MessageCircle,
  MonitorSmartphone,
  MousePointer2,
  Palette,
  Percent,
  QrCode,
  Search,
  Send,
  Sparkles,
  Split,
  Star,
  TextCursorInput,
  TimerReset,
  UserRound,
  X,
  Zap,
} from "lucide-react";

type Tool = {
  id: string;
  title: string;
  description: string;
  category: string;
  usage: string;
  icon: LucideIcon;
  accent: string;
  featured?: boolean;
  action?: "percent" | "words" | "password" | "qr" | "clean" | "units";
};

const categories = [
  { id: "all", label: "كل الأدوات", count: 18 },
  { id: "files", label: "ملفات وصور", count: 4 },
  { id: "calc", label: "حساب وتحويل", count: 4 },
  { id: "text", label: "نصوص ومحتوى", count: 3 },
  { id: "generate", label: "توليد سريع", count: 3 },
  { id: "tech", label: "تقنية وشبكات", count: 4 },
];

const tools: Tool[] = [
  { id: "compress", title: "ضغط الصور", description: "خفّف حجم صورك مع الحفاظ على الجودة.", category: "files", usage: "١٢.٤ ألف استخدام", icon: ImageIcon, accent: "teal", featured: true },
  { id: "convert", title: "تحويل الصور", description: "PNG وJPG وWEBP وPDF في خطوة واحدة.", category: "files", usage: "٨.٧ ألف استخدام", icon: CloudUpload, accent: "blue" },
  { id: "background", title: "إزالة الخلفية", description: "حضّر صور المنتجات والشخصية بسرعة.", category: "files", usage: "٦.٢ ألف استخدام", icon: Palette, accent: "violet" },
  { id: "pdf", title: "أدوات PDF", description: "دمج وتقسيم وضغط ملفات PDF.", category: "files", usage: "٩.١ ألف استخدام", icon: FileArchive, accent: "orange" },
  { id: "currency", title: "محول العملات", description: "حوّل بين العملات في ثوانٍ.", category: "calc", usage: "١٥.٨ ألف استخدام", icon: Globe2, accent: "green" },
  { id: "age", title: "حاسبة العمر", description: "احسب العمر والفرق بين تاريخين.", category: "calc", usage: "٧.٦ ألف استخدام", icon: Clock3, accent: "yellow" },
  { id: "percent", title: "النسبة والخصومات", description: "احسب الخصم والضريبة والزيادة.", category: "calc", usage: "١١.٣ ألف استخدام", icon: Percent, accent: "pink", action: "percent" },
  { id: "units", title: "محول الوحدات", description: "مسافة، وزن، حرارة ومساحة.", category: "calc", usage: "٥.٤ ألف استخدام", icon: Split, accent: "blue", action: "units" },
  { id: "counter", title: "عداد الكلمات", description: "اعرف عدد كلماتك وأحرفك فورًا.", category: "text", usage: "١٨.٢ ألف استخدام", icon: TextCursorInput, accent: "teal", action: "words" },
  { id: "clean", title: "تنظيف النصوص", description: "نظّف ونسّق النصوص بنقرة.", category: "text", usage: "٤.٩ ألف استخدام", icon: Sparkles, accent: "violet", action: "clean" },
  { id: "rewrite", title: "إعادة الصياغة", description: "صياغة أوضح لمحتواك اليومي.", category: "text", usage: "٣.٨ ألف استخدام", icon: FileText, accent: "orange" },
  { id: "qr", title: "مولد QR", description: "حوّل رابطك إلى رمز قابل للمسح.", category: "generate", usage: "١٠.٦ ألف استخدام", icon: QrCode, accent: "dark", action: "qr" },
  { id: "password", title: "كلمة مرور قوية", description: "أنشئ كلمة سر آمنة وعشوائية.", category: "generate", usage: "٦.٩ ألف استخدام", icon: KeyRound, accent: "green", action: "password" },
  { id: "cv", title: "منشئ السيرة الذاتية", description: "أنشئ CV مرتبًا بصيغة PDF.", category: "generate", usage: "٤.١ ألف استخدام", icon: FileText, accent: "blue" },
  { id: "speed", title: "اختبار سرعة الإنترنت", description: "اختبر جودة اتصالك الآن.", category: "tech", usage: "٧.٢ ألف استخدام", icon: Gauge, accent: "orange" },
  { id: "ip", title: "ما هو عنوان IP؟", description: "تعرف على معلومات اتصالك.", category: "tech", usage: "٣.٣ ألف استخدام", icon: MonitorSmartphone, accent: "teal" },
  { id: "shortener", title: "تقصير الروابط", description: "رابط أقصر وأسهل للمشاركة.", category: "tech", usage: "٥.٨ ألف استخدام", icon: Link2, accent: "violet" },
  { id: "json", title: "منسق JSON", description: "نسّق بيانات JSON واقرأها بسهولة.", category: "tech", usage: "٢.٧ ألف استخدام", icon: Code2, accent: "yellow" },
];

const accentClasses: Record<string, string> = {
  teal: "bg-teal-50 text-teal-700 ring-teal-100",
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
  orange: "bg-orange-50 text-orange-700 ring-orange-100",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  yellow: "bg-amber-50 text-amber-700 ring-amber-100",
  pink: "bg-rose-50 text-rose-700 ring-rose-100",
  dark: "bg-slate-100 text-slate-800 ring-slate-200",
};

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" dir="rtl">
      <div className="brand-mark relative flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_8px_20px_rgba(15,118,110,0.24)]">
        <span className="text-xl font-black leading-none">أ</span>
        <span className="absolute bottom-1 left-1 h-1.5 w-1.5 rounded-full bg-orange-400" />
      </div>
      {!compact && <div className="leading-none"><div className="text-lg font-black tracking-tight text-slate-950">أدواتي</div><div className="mt-1 text-[10px] font-bold tracking-[0.22em] text-teal-700">أنجزها ببساطة</div></div>}
    </div>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  return (
    <Link href={`/tools/${tool.id}`} className="group block text-right" dir="rtl">
      <div className="tool-card flex h-full min-h-[210px] flex-col justify-between rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-1 hover:border-teal-200 hover:shadow-[0_18px_40px_rgba(15,118,110,0.12)]">
        <div>
          <div className="mb-6 flex items-start justify-between gap-4">
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${accentClasses[tool.accent]}`}><Icon size={22} strokeWidth={1.8} /></span>
            <span className="flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-400"><Star size={11} fill="currentColor" /> {tool.usage}</span>
          </div>
          <h3 className="text-lg font-extrabold tracking-tight text-slate-950">{tool.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{tool.description}</p>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-teal-700">
          <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">افتح الأداة <ArrowLeft size={14} /></span>
          <span className="rounded-full bg-slate-50 px-2 py-1 text-slate-400">{categories.find((category) => category.id === tool.category)?.label}</span>
        </div>
      </div>
    </Link>
  );
}

function ToolWorkspace({ tool, onClose }: { tool: Tool; onClose: () => void }) {
  const [value, setValue] = useState("");
  const [second, setSecond] = useState("20");
  const [length, setLength] = useState("16");
  const [copied, setCopied] = useState(false);
  const [unit, setUnit] = useState("km");
  const [targetUnit, setTargetUnit] = useState("mile");
  const Icon = tool.icon;

  const password = useMemo(() => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    const size = Math.min(32, Math.max(8, Number(length) || 16));
    const randomValues = globalThis.crypto?.getRandomValues ? globalThis.crypto.getRandomValues(new Uint32Array(size)) : Uint32Array.from({ length: size }, () => Math.floor(Math.random() * 2 ** 32));
    return Array.from(randomValues, (randomValue) => chars[randomValue % chars.length]).join("");
  }, [length]);
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const percentResult = Number(value || 0) * (Number(second || 0) / 100);
  const cleaned = value.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const converted = unit === "km" && targetUnit === "mile" ? Number(value || 0) * 0.621371 : unit === "mile" && targetUnit === "km" ? Number(value || 0) * 1.60934 : Number(value || 0);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* clipboard can be unavailable in preview */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl overflow-hidden rounded-t-[30px] bg-white shadow-2xl sm:rounded-[30px]" dir="rtl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${accentClasses[tool.accent]}`}><Icon size={21} /></span><div><p className="text-[11px] font-bold text-teal-700">أداة مجانية من أدواتي</p><h2 className="text-xl font-black text-slate-950">{tool.title}</h2></div></div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900" aria-label="إغلاق"><X size={20} /></button>
        </div>
        <div className="space-y-5 p-6">
          {tool.action === "words" && <><textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder="الصق أو اكتب نصك هنا..." className="min-h-44 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-50" /><div className="grid grid-cols-3 gap-3"><Metric label="الكلمات" value={String(words)} /><Metric label="الأحرف" value={String(value.length)} /><Metric label="الأسطر" value={String(value ? value.split("\n").length : 0)} /></div></>}
          {tool.action === "percent" && <><div className="grid gap-4 sm:grid-cols-2"><Field label="المبلغ أو الرقم" value={value} onChange={setValue} type="number" placeholder="مثال: 500" /><Field label="النسبة %" value={second} onChange={setSecond} type="number" placeholder="20" /></div><div className="rounded-2xl bg-teal-50 p-6 text-center"><p className="text-sm font-bold text-teal-700">الناتج</p><p className="mt-2 text-4xl font-black tracking-tight text-slate-950">{percentResult.toLocaleString("ar-SA", { maximumFractionDigits: 2 })}</p><p className="mt-2 text-xs text-slate-500">{second}% من {value || "0"}</p></div></>}
          {tool.action === "password" && <><div className="rounded-2xl bg-slate-950 p-5 text-center"><p className="break-all font-mono text-xl font-bold tracking-wider text-emerald-300">{password}</p></div><div className="flex items-center justify-between gap-4"><label className="text-sm font-bold text-slate-700">طول كلمة المرور <span className="text-teal-700">{length}</span></label><input type="range" min="8" max="32" value={length} onChange={(event) => setLength(event.target.value)} className="accent-teal-700" /></div><button onClick={() => copy(password)} className="action-button w-full">{copied ? <Check size={17} /> : <LockKeyhole size={17} />} {copied ? "تم النسخ" : "نسخ كلمة المرور"}</button></>}
          {tool.action === "qr" && <><input value={value} onChange={(event) => setValue(event.target.value)} placeholder="https://example.com" className="input-field" /><div className="flex flex-col items-center gap-4 rounded-2xl bg-slate-50 p-6"><QrPreview value={value || "أدواتي"} /><p className="text-xs text-slate-500">معاينة رمز QR — اكتب رابطًا لتخصيصه</p></div></>}
          {tool.action === "clean" && <><textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder="ضع النص غير المنسق هنا..." className="min-h-36 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-50" /><div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4"><p className="mb-2 text-xs font-bold text-teal-700">النتيجة المنظفة</p><p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{cleaned || "ستظهر النتيجة هنا"}</p></div><button onClick={() => copy(cleaned)} className="action-button w-full">{copied ? "تم النسخ" : "نسخ النص المنظف"}</button></>}
          {tool.action === "units" && <><div className="grid gap-4 sm:grid-cols-3"><Field label="القيمة" value={value} onChange={setValue} type="number" placeholder="10" /><SelectField label="من" value={unit} onChange={setUnit} options={["km", "mile"]} /><SelectField label="إلى" value={targetUnit} onChange={setTargetUnit} options={["mile", "km"]} /></div><div className="rounded-2xl bg-slate-950 p-6 text-center"><p className="text-sm font-bold text-slate-400">النتيجة التقريبية</p><p className="mt-2 text-4xl font-black text-white">{converted.toLocaleString("ar-SA", { maximumFractionDigits: 4 })}</p><p className="mt-1 text-xs text-emerald-300">{targetUnit}</p></div></>}
          {!tool.action && <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center"><Sparkles className="mx-auto text-teal-600" size={28} /><h3 className="mt-3 text-lg font-black text-slate-900">الأداة قيد التجهيز</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">هذه الواجهة جاهزة ضمن الكتالوج، وسيتم تفعيل المعالجة المتقدمة والرفع الآمن في المرحلة التالية.</p><button onClick={onClose} className="action-button mt-5">العودة للأدوات</button></div>}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-slate-50 p-4 text-center"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value}</p></div>; }
function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) { return <label className="block text-right"><span className="mb-2 block text-xs font-bold text-slate-500">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="input-field" /></label>; }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <label className="block text-right"><span className="mb-2 block text-xs font-bold text-slate-500">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="input-field">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }
function QrPreview({ value }: { value: string }) { const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(value)}`; return <div className="flex flex-col items-center gap-3"><div className="rounded-2xl bg-white p-3 shadow-sm"><img src={qrUrl} alt="رمز QR" className="h-44 w-44 rounded-lg object-contain" /></div><a href={qrUrl} target="_blank" rel="noreferrer" className="text-xs font-black text-teal-700 hover:text-teal-900">فتح أو تنزيل رمز QR</a></div>; }

export default function Home() {
  const auth = useAuth();
  const siteStatus = trpc.site.status.useQuery();
  const verification = trpc.site.verification.useQuery();
  const recordVisitMutation = trpc.analytics.recordVisit.useMutation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("popular");
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(() => { const auth = new URLSearchParams(window.location.search).get("auth"); return auth === "register" || auth === "login" ? auth : null; });
  const [contactSent, setContactSent] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("adawati_visit_recorded")) return;
    sessionStorage.setItem("adawati_visit_recorded", "1");
    recordVisitMutation.mutate();
  }, []);

  useEffect(() => {
    const publisherId = verification.data?.adsensePublisherId;
    const existing = document.querySelector('meta[name="google-adsense-account"]');
    if (existing) existing.remove();
    if (!publisherId) return;
    const meta = document.createElement("meta");
    meta.name = "google-adsense-account";
    meta.content = publisherId;
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [verification.data?.adsensePublisherId]);

  const filteredTools = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const result = tools.filter((tool) => (category === "all" || tool.category === category) && (!normalized || `${tool.title} ${tool.description}`.toLowerCase().includes(normalized)));
    if (sort === "name") return [...result].sort((a, b) => a.title.localeCompare(b.title, "ar"));
    const featuredId = siteStatus.data?.settings.featuredToolId;
    return [...result].sort((a, b) => (a.id === featuredId ? -1 : b.id === featuredId ? 1 : tools.indexOf(a) - tools.indexOf(b)));
  }, [category, query, sort, siteStatus.data?.settings.featuredToolId]);

  const openAuth = (mode: "login" | "register") => { setAuthError(""); setAuthMode(mode); };
  const openTool = (tool: Tool) => { if (!auth.user) { openAuth("register"); return; } setSelectedTool(tool); };

  if (siteStatus.data?.maintenanceActive) return <MaintenanceScreen />;

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-slate-950" dir="rtl">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-[#fbfaf7]/90 backdrop-blur-xl">
        <div className="container flex h-[76px] items-center justify-between gap-4">
          <Link href="/"><BrandMark /></Link>
          <nav className={`absolute inset-x-4 top-[86px] rounded-3xl border border-slate-200 bg-white p-4 shadow-xl md:static md:flex md:items-center md:gap-7 md:border-0 md:bg-transparent md:p-0 md:shadow-none ${mobileNav ? "block" : "hidden md:flex"}`}>
            <a href="#tools" onClick={() => setMobileNav(false)} className="nav-link">استكشف الأدوات</a><a href="#how" onClick={() => setMobileNav(false)} className="nav-link">كيف تعمل؟</a><a href="#faq" onClick={() => setMobileNav(false)} className="nav-link">الأسئلة الشائعة</a><a href="#contact" onClick={() => setMobileNav(false)} className="nav-link">تواصل معنا</a>
          </nav>
          <div className="flex items-center gap-2">
            {auth.user?.role === "admin" && <Link href="/admin" className="hidden rounded-full px-3 py-2 text-xs font-extrabold text-teal-700 transition hover:bg-teal-50 sm:block">لوحة المدير</Link>}
            {auth.user ? <button onClick={() => void auth.logout()} className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 transition hover:border-teal-300 sm:flex"><UserRound size={15} /> {auth.user.name || "حسابي"}</button> : <div className="hidden items-center gap-2 sm:flex"><button onClick={() => openAuth("register")} className="rounded-full px-3 py-2.5 text-xs font-extrabold text-teal-700 transition hover:bg-teal-50">إنشاء حساب</button><button onClick={() => openAuth("login")} className="action-button">تسجيل الدخول <ArrowLeft size={16} /></button></div>}
            <div className="flex items-center gap-1 md:hidden">{auth.user?.role === "admin" && <Link href="/admin" className="rounded-lg px-2 py-2 text-[10px] font-black text-teal-700">الإدارة</Link>}{auth.user ? <button onClick={() => void auth.logout()} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-black text-slate-700">حسابي</button> : <><button onClick={() => openAuth("register")} className="rounded-lg px-2 py-2 text-[10px] font-black text-teal-700">تسجيل</button><button onClick={() => openAuth("login")} className="rounded-lg bg-slate-950 px-2.5 py-2 text-[10px] font-black text-white">دخول</button></>}</div>
            <button onClick={() => setMobileNav((open) => !open)} className="rounded-xl p-2 text-slate-700 md:hidden" aria-label="القائمة"><Menu size={22} /></button>
          </div>
        </div>
      </header>

      <main>
        <section className="container relative overflow-hidden pb-16 pt-12 sm:pt-20 lg:pb-24 lg:pt-28">
          <div className="hero-grid absolute inset-x-0 top-5 -z-0 h-[540px] opacity-70" />
          <div className="relative z-10 grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-2xl">
              <div className="eyebrow"><span className="status-dot" /> منصة واحدة لكل المهام اليومية</div>
              <h1 className="mt-6 text-5xl font-black leading-[1.12] tracking-[-0.05em] text-slate-950 sm:text-6xl lg:text-7xl">أنجزها من<br /><span className="text-teal-700">أول مرة.</span></h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-slate-500 sm:text-lg">أدوات عربية سريعة، مجانية، ومصممة لتختصر عليك الخطوات. من صورة تحتاج ضغطًا إلى نص يحتاج ترتيبًا — كل شيء في مكان واحد.</p>
              <div className="mt-8 flex flex-wrap items-center gap-3"><a href="#tools" className="action-button">اكتشف الأدوات <ArrowLeft size={17} /></a><a href="#how" className="secondary-button">كيف تعمل؟ <MousePointer2 size={16} /></a></div>
              <div className="mt-10 flex items-center gap-5 text-xs font-bold text-slate-400"><div className="flex -space-x-2 space-x-reverse">{["س", "ن", "م", "ر"].map((letter, index) => <span key={letter} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#fbfaf7] text-xs font-black text-white ${["bg-teal-700", "bg-orange-500", "bg-slate-700", "bg-violet-600"][index]}`}>{letter}</span>)}</div><span><strong className="text-slate-700">+42 ألف</strong> شخص يستخدمون أدواتي كل شهر</span></div>
            </div>
            <div className="relative mx-auto w-full max-w-[520px] lg:mr-auto">
              <div className="hero-panel rounded-[34px] border border-white/80 bg-slate-950 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.18)] sm:p-7">
                <div className="mb-7 flex items-center justify-between text-white"><div><p className="text-[11px] font-bold tracking-[0.12em] text-emerald-300">تجربة الأداة</p><h2 className="mt-1 text-2xl font-black">ماذا تريد أن تنجز؟</h2></div><div className="rounded-2xl bg-white/10 p-3"><Zap className="text-orange-300" size={21} /></div></div>
                <div className="relative"><Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن أداة..." className="h-14 w-full rounded-2xl border border-white/10 bg-white/10 pr-12 text-sm text-white outline-none placeholder:text-slate-400 focus:border-emerald-300/60" /></div>
                <div className="mt-5 grid grid-cols-2 gap-3">{tools.slice(0, 4).map((tool) => { const Icon = tool.icon; return <button key={tool.id} onClick={() => openTool(tool)} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-right transition hover:bg-white/10"><span className="rounded-xl bg-emerald-400/10 p-2.5 text-emerald-300"><Icon size={17} /></span><span className="text-xs font-bold text-white">{tool.title}</span></button>; })}</div>
                <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5 text-xs"><span className="text-slate-400">ابدأ الآن، لا تحتاج إلى تحميل</span><span className="flex items-center gap-1 font-bold text-emerald-300"><Check size={14} /> مجانية دائمًا</span></div>
              </div>
              <div className="float-note absolute -bottom-6 -left-4 hidden rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-xl sm:block"><div className="flex items-center gap-2"><div className="rounded-lg bg-orange-50 p-2 text-orange-500"><BarChart3 size={16} /></div><div><p className="text-[10px] font-bold text-slate-400">الأداة الأكثر استخدامًا</p><p className="mt-0.5 text-xs font-black text-slate-900">عداد الكلمات</p></div></div></div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200/70 bg-white/70 py-4"><div className="container grid grid-cols-2 gap-4 text-center sm:grid-cols-4"><Stat value="18+" label="أداة عملية" /><Stat value="42K" label="مستخدم شهريًا" /><Stat value="0" label="إعلانات مزعجة" /><Stat value="100%" label="تجربة عربية" /></div></section>

        <section id="tools" className="container scroll-mt-24 py-20 lg:py-28">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="eyebrow">مكتبة الأدوات <span className="eyebrow-line" /></div><h2 className="section-title">كل ما تحتاجه،<br /><span className="text-teal-700">في مكان واحد.</span></h2></div><p className="max-w-md text-sm leading-7 text-slate-500">اختر أداة، أنجز مهمتك، وارجع ليومك. بلا تعقيد، مع حساب مجاني يحفظ لك تجربة الاستخدام.</p></div>
          <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item.id} onClick={() => setCategory(item.id)} className={`category-chip ${category === item.id ? "active" : ""}`}>{item.label}<span>{item.count}</span></button>)}</div><div className="flex items-center gap-2 text-xs font-bold text-slate-400"><Filter size={15} /><span>ترتيب:</span><select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none"><option value="popular">الأكثر استخدامًا</option><option value="name">الاسم</option></select></div></div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filteredTools.map((tool) => <ToolCard key={tool.id} tool={tool} />)}</div>
          {filteredTools.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center"><Search className="mx-auto text-slate-300" /><p className="mt-3 font-bold text-slate-500">لم نجد أداة بهذا الاسم.</p><button onClick={() => { setQuery(""); setCategory("all"); }} className="mt-4 text-sm font-black text-teal-700">عرض كل الأدوات</button></div>}
        </section>

        <section id="how" className="container scroll-mt-24 pb-20 lg:pb-28"><div className="relative overflow-hidden rounded-[32px] bg-teal-700 p-8 text-white sm:p-12"><div className="absolute -left-16 -top-20 h-64 w-64 rounded-full border border-white/10" /><div className="absolute -bottom-28 right-20 h-72 w-72 rounded-full border border-white/10" /><div className="relative z-10 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center"><div><div className="eyebrow light">ثلاث خطوات فقط</div><h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">وقت أقل على الشاشة.<br />وقت أكثر ليومك.</h2><p className="mt-4 max-w-sm text-sm leading-7 text-emerald-50/80">صممنا كل تفصيلة لتصل إلى النتيجة بأقل عدد من النقرات.</p></div><div className="grid gap-3 sm:grid-cols-3">{[{ n: "٠١", title: "اختر الأداة", body: "ابحث أو تصفح حسب الفئة." }, { n: "٠٢", title: "أدخل التفاصيل", body: "نموذج واضح بلا حقول زائدة." }, { n: "٠٣", title: "خذ النتيجة", body: "احفظها أو شاركها فورًا." }].map((item) => <div key={item.n} className="rounded-2xl border border-white/15 bg-white/10 p-5"><span className="font-mono text-sm font-bold text-orange-300">{item.n}</span><h3 className="mt-8 font-black">{item.title}</h3><p className="mt-2 text-xs leading-6 text-emerald-50/75">{item.body}</p></div>)}</div></div></div></section>

        <section id="faq" className="container scroll-mt-24 pb-20"><div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]"><div><div className="eyebrow">أسئلة شائعة</div><h2 className="section-title mt-5">أجوبة قبل<br /><span className="text-teal-700">أن تسأل.</span></h2><p className="mt-5 text-sm leading-7 text-slate-500">لم تجد ما تبحث عنه؟ <a href="#contact" className="font-black text-teal-700">تواصل معنا مباشرة.</a></p></div><div className="space-y-3">{[{ q: "هل استخدام الأدوات مجاني؟", a: "نعم، الأدوات الأساسية مجانية ولا تتطلب تسجيلًا. بعض الأدوات المتقدمة يمكن أن تضاف لاحقًا ضمن باقات اختيارية." }, { q: "هل تحفظون ملفاتي أو نصوصي؟", a: "الأدوات التي تعمل داخل المتصفح لا ترسل ملفاتك إلى الخادم. نوضح ذلك بجانب كل أداة عند الحاجة." }, { q: "هل أحتاج إلى إنشاء حساب؟", a: "يتطلب استخدام الأدوات إنشاء حساب مجاني أولًا، حتى نوفر لك تجربة أكثر تنظيمًا ونتمكن من حفظ إعداداتك مستقبلًا." }, { q: "كيف أتواصل مع الدعم؟", a: "استخدم نموذج التواصل أسفل الصفحة، وسيصلك فريقنا بأقرب وقت ممكن." }].map((item) => <details key={item.q} className="group rounded-2xl border border-slate-200 bg-white p-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-extrabold text-slate-900"><span>{item.q}</span><ChevronDown className="shrink-0 text-slate-400 transition group-open:rotate-180" size={18} /></summary><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">{item.a}</p></details>)}</div></div></section>

        <section id="contact" className="border-t border-slate-200/70 bg-white py-20"><div className="container grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"><div><div className="eyebrow">نحن نسمعك</div><h2 className="section-title mt-5">فكرة؟<br /><span className="text-teal-700">سؤال؟</span></h2><p className="mt-5 max-w-sm text-sm leading-7 text-slate-500">أرسل لنا ما يدور في بالك. ملاحظاتك هي التي تجعل أدواتي أفضل كل يوم.</p><div className="mt-7 flex items-center gap-3 text-sm font-bold text-slate-700"><MessageCircle className="text-teal-700" size={19} /> دعم حقيقي، بدون ردود آلية</div></div><form onSubmit={(event) => { event.preventDefault(); setContactSent(true); }} className="rounded-[28px] border border-slate-200 bg-[#fbfaf7] p-6 sm:p-8"><div className="grid gap-4 sm:grid-cols-2"><Field label="الاسم" value="" onChange={() => undefined} placeholder="اكتب اسمك" /><Field label="البريد الإلكتروني" value="" onChange={() => undefined} type="email" placeholder="you@example.com" /></div><label className="mt-4 block text-right"><span className="mb-2 block text-xs font-bold text-slate-500">كيف نساعدك؟</span><textarea required className="input-field min-h-32 resize-none" placeholder="اكتب رسالتك هنا..." /></label><button type="submit" className="action-button mt-5 w-full justify-center">{contactSent ? <><Check size={17} /> وصلت رسالتك، شكرًا</> : <>إرسال الرسالة <Send size={16} /></>}</button></form></div></section>
      </main>

      <footer className="border-t border-slate-200 bg-[#fbfaf7] py-8"><div className="container flex flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-right"><BrandMark compact /><div className="flex flex-wrap items-center justify-center gap-5 text-xs font-bold text-slate-400"><a href="#tools" className="hover:text-teal-700">الأدوات</a><a href="#faq" className="hover:text-teal-700">الأسئلة الشائعة</a><Link href="/contact" className="hover:text-teal-700">الدعم</Link><Link href="/privacy" className="hover:text-teal-700">الخصوصية</Link><Link href="/terms" className="hover:text-teal-700">الشروط</Link></div><p className="text-xs text-slate-400">صُنع بعناية للعالم العربي © ٢٠٢٦</p></div></footer>

      {!auth.user && <div className="fixed bottom-5 left-5 z-30 hidden max-w-[250px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:block"><div className="flex items-start gap-3"><div className="rounded-xl bg-teal-50 p-2 text-teal-700"><UserRound size={16} /></div><div><p className="text-xs font-black text-slate-900">احفظ أدواتك المفضلة</p><p className="mt-1 text-[10px] leading-5 text-slate-500">سجّل الدخول للوصول السريع لاحقًا.</p></div><button onClick={() => setAuthError("close")} className="text-slate-300 hover:text-slate-700"><X size={14} /></button></div><button onClick={() => openAuth("login")} className="mt-3 w-full rounded-xl bg-slate-950 py-2 text-[11px] font-black text-white">تسجيل الدخول</button></div>}
      {authError && authError !== "close" && <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-3 rounded-2xl bg-rose-600 px-4 py-3 text-xs font-bold text-white shadow-xl">{authError}<button onClick={() => setAuthError("")}><X size={15} /></button></div>}
      {authMode && <AuthModal mode={authMode} onClose={() => { setAuthMode(null); window.history.replaceState({}, "", "/"); }} onError={setAuthError} />}
      {selectedTool && <ToolWorkspace tool={selectedTool} onClose={() => setSelectedTool(null)} />}
    </div>
  );
}

function AuthModal({ mode, onClose, onError }: { mode: "login" | "register"; onClose: () => void; onError: (message: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.localLogin.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); onClose(); }, onError: (error) => onError(error.message) });
  const registerMutation = trpc.auth.localRegister.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); onClose(); }, onError: (error) => onError(error.message) });
  const pending = loginMutation.isPending || registerMutation.isPending;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onError("");
    if (mode === "login") loginMutation.mutate({ username, password });
    else registerMutation.mutate({ username, password, name });
  };
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-5" dir="rtl"><div className="w-full max-w-md rounded-t-[30px] bg-white p-7 shadow-2xl sm:rounded-[30px]"><div className="flex items-start justify-between"><div><div className="eyebrow">حسابك في أدواتي</div><h2 className="mt-3 text-2xl font-black text-slate-950">{mode === "login" ? "أهلًا بعودتك" : "أنشئ حسابك مجانًا"}</h2><p className="mt-2 text-xs leading-6 text-slate-500">{mode === "login" ? "سجّل الدخول للوصول إلى حسابك ولوحة الإدارة." : "احفظ تفضيلاتك وابدأ استخدام الأدوات فورًا."}</p></div><button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></div><form onSubmit={submit} className="mt-6 space-y-4">{mode === "register" && <label className="block"><span className="admin-label">الاسم</span><input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} className="input-field" placeholder="مثال: محمد أحمد" /></label>}<label className="block"><span className="admin-label">اسم المستخدم</span><input required minLength={3} value={username} onChange={(event) => setUsername(event.target.value)} className="input-field" placeholder="mohanad" autoComplete="username" /></label><label className="block"><span className="admin-label">كلمة المرور</span><input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="input-field" placeholder="٨ أحرف على الأقل" autoComplete={mode === "login" ? "current-password" : "new-password"} /></label><button disabled={pending} className="action-button w-full justify-center disabled:opacity-60">{pending ? "جارٍ التحقق..." : mode === "login" ? "تسجيل الدخول" : "إنشاء الحساب"} <ArrowLeft size={16} /></button></form><p className="mt-5 text-center text-[10px] leading-5 text-slate-400">تتم حماية كلمة المرور داخل الخادم ولا تظهر في ملفات الموقع.</p></div></div>;
}

function MaintenanceScreen() {
  return <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7] p-6" dir="rtl"><div className="relative w-full max-w-xl overflow-hidden rounded-[34px] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,.1)] sm:p-12"><div className="hero-grid absolute inset-0 opacity-40" /><div className="relative"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-3xl font-black text-white">أ<span className="absolute mt-9 ml-7 h-1.5 w-1.5 rounded-full bg-orange-400" /></div><div className="mx-auto mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-orange-500"><Clock3 size={26} /></div><p className="mt-6 text-xs font-black tracking-[.14em] text-teal-700">نعود قريبًا</p><h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">نرتب شيئًا جميلًا.</h1><p className="mx-auto mt-4 max-w-md text-sm leading-8 text-slate-500">الموقع في وضع الصيانة المؤقتة الآن. جرّب العودة بعد قليل، ستكون أدواتي جاهزة لخدمتك.</p><div className="mx-auto mt-7 flex max-w-xs items-center justify-center gap-2 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-500"><span className="h-2 w-2 rounded-full bg-orange-400" /> تحت التحديث الآن</div></div></div></div>;
}

function Stat({ value, label }: { value: string; label: string }) { return <div><p className="text-xl font-black text-slate-950 sm:text-2xl">{value}</p><p className="mt-1 text-[11px] font-bold text-slate-400">{label}</p></div>; }
