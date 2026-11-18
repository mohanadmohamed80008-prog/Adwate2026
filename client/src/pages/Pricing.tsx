import { Check, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

const plans = [
  {
    name: "مجاني",
    badge: "ابدأ الآن",
    description: "للاستخدام اليومي وتجربة أدواتي بدون التزام.",
    features: ["الأدوات الأساسية", "معالجة محلية حيثما أمكن", "مساعدة ذكية محدودة", "إعلانات هادئة غير مزعجة"],
    action: "ابدأ مجانًا",
    href: "/?auth=register",
    featured: false,
  },
  {
    name: "أدواتي Pro",
    badge: "الخطة المقترحة",
    description: "للمستخدم الذي يحتاج حدودًا أعلى وتجربة مركّزة.",
    features: ["حدود استخدام أعلى", "معالجة دفعات للصور وPDF", "أرصدة OCR وتفريغ صوتي", "تجربة بلا إعلانات", "مساعدة ذكية موسعة"],
    action: "سجّل اهتمامك",
    href: "/contact",
    featured: true,
  },
  {
    name: "للأعمال وAPI",
    badge: "للشركات",
    description: "تكامل مخصص للفرق والمواقع والمنتجات الرقمية.",
    features: ["مفاتيح API وحدود مرنة", "حسابات وصلاحيات للفرق", "تقارير استخدام وفواتير واضحة", "دعم وتكامل مخصص"],
    action: "تواصل معنا",
    href: "/contact",
    featured: false,
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-[#fbfaf7] text-slate-950" dir="rtl">
      <header className="border-b border-slate-200/70 bg-[#fbfaf7]/95 backdrop-blur-xl">
        <div className="container flex min-h-[72px] items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3"><span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-xl font-black text-white">أ<span className="absolute bottom-1 left-1 h-1.5 w-1.5 rounded-full bg-orange-400" /></span><span><strong className="block text-lg font-black">أدواتي</strong><small className="block text-[10px] font-bold tracking-[.2em] text-teal-700">أنجزها ببساطة</small></span></Link>
          <Link href="/" className="secondary-button"><ArrowRight size={15} /> العودة للموقع</Link>
        </div>
      </header>
      <main className="container py-14 sm:py-20">
        <div className="mx-auto max-w-2xl text-center"><div className="eyebrow justify-center"><Sparkles size={14} /> خطط أدواتي</div><h1 className="mt-5 text-4xl font-black tracking-[-.05em] sm:text-6xl">استخدم ما تحتاجه،<br /><span className="text-teal-700">وادفع فقط عند الحاجة.</span></h1><p className="mt-6 text-sm leading-8 text-slate-500 sm:text-base">الأدوات الأساسية تبقى متاحة مجانًا. نجهّز خططًا مدفوعة لمن يحتاج حدودًا أعلى، مع إبقاء الأسعار والدفع واضحين قبل التفعيل.</p></div>
        <div className="mx-auto mt-12 grid max-w-6xl gap-5 lg:grid-cols-3">{plans.map((plan) => <article key={plan.name} className={`relative flex flex-col rounded-[30px] border p-6 shadow-[0_18px_60px_rgba(15,23,42,.05)] sm:p-8 ${plan.featured ? "border-teal-500 bg-slate-950 text-white lg:-translate-y-3" : "border-slate-200 bg-white"}`}><span className={`self-start rounded-full px-3 py-1 text-[10px] font-black ${plan.featured ? "bg-teal-400/15 text-emerald-300" : "bg-slate-100 text-slate-500"}`}>{plan.badge}</span><h2 className="mt-6 text-2xl font-black">{plan.name}</h2><p className={`mt-3 min-h-14 text-sm leading-7 ${plan.featured ? "text-slate-300" : "text-slate-500"}`}>{plan.description}</p><ul className="mt-6 space-y-4 text-xs font-bold">{plan.features.map((feature) => <li key={feature} className="flex items-start gap-2"><Check size={16} className={plan.featured ? "text-emerald-300" : "text-teal-700"} /><span>{feature}</span></li>)}</ul><Link href={plan.href} className={`mt-8 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-black transition ${plan.featured ? "bg-white text-slate-950 hover:bg-emerald-100" : "bg-slate-950 text-white hover:bg-teal-700"}`}>{plan.action}<ArrowRight size={15} /></Link></article>)}</div>
        <div className="mx-auto mt-10 flex max-w-3xl items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-900"><ShieldCheck className="mt-0.5 shrink-0 text-blue-600" size={17} /><p><strong>تنبيه مهم:</strong> الدفع الإلكتروني غير مفعّل بعد. لن يتم خصم أي مبلغ من هذه الصفحة. سيتم تفعيل الاشتراكات فقط بعد اختيار مزود دفع مرخّص وإظهار السعر وشروط الإلغاء وسياسة الاسترداد بوضوح.</p></div>
      </main>
      <footer className="border-t border-slate-200 py-7 text-center text-xs text-slate-400">أدواتي — خطط واضحة وتجربة عربية صادقة</footer>
    </div>
  );
}
