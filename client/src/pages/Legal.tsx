import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { useEffect } from "react";

const pageCopy = {
  privacy: {
    title: "سياسة الخصوصية",
    description: "تعرف على طريقة تعامل أدواتي مع بيانات الزوار والأعضاء وحماية الملفات والنصوص.",
  },
  terms: {
    title: "الشروط والأحكام",
    description: "الشروط المنظمة لاستخدام منصة أدواتي وأدواتها اليومية.",
  },
  contact: {
    title: "تواصل معنا",
    description: "تواصل مع فريق أدواتي للاستفسارات والاقتراحات ومشكلات الاستخدام.",
  },
} as const;

type LegalKind = keyof typeof pageCopy;

export default function Legal({ kind }: { kind: LegalKind }) {
  const copy = pageCopy[kind];
  useEffect(() => {
    document.title = `${copy.title} — أدواتي`;
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute("content", copy.description);
  }, [copy]);

  return <div className="min-h-screen bg-[#fbfaf7] text-slate-950" dir="rtl"><header className="border-b border-slate-200 bg-white/90"><div className="container flex h-20 items-center justify-between"><Link href="/" className="text-lg font-black text-slate-950">أدواتي<span className="mr-1 text-teal-700">.</span></Link><Link href="/" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:border-teal-300 hover:text-teal-700"><ArrowRight size={14} /> العودة للرئيسية</Link></div></header><main className="container max-w-3xl py-12 sm:py-20"><div className="eyebrow"><ShieldCheck size={15} /> معلومات موثوقة وواضحة</div><h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{copy.title}</h1><p className="mt-4 max-w-2xl text-sm leading-8 text-slate-500">{copy.description}</p>{kind === "privacy" && <PrivacyContent />}{kind === "terms" && <TermsContent />}{kind === "contact" && <ContactContent />}</main><footer className="border-t border-slate-200 py-8"><div className="container flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400"><span>© ٢٠٢٦ أدواتي</span><div className="flex gap-4"><Link href="/privacy" className="hover:text-teal-700">الخصوصية</Link><Link href="/terms" className="hover:text-teal-700">الشروط</Link><Link href="/contact" className="hover:text-teal-700">تواصل معنا</Link></div></div></footer></div>;
}

function PrivacyContent() { return <div className="mt-10 space-y-7 text-sm leading-8 text-slate-600"><Article title="ما البيانات التي نجمعها؟">تتعامل أدواتي مع بيانات الحساب الأساسية عند التسجيل، مثل اسم المستخدم والاسم المعروض، بهدف إنشاء الحساب وإتاحة تسجيل الدخول وإدارة الصلاحيات. لا نطلب ملفاتك أو نصوصك إلا عندما تكون الأداة بحاجة واضحة لذلك.</Article><Article title="الملفات والنصوص">الأدوات التي تعمل داخل المتصفح تعالج الملفات والنصوص محليًا قدر الإمكان. لا تحفظ المنصة محتوى الملفات أو النصوص الناتجة ما لم توضّح الأداة ذلك صراحةً.</Article><Article title="الكوكيز والتحليلات">نستخدم كوكي الجلسة للحفاظ على تسجيل الدخول، ونستخدم إحصاءات إجمالية للزيارات وتحسين الخدمة. لا نبيع البيانات الشخصية ولا نستخدمها لبناء ملفات تعريف تسويقية.</Article><Article title="حقوقك">يمكنك طلب المساعدة بشأن حسابك أو الاستفسار عن البيانات المرتبطة به عبر صفحة التواصل. قد نحتفظ بسجلات أمنية محدودة لحماية الموقع ومنع إساءة الاستخدام.</Article></div>; }
function TermsContent() { return <div className="mt-10 space-y-7 text-sm leading-8 text-slate-600"><Article title="الاستخدام المقبول">تُستخدم أدواتي للأغراض القانونية والمشروعة فقط. يُمنع استخدامها لمحاولة اختراق أنظمة أو انتهاك حقوق الآخرين أو إرسال محتوى ضار.</Article><Article title="طبيعة الأدوات">تقدم الأدوات نتائج مساعدة عامة، وقد تحتاج النتائج إلى مراجعة المستخدم قبل استخدامها في قرارات مهنية أو مالية أو قانونية. لا نضمن ملاءمة كل نتيجة لغرض محدد.</Article><Article title="الحسابات">أنت مسؤول عن الحفاظ على سرية بيانات دخولك، وعن صحة المعلومات التي تقدمها. يحق للإدارة تعليق الحسابات التي تخالف هذه الشروط.</Article><Article title="التحديثات">قد تتغير الأدوات أو هذه الشروط لتحسين الخدمة. استمرار استخدام المنصة بعد نشر التحديث يعني قبول النسخة المحدثة.</Article></div>; }
function ContactContent() { return <div className="mt-10 grid gap-4 sm:grid-cols-2"><div className="rounded-3xl border border-slate-200 bg-white p-6"><Mail className="text-teal-700" size={22} /><h2 className="mt-5 font-black text-slate-900">الدعم والاستفسارات</h2><p className="mt-2 text-sm leading-7 text-slate-500">استخدم نموذج التواصل في الصفحة الرئيسية وسنراجع رسالتك في أقرب وقت.</p><Link href="/#contact" className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white">فتح نموذج التواصل</Link></div><div className="rounded-3xl border border-teal-100 bg-teal-50 p-6"><CheckCircle2 className="text-teal-700" size={22} /><h2 className="mt-5 font-black text-slate-900">اقتراحاتك مهمة</h2><p className="mt-2 text-sm leading-7 text-slate-600">أرسل اقتراحًا لأداة جديدة أو بلّغ عن مشكلة في تجربة الاستخدام.</p></div></div>; }
function Article({ title, children }: { title: string; children: React.ReactNode }) { return <section><h2 className="mb-2 text-lg font-black text-slate-900">{title}</h2><p>{children}</p></section>; }
