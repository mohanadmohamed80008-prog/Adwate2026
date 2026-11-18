type AdSenseSafeZoneProps = {
  label?: string;
  className?: string;
};

/**
 * Reserved, clearly-labelled space for AdSense Auto ads.
 * Manual units are intentionally not fabricated: a real data-ad-slot from
 * the publisher account is required before rendering a manual <ins> unit.
 */
export default function AdSenseSafeZone({ label = "مساحة إعلانية", className = "" }: AdSenseSafeZoneProps) {
  return (
    <section
      aria-label={label}
      data-adsense-safe-zone
      className={`mx-auto my-10 min-h-[104px] max-w-4xl border-y border-slate-200/70 bg-white/45 px-4 py-3 ${className}`}
    >
      <p className="text-center text-[10px] font-bold tracking-wide text-slate-400">{label}</p>
      <div className="min-h-[68px]" aria-hidden="true" />
    </section>
  );
}
