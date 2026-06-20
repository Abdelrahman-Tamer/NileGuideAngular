# NileGuide Tourist Demo Script

Professional Playwright walkthrough for the local Angular frontend.

It covers:

- Tourist login through the real UI
- Home page presentation
- Activities search, filters, sort, details
- Wishlist save flow
- Optional Add To Schedule write action
- Wishlist page
- Schedule page and export button
- Interactive map
- Profile page preview
- Help Center FAQ
- Contact form fill
- AI chatbot open/send optional flow
- Logout

## 1) Install Playwright

```powershell
npm i -D @playwright/test
npm run demo:install
```

## 2) Run the demo locally

The config starts Angular automatically on `http://127.0.0.1:4200` and reuses it if it is already running.

```powershell
$env:DEMO_EMAIL="tourist@example.com"
$env:DEMO_PASSWORD="YourPassword123"
npm run demo:user
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

# Actually add a schedule item. Off by default to avoid duplicate demo data.
$env:DEMO_ADD_TO_SCHEDULE="true"
$env:DEMO_PLAN_DATE="2026-06-28"
$env:DEMO_PLAN_TIME="10:00"
$env:DEMO_PLAN_PERIOD="AM"

# Actually send a contact email. Off by default.
$env:DEMO_SEND_CONTACT="true"

# Actually send an AI chatbot message. Off by default.
$env:DEMO_RUN_AI="true"
```

## View results

```powershell
npm run demo:report
```

Playwright will create:

- HTML report in `playwright-report/`
- Video, screenshots, trace, and optional downloaded schedule PDF in `test-results/`

## Notes

- The demo runs against your local frontend, but API calls use whatever `STORED_KEYS.baseUrl` points to in `src/app/core/constants/Stored_keys.ts`.
- Keep credentials in environment variables, not inside the script.
- The script intentionally avoids destructive actions such as clearing wishlist or deleting schedule items.
