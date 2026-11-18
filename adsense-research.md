# ملاحظات التحقق من AdSense — 2026-11-18

## حالة الربط الحي

- `https://adawati.onrender.com/` يعيد 200 ويحتوي على `google-adsense-account` بالناشر `pub-9647422342254517` وعلى سكربت AdSense.
- `https://adawati.onrender.com/ads.txt` يعيد 200 ويحتوي على `google.com, pub-9647422342254517, DIRECT, f08c47fec0942fa0`.
- `robots.txt` و`sitemap.xml` يعيدان 200.

## المصادر الرسمية

1. https://support.google.com/adsense/answer/1714397?hl=ar — Google AdSense: إضافة طريقة الدفع. توضح أن الخيارات تعتمد على عنوان الدفع، وتشمل EFT والحوالة البرقية وغيرها، وأن الإضافة تتم من Payments > Payments info > Manage payment methods.
2. https://support.google.com/adsense/answer/3372975?hl=ar — Google AdSense: الحوالات البرقية. تذكر قطر ضمن قائمة البلدان وتطلب عادة اسم صاحب الحساب، اسم المصرف، SWIFT-BIC وIBAN للحساب المصرفي.
3. https://support.google.com/adsense/answer/1714398?hl=ar — Google AdSense: EFT. تشرح الإيداع في الحساب المصرفي والتحقق بإيداع تجريبي عند توفره.
4. https://support.google.com/adsense/answer/1346295?hl=ar — Google AdSense: سياسات مواضع الإعلانات. تحذر من وضع الإعلانات قرب أزرار التنزيل والتشغيل والتنقل ومشغلات الفيديو والقوائم المنسدلة، ومن أي تنفيذ قد يؤدي إلى نقرات غير مقصودة أو يخلط الإعلان بعناصر الموقع.

## قرار التنفيذ

- لا تُستخدم معرّفات وحدات إعلانية مخمّنة؛ إنشاء الوحدات اليدوية يحتاج Slot ID حقيقيًا من حساب AdSense.
- يبقى سكربت Auto Ads الرسمي موجودًا، وتضاف منطقتان هادئتان ومفصولتان عن أزرار الأدوات لتوفير مواضع قابلة للعرض دون تداخل أو تشجيع للنقر.
- لا توضع الإعلانات داخل بطاقة الأداة، بجوار زر التشغيل أو التنزيل، أو داخل الستارة المنسدلة.
