# المشروع: بورتال العميل + بوابة الكابتن

نبني نظامين منفصلين عن لوحة الإدارة الحالية:
1. **بورتال العميل** (`/portal`) — كل مشترك يدخل بحسابه ويتابع بياناته
2. **بوابة الكابتن** (`/captain`) — كل كابتن يشوف عملاءه ويضيف ملاحظات

## 1. قاعدة البيانات (Migration)

### جدول `client_accounts`
يربط رقم الموبايل بـ `auth.users` للعملاء + بـ `subscribers.id`
- `id`, `user_id` (auth.users), `subscriber_id` (subscribers), `phone` (unique), `created_at`
- RLS: العميل يقرأ/يحدث صفه فقط، الأدمن يدير كله

### جدول `captain_accounts`
يربط الكابتن بحساب auth
- `id`, `user_id` (auth.users), `captain_name` (يطابق `subscribers.captain`), `created_at`
- RLS: الكابتن يقرأ صفه، الأدمن يدير

### جدول `attendance` (الحضور)
- `id`, `subscriber_id`, `client_user_id`, `checked_in_at`, `qr_token`
- RLS: العميل يضيف لنفسه ويقرأ سجله، الأدمن والكابتن (لعملاءه) يقرأوا

### جدول `client_notes` (ملاحظات الكابتن للعميل)
- `id`, `subscriber_id`, `captain_user_id`, `note`, `created_at`
- RLS: الكابتن يدير ملاحظاته على عملاءه، العميل يقرأ ملاحظاته

### جدول `gym_qr_tokens`
QR ثابت معلق في الجيم
- `id`, `token` (unique secret), `label`, `is_active`, `created_at`

### جدول `client_notifications`
- `id`, `subscriber_id`, `title`, `body`, `type` (expiry/offer/reminder), `is_read`, `created_at`
- RLS: العميل يقرأ/يحدث صفه

### تحديثات أخرى
- Function `has_client_access(_user_id, _subscriber_id)` و `has_captain_access(_user_id, _captain_name)`
- Trigger يولد إشعار قرب انتهاء (cron منفصل لاحقاً، حالياً client-side check)

## 2. المصادقة (بدون OTP، رقم موبايل + كلمة سر)

نستخدم Supabase Auth بإيميل صناعي:
- العميل: `{phone_normalized}@client.gym` + كلمة السر اللي الأدمن يحددها
- الكابتن: `{captain_slug}@captain.gym` + كلمة السر

### Edge Functions جديدة
- `create-client-account` — الأدمن يولد حساب لمشترك (يأخذ subscriber_id + كلمة سر)
- `create-captain-account` — الأدمن يولد حساب لكابتن
- `client-login` — يحول رقم الموبايل لإيميل صناعي ويسجل الدخول
- `captain-login` — نفس الفكرة

## 3. واجهات جديدة

### بورتال العميل (`/portal`)
- `/portal/login` — رقم موبايل + كلمة سر
- `/portal` (dashboard):
  - بطاقة الاشتراك: نوع، تاريخ بداية/انتهاء، أيام متبقية، مدفوع/متبقي
  - **QR كود العضوية** (يحتوي subscriber_id موقّع)
  - أزرار: واتساب الجيم، طلب تجديد، Check-in (مسح QR الجيم)
  - تبويب: سجل الاشتراكات (من `renewal_history`)
  - تبويب: سجل الحضور
  - تبويب: ملاحظات الكابتن
  - تبويب: الإشعارات

### بوابة الكابتن (`/captain`)
- `/captain/login`
- `/captain` (dashboard): قائمة العملاء المعينين له فقط، البحث، عرض تفاصيل أي عميل، إضافة/حذف ملاحظات

### في لوحة الإدارة
- تبويب جديد في **Settings**: "حسابات العملاء" — توليد كلمة سر لأي مشترك ونسخها
- نفس التبويب: "حسابات الكباتن" — توليد حساب لكل كابتن

## 4. QR Check-in

- صفحة `/checkin?token=XXX` — لما العميل يمسح QR من تطبيقه:
  - لو مسجل دخول كعميل → يضيف صف في `attendance` مع التاريخ
  - لو مش مسجل → يحوله لـ `/portal/login` ثم يكمل
- في الإعدادات: زر "اطبع QR الجيم" يعرض QR كبير بالـ token

## 5. الإشعارات الذكية

- في dashboard العميل: نقرأ `end_date` ولو فاضل ≤7 أيام نعرض banner تحذير
- نولد صف في `client_notifications` تلقائياً عبر trigger أو Edge Function
- استخدام push_subscriptions الموجود لإرسال push notification لما الإشعار يتولد

## التفاصيل التقنية

```text
Routes:
/portal/login          → ClientLogin.tsx
/portal                → ClientDashboard.tsx (protected)
/portal/history        → داخل tabs
/captain/login         → CaptainLogin.tsx
/captain               → CaptainDashboard.tsx (protected)
/checkin?token=XXX     → CheckIn.tsx

Hooks:
useClientAuth()        → wraps useAuth + يتحقق من client_accounts
useCaptainAuth()       → نفس الفكرة
useClientData()        → يجيب subscriber + renewal_history + notes + notifications
useCaptainClients()    → يجيب subscribers WHERE captain = my captain_name

Libraries:
- qrcode.react (موجود غالباً، لو لا نضيفه) لتوليد QR
- html5-qrcode أو @yudiel/react-qr-scanner لمسح QR
```

## ملاحظات مهمة

- **لن نلمس** نظام الموظفين الحالي (PIN 4807) — هو لإدارة الجيم
- بورتال العميل والكابتن منفصلين تماماً عن `/auth` الحالي
- نستخدم `client.runtime.ts` كالعادة
- التصميم: أسود خالص + برتقالي ذهبي + نفس الـ Design tokens
- بسبب حجم العمل: هنبدأ بالـ migration والـ Edge Functions، ثم بورتال العميل، ثم الكابتن، ثم Check-in والإشعارات في تيار واحد

