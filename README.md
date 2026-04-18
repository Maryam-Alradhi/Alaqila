# 🏪 متجر العقيلة

متجر إلكتروني مبني على React + Firebase.

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
| `VITE_TELEGRAM_BOT_TOKEN` | أنشئ بوت عبر @BotFather في Telegram |
| `VITE_TELEGRAM_CHAT_ID` | افتح: api.telegram.org/bot<TOKEN>/getUpdates بعد إرسال رسالة |
| `VITE_BENEFIT_IBAN` | رقم الـ IBAN الحقيقي لحسابك البنكي |
| `VITE_WHATSAPP_NUMBER` | رقم الواتساب بدون + (مثال: 97337573375) |

> ⚠️ لا ترفع ملف .env على GitHub أبداً — محمي في .gitignore

---

### 2. تثبيت وتشغيل

```bash
npm install
npm run dev
```

---

### 3. ضبط Firestore Security Rules (مهم!)

1. افتح Firebase Console → Firestore → Rules
2. انسخ محتوى ملف `firestore.rules` والصقه
3. اضغط Publish

---

### 4. نشر الموقع

```bash
npm run build
firebase deploy
```

---

## 🔐 ملاحظات أمنية

- المفاتيح كلها في `.env` — لا تُكشَف في الكود
- Security Rules مضبوطة: العملاء يكتبون، الإدمن يقرأ/يعدل
- أرقام الطلبات تُولَّد بـ `crypto.getRandomValues` (لا يمكن تخمينها)
- CSP Headers مضبوطة في `firebase.json`

## 🛠️ إعدادات Firebase Console

### Authentication
- فعّل Email/Password
- أنشئ حساب إدمن: Authentication → Add user

### Firestore
- أنشئ قاعدة بيانات في Production mode
- طبّق قواعد `firestore.rules`
