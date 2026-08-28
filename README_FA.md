# H2 Telegram Mini App — Vercel Native Export

این نسخه برای دانلود PDF و Excel در Telegram Mini Apps طراحی شده است.

## ساختار

- `index.html` — خود Mini App
- `api/export-upload.js` — فایل ساخته‌شده در مرورگر را موقتاً در Vercel Blob قرار می‌دهد
- `api/export-download.js` — فایل را با headerهای مناسب Telegram تحویل می‌دهد و Blob موقت را حذف می‌کند
- `api/health.js` — تست سلامت API
- `package.json` — وابستگی `@vercel/blob`

## استقرار

1. تمام فایل‌های این پوشه را در ریشه Repository گیت‌هاب پروژه قرار دهید.
2. Repository را در Vercel Import کنید و Framework Preset را روی `Other` بگذارید.
3. Deploy کنید.
4. در پروژه Vercel از بخش Storage یک Blob store بسازید و به همین پروژه متصل کنید.
5. بعد از اتصال Blob، یک Redeploy انجام دهید.
6. آدرس زیر را تست کنید:
   `https://YOUR-PROJECT.vercel.app/api/health`
   باید JSON با `"ok": true` ببینید.
7. URL اصلی Mini App را در BotFather به URL جدید Vercel تغییر دهید.

## منطق دانلود

روی Telegram نسخه 8.0 به بالا:

1. PDF/Excel در خود مرورگر ساخته می‌شود.
2. فایل به `/api/export-upload` ارسال می‌شود.
3. Backend یک URL HTTPS موقت می‌سازد.
4. Mini App از `Telegram.WebApp.downloadFile()` استفاده می‌کند.
5. `/api/export-download` فایل را با `Content-Disposition: attachment` و `Access-Control-Allow-Origin: https://web.telegram.org` تحویل می‌دهد.
6. Blob موقت پس از خوانده‌شدن حذف می‌شود.

## محدودیت

برای مسیر native، فایل خام حداکثر 3 MB در نظر گرفته شده تا زیر محدودیت payload تابع Vercel باقی بماند. فایل‌های بزرگ‌تر به fallback مرورگر می‌روند.
