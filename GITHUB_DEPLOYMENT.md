# نشر «أدواتي» من GitHub

## تنبيه مهم

هذا المشروع ليس موقعًا ثابتًا فقط. المصادقة المحلية، قاعدة البيانات، لوحة الأدمن، الإشعارات، سجل النشاط ووضع الصيانة تعمل عبر Node/Express وMySQL. لذلك **لن تعمل النسخة الكاملة على GitHub Pages وحدها**؛ GitHub Pages يشغّل ملفات static ولا يشغّل خادم Node أو قاعدة بيانات.

استخدم GitHub كمستودع للكود، ثم اربطه باستضافة تدعم Node.js وMySQL أو Docker. ملف `Dockerfile` الموجود في جذر المشروع جاهز للبناء، ونقطة فحص الخادم هي `/api/health`.

## رفع الكود إلى GitHub

```bash
git init
git add .
git commit -m "Initial Adawati release"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

لا ترفع ملفات `.env` أو كلمات المرور أو مفاتيح API. استخدم `.env.example` كقائمة أسماء فقط، وضع القيم الحقيقية في Secrets الخاصة بمزود الاستضافة.

## إعدادات التشغيل المطلوبة

انسخ أسماء المتغيرات من `.env.example` إلى إعدادات Secrets في الاستضافة:

- `DATABASE_URL`: اتصال MySQL دائم.
- `ADMIN_PASSWORD`: كلمة مرور المدير المحلية.
- `MANUS_JWT_SECRET`: سر جلسات طويل وعشوائي.
- `PORT`: عادةً 3000 أو المنفذ الذي تحدده الاستضافة.
- `MANUS_API_URL` و`MANUS_API_KEY`: مطلوبان فقط إذا أردت إرسال تنبيهات البريد عبر قناة إشعارات مالك المشروع.

بعد تشغيل الحاوية:

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm build
pnpm start
```

أو استخدم Docker:

```bash
docker build -t adawati .
docker run --env-file .env -p 3000:3000 adawati
```

## ما قبل طلب Google AdSense

1. اربط نطاقًا مخصصًا مع HTTPS.
2. افتح إعدادات الأدمن ثم قسم Google.
3. أدخل معرّف الناشر بصيغة `pub-xxxxxxxxxxxxxxxx`.
4. أدخل رابط موقعك أو ملكيتك في Google Search Console بصيغة HTTPS.
5. أضف الموقع في Search Console وأرسل ملف Sitemap بعد توفر النطاق.
6. اطلب مراجعة الموقع من AdSense.

عند إدخال معرّف الناشر، يضيف الموقع وسم التحقق ويعرض `ads.txt` المناسب. لا يتم عرض الإعلانات تلقائيًا من مجرد حفظ المعرّف.

## GitHub Pages

يمكن استخدام GitHub Pages لعرض واجهة ثابتة تجريبية فقط عبر `pnpm build:static`، لكن تسجيل الدخول، التسجيل، قاعدة البيانات، لوحة الأدمن، الإشعارات والبريد لن تعمل هناك. للنشر الكامل استخدم استضافة Node/Docker مرتبطة بمستودع GitHub.
