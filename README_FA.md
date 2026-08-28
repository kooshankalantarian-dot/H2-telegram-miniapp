# H2 Telegram Mini App — Netlify

این نسخه برای Netlify آماده شده است و Export فایل‌های PDF/Excel را با Netlify Functions + Netlify Blobs انجام می‌دهد.

## ساختار

- `index.html` رابط Mini App
- `netlify/functions/export-upload.js` ذخیره موقت فایل Export
- `netlify/functions/export-download.js` دانلود HTTPS مناسب Telegram
- `netlify/functions/health.js` تست Backend
- `netlify.toml` تنظیم مسیرهای `/api/*`
- `package.json` وابستگی `@netlify/blobs`

## Deploy

1. همه فایل‌ها را در root همان GitHub Repository آپلود کنید.
2. در Netlify گزینه Add new project > Import an existing project را بزنید.
3. GitHub و Repository پروژه را انتخاب کنید.
4. تنظیمات پیش‌فرض را نگه دارید و Publish/Deploy کنید.
5. بعد از Deploy، آدرس `/api/health` را تست کنید.
6. اگر JSON با `ok: true` دریافت شد، URL اصلی Netlify را در BotFather به عنوان Mini App URL قرار دهید.

Netlify Blobs از داخل Functions به شکل خودکار قابل استفاده است و Store جداگانه‌ای لازم نیست از قبل بسازید.
