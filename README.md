# 🏪 متجر العقيلة

متجر إلكتروني مبني على React + Firebase، مستضاف على Vercel.

---

## 🚀 خطوات التشغيل

### 1. إعداد متغيرات البيئة

```bash
cp .env.example .env
```

افتح ملف `.env` واملأ القيم الحقيقية:

| المتغير | وين تلاقيه |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Console → Project Settings → Your apps |
| `VITE_FIREBASE_AUTH_DOMAIN` | نفس المكان |
| `VITE_FIREBASE_PROJECT_ID` | نفس المكان |
| `VITE_FIREBASE_STORAGE_BUCKET` | نفس المكان |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | نفس المكان |
| `VITE_FIREBASE_APP_ID` | نفس المكان |
| `VITE_BENEFIT_IBAN` | رقم الـ IBAN الحقيقي لحسابك البنكي (أو اضبطه من لوحة الأدمن) |
| `VITE_WHATSAPP_NUMBER` | رقم الواتساب بدون + (مثال: 97337573375) (أو اضبطه من لوحة الأدمن) |
| `VITE_ADMIN_EMAIL` | إيميل حساب الأدمن — لازم يطابق نفس القيمة بـ `firestore.rules` و`storage.rules` بالضبط |

> ⚠️ **لا تحطي قيم حقيقية بملف `.env.example`** — هذا الملف يرفع لـ GitHub والمستودع عام. القيم الحقيقية تنحط بـ `.env` بس (محمي بـ `.gitignore`، ما يرفع أبداً).

---

### 2. تثبيت وتشغيل محلي

```bash
npm install
npm run dev
```

---

### 3. نشر الموقع (Hosting)

الموقع يُستضاف على **Vercel**، مربوط بمستودع GitHub — أي `git push` لفرع `main` ينشر تلقائياً.

> Vite build → `dist/` → Vercel. إعدادات التوجيه (SPA rewrite) والـ headers الأمنية موجودة بملف `vercel.json`.

**لازم تضيفي كل متغيرات البيئة أعلاه بإعدادات Vercel** (Project Settings → Environment Variables) — الموقع ما يشتغل صح بدونها.

---

### 4. نشر قواعد الحماية (Firestore + Storage)

هذي خطوة **منفصلة تماماً** عن نشر الموقع — لازم Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,storage:rules
```

⚠️ لازم تسوّيها في كل مرة تتغيّر فيها `firestore.rules` أو `storage.rules` — تعديل الملف محلياً ما يأثر على الموقع الحي إلا بعد هذا الأمر.

---

## 🔔 الإشعارات (ntfy)

الموقع يرسل إشعار فوري (تفاصيل الطلب + صورة الإيصال) مباشرة من متصفح العميل لتطبيق **ntfy** على جوالك، بدون Cloud Function وبدون تكلفة. تضبطينه من لوحة الأدمن → "إشعارات الطلبات" (اسم القناة يتخزّن بـ Firestore، مو بـ `.env`).

---

## 🔐 ملاحظات أمنية

- المفاتيح الحساسة (Firebase config) بـ `.env` بس، ما تُكشف بالكود المرفوع
- Firestore Security Rules مضبوطة بدقة لكل مجموعة بيانات (`firestore.rules`) — راجعيها قبل أي تعديل على صلاحيات الوصول
- إيميل الأدمن `isAdmin()` بـ `firestore.rules` و`storage.rules` **لازم يطابق `VITE_ADMIN_EMAIL` بالضبط** — لو غيّرتي الإيميل يوماً، لازم تحدّثين الثلاثة مكان وتعيدين نشر القواعد
- أرقام الطلبات تُولَّد بـ `crypto.getRandomValues` (غير قابلة للتخمين) — تتبع الطلب يعتمد عليها
- CSP وHeaders أمنية ثانية مضبوطة بـ `vercel.json` (مو `firebase.json` — الموقع مستضاف على Vercel)

## 🛠️ إعدادات Firebase Console المطلوبة

### Authentication
- فعّل Email/Password (و Google لو تبين تسجيل دخول بجوجل)
- أنشئ حساب الأدمن بنفس الإيميل الموجود بـ `VITE_ADMIN_EMAIL`

### Firestore
- أنشئ قاعدة بيانات (Production mode)
- انشري `firestore.rules` (خطوة 4 أعلاه)
