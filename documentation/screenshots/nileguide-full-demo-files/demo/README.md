# NileGuide Full Professional Demo Script

Professional Playwright walkthrough for the local Angular frontend.

This version runs a complete **Tourist/User journey**, then logs out and runs a complete **Admin journey**.

## What it covers

### Tourist/User flow

- Login through the real UI
- Home page presentation
- Activities search, filters, sort
- Activity details
- Wishlist save
- Add to schedule
- Wishlist page
- Schedule page and export
- Interactive map
- Profile preview
- Help Center FAQ
- Contact form send
- NileGuide AI chatbot send
- Logout

### Admin flow

- Admin login
- Dashboard overview
- Users Management:
  - Add demo user
  - View demo user
  - Change role
  - Block / Activate
  - Delete demo user
- Activities Management:
  - Add demo activity with image
  - View activity
  - Update activity
  - Delete activity
- Reports page
- Admin AI Files:
  - Upload demo file
  - Refresh list
  - Update file when available
  - Delete uploaded demo file when available
- Logout

## 1) Install Playwright

```powershell
npm i -D @playwright/test
npm run demo:install
```

## 2) Run the full demo locally

The config starts Angular automatically on `http://127.0.0.1:4200` and reuses it if it is already running.

```powershell
$env:DEMO_USER_EMAIL="tourist@example.com"
$env:DEMO_USER_PASSWORD="TouristPassword123"

$env:DEMO_ADMIN_EMAIL="admin@example.com"
$env:DEMO_ADMIN_PASSWORD="AdminPassword123"

npm run demo:full
```

For visible browser recording:

```powershell
npm run demo:full:headed
```

## Useful options

```powershell
# Use another frontend URL
$env:DEMO_BASE_URL="http://127.0.0.1:4200"

# Run headless
$env:DEMO_HEADLESS="true"

# Disable auto-start server if ng serve is already open elsewhere
$env:DEMO_START_SERVER="false"

# Search term used on Activities page
$env:DEMO_SEARCH_TERM="pyramid"

# Schedule values used by Add To Plan
$env:DEMO_PLAN_DATE="2026-06-28"
$env:DEMO_PLAN_TIME="10:00"
$env:DEMO_PLAN_PERIOD="AM"
```

## Full demo write actions

Write actions are **ON by default** in `demo/full-demo.spec.ts`.

To turn any part off manually:

```powershell
$env:DEMO_ADD_TO_SCHEDULE="false"
$env:DEMO_SEND_CONTACT="false"
$env:DEMO_RUN_AI="false"
$env:DEMO_CRUD_USERS="false"
$env:DEMO_CRUD_ACTIVITIES="false"
$env:DEMO_CRUD_AI_FILES="false"
```

## View results

```powershell
npm run demo:report
```

Playwright creates:

- HTML report in `playwright-report/`
- Video, screenshots, trace, and downloaded schedule PDF in `test-results/`

## Notes

- The demo runs against your local frontend, but API calls use whatever `STORED_KEYS.baseUrl` points to in `src/app/core/constants/Stored_keys.ts`.
- Keep credentials in environment variables, not inside the script.
- The admin CRUD flow creates demo data with a timestamp, then updates/deletes that demo data so the recording proves the actions without targeting real records.
