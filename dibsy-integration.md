# تكامل Dibsy في أدواتي

تم تجهيز طبقة Sandbox فقط، اعتمادًا على وثائق Dibsy الرسمية:

- API: `https://api.dibsy.one/v2`
- المفتاح السري يقرأه الخادم من `DIBSY_SECRET_KEY` ولا يصل إلى المتصفح.
- الإجراء المحمي `billing.createDibsySandboxCheckout` ينشئ Hosted Checkout لخطة Pro أو الأعمال بسعر اختباري، ولا يقبل مبلغًا من العميل.
- Webhook: `POST /api/payments/dibsy/webhook`
- الـ Webhook لا يثق بجسم الطلب وحده؛ يتحقق من `resource` و`id` ثم يسترجع الدفع من Dibsy باستخدام المفتاح السري.
- رابط العودة التجريبي: `/pricing?payment=return`

## متغيرات Render المطلوبة للاختبار

```text
DIBSY_SECRET_KEY=sk_test_...
DIBSY_API_BASE_URL=https://api.dibsy.one/v2
DIBSY_PUBLIC_APP_URL=https://adawati.onrender.com
```

لا تُضاف `DIBSY_SECRET_KEY` إلى Git أو إلى متغيرات Vite أو أي ملف يبدأ بـ `VITE_`.

## قبل تشغيل Live

1. إنشاء حساب تاجر والتحقق من نشاط الأدوات الرقمية والاشتراكات.
2. تشغيل Checkout في Sandbox واختبار النجاح والفشل والإلغاء وإعادة المحاولة.
3. إضافة جداول للاشتراك والاستحقاق وحالة الفاتورة قبل منح ميزات Pro.
4. إضافة صفحة شروط الاشتراك والإلغاء والاسترداد والخصوصية.
5. اختبار Webhook في بيئة عامة مع تسجيل الأحداث دون تخزين بيانات البطاقة.
6. طلب موافقة Dibsy ثم استبدال المفتاح بـ `sk_live_...` عبر Render فقط.

المصادر: [Dibsy Authentication](https://dibsy.dev/authentication)، [Dibsy Hosted Checkout](https://dibsy.dev/hosted-checkout)، [Dibsy Webhooks](https://dibsy.dev/webhooks)، [Dibsy Mandates](https://dibsy.dev/mandates).
