# NileGuide Cinematic Full Demo

نسخة أنضف من الديمو: معمولة للتصوير والمناقشة، مش مجرد test جامد.

## الفكرة

السكريبت يعمل Journey كامل:

1. Tourist/User login
2. Home
3. Activities search/filter/sort
4. Details + wishlist + review preview
5. Add to Schedule
6. Wishlist
7. Schedule + Export
8. Map
9. Profile upload preview
10. Help Center
11. Contact form
12. AI Chatbot
13. Logout
14. Admin login
15. Dashboard overview
16. Users create/view/role/status/delete
17. Activities create/view/update/delete
18. Reports
19. Admin AI files upload/update/delete
20. Logout

## ليه النسخة دي أحسن؟

- بتكمل الفيديو حتى لو جزء فرعي فشل بدل ما توقف الديمو كله.
- فيها badge واضح على الشاشة باسم كل خطوة.
- فيها highlight حوالين العنصر اللي بيتجرب.
- فيها scroll أهدى عشان الفيديو يطلع مفهوم.
- بتعمل CRUD على داتا Demo باسم timestamp، مش على داتا عشوائية.
- بتطلع screenshots + video + trace + summary JSON.

## التثبيت

```powershell
npm i
npm i -D @playwright/test
npm run demo:install
```

## التشغيل

استخدم single quotes مع الباسوردات المعقدة في PowerShell:

```powershell
$env:DEMO_USER_EMAIL='user-email@example.com'
$env:DEMO_USER_PASSWORD='user-password'

$env:DEMO_ADMIN_EMAIL='admin-email@example.com'
$env:DEMO_ADMIN_PASSWORD='admin-password'

npm run demo:full:headed
```

للتشغيل بدون فتح المتصفح:

```powershell
$env:DEMO_HEADLESS='true'
npm run demo:full
```

## التقرير والفيديو

```powershell
npm run demo:report
```

هتلاقي:

- `playwright-report/`
- `test-results/`
- فيديو لكل run
- trace
- screenshots
- `nileguide-demo-summary.json`

## إعدادات اختيارية

```powershell
$env:DEMO_BASE_URL='http://127.0.0.1:4200'
$env:DEMO_START_SERVER='false'   # لو ng serve مفتوح بالفعل
$env:DEMO_SLOW_MO='250'
$env:DEMO_PAUSE_MS='1100'
$env:DEMO_SEARCH_TERM='museum'
$env:DEMO_PLAN_DATE='2026-06-28'
$env:DEMO_PLAN_TIME='10:00'
$env:DEMO_PLAN_PERIOD='AM'
```

## ملاحظات مهمة

- السكريبت يفتح الفرونت لوكال على `http://127.0.0.1:4200`.
- الـ API المستخدمة هي الموجودة عندك في `src/app/core/constants/Stored_keys.ts`.
- لو عايز Backend لوكال، غيّر `baseUrl` هناك.
- الديمو بيعمل write actions فعلية: users, activities, contact, AI files, profile image, schedule.
