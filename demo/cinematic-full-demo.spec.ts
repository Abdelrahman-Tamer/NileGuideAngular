import { expect, Locator, Page, test, TestInfo } from '@playwright/test';
import path from 'node:path';

const DEMO_USER_EMAIL = env('DEMO_USER_EMAIL', env('DEMO_EMAIL', ''));
const DEMO_USER_PASSWORD = env('DEMO_USER_PASSWORD', env('DEMO_PASSWORD', ''));
const DEMO_ADMIN_EMAIL = env('DEMO_ADMIN_EMAIL', '');
const DEMO_ADMIN_PASSWORD = env('DEMO_ADMIN_PASSWORD', '');

const DEMO_SEARCH_TERM = env('DEMO_SEARCH_TERM', 'pyramid');
const DEMO_PLAN_DATE = env('DEMO_PLAN_DATE', '2026-06-28');
const DEMO_PLAN_TIME = env('DEMO_PLAN_TIME', '10:00');
const DEMO_PLAN_PERIOD = env('DEMO_PLAN_PERIOD', 'AM').toUpperCase();
const DEMO_PAUSE_MS = Number(env('DEMO_PAUSE_MS', '900'));
const DEMO_TIMESTAMP = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

const assetsDir = path.resolve(__dirname, 'assets');
const demoUserImage = path.join(assetsDir, 'demo-user.png');
const demoActivityImage = path.join(assetsDir, 'demo-activity.png');
const demoAiFile = path.join(assetsDir, 'demo-ai-file.txt');
const demoAiFileUpdated = path.join(assetsDir, 'demo-ai-file-updated.txt');

const stepResults: Array<{ step: string; status: 'done' | 'warning' | 'failed'; note?: string }> = [];
const screenshotNames = new Set<string>();

test.describe.configure({ mode: 'serial' });

test.describe('NileGuide cinematic full demo', () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(20_000);
    page.on('dialog', async (dialog) => dialog.accept().catch(() => undefined));

    // Clear storage once at the start, NOT via addInitScript which runs on every navigation
    // and would destroy the JWT login token between steps
    await page.goto('about:blank');
    await page.evaluate(() => {
      try { localStorage.clear(); } catch (_) {}
      try { sessionStorage.clear(); } catch (_) {}
    });
  });

  test('cinematic user journey then admin journey', async ({ page }, testInfo) => {
    validateCredentials();
    await prepareDemoPage(page);

    await requiredStep(page, testInfo, '01 Tourist login from real UI', async () => {
      await login(page, DEMO_USER_EMAIL, DEMO_USER_PASSWORD, 'tourist');
    });

    await softStep(page, testInfo, '02 Tourist home overview', async () => {
      await go(page, '/home');
      await waitForAnyText(page, [/plan your perfect egyptian adventure/i, /discover egypt/i, /nileguide/i]);
      await cinematicScroll(page, 650);
      await cinematicScroll(page, 650);
      await cinematicScroll(page, -420);
    });

    await softStep(page, testInfo, '03 Tourist activities search, filters, sort', async () => {
      await go(page, '/activities');
      await waitForActivitiesReady(page);

      await fillNice(page.getByPlaceholder(/search activities/i), DEMO_SEARCH_TERM);
      await clickNice(page.getByRole('button', { name: /^search$/i }));
      await waitForActivitiesReady(page);

      await selectByValueOrIndex(page.locator('#activities-list select').first(), 'priceLowToHigh', 1);
      await waitForUi(page);

      await clickNice(page.locator('aside button').first(), { optional: true });
      await waitForUi(page);
      await clickNice(page.locator('aside button').nth(1), { optional: true });
      await waitForUi(page);

      await cinematicScroll(page, 550);
      await cinematicScroll(page, -300);
    });

    await softStep(page, testInfo, '04 Tourist details, gallery, wishlist, review preview', async () => {
      await go(page, '/activities');
      await waitForActivitiesReady(page);
      await clickNice(page.getByRole('link', { name: /view details/i }).first());
      await waitForAnyText(page, [/about this activity/i, /gallery/i, /reviews/i]);

      await clickNice(page.getByRole('button', { name: /^save$/i }), { optional: true });
      await cinematicScroll(page, 700);
      await clickNice(page.locator('button').filter({ hasText: /^›$|next/i }).first(), { optional: true });
      await cinematicScroll(page, 650);

      await fillNice(page.getByPlaceholder(/your city/i), 'Cairo', { optional: true });
      await selectByValueOrIndex(page.locator('select').last(), '5', 4, true);
      await fillNice(page.getByPlaceholder(/write your review/i), 'Great automated demo review for NileGuide.', { optional: true });
      await clickNice(page.getByRole('button', { name: /submit review/i }), { optional: true });
      await waitForUi(page, 1200);
    });

    await softStep(page, testInfo, '05 Tourist add activity to schedule', async () => {
      await go(page, '/activities');
      await waitForActivitiesReady(page);
      await clickNice(page.getByRole('button', { name: /add to plan/i }).first());
      await waitForAnyText(page, [/add to schedule/i, /choose your preferred date/i]);
      await setInputValue(page.getByPlaceholder(/yyyy-mm-dd/i).first(), DEMO_PLAN_DATE);
      await fillNice(page.getByPlaceholder(/hh:mm/i).first(), DEMO_PLAN_TIME);
      await selectByValueOrIndex(page.locator('select').last(), DEMO_PLAN_PERIOD, DEMO_PLAN_PERIOD === 'PM' ? 1 : 0);
      await clickNice(page.getByRole('button', { name: /^add to schedule$/i }).last());
      await waitForAnyText(page, [/added/i, /schedule/i, /conflict/i, /outside/i, /failed/i], true);
    });

    await softStep(page, testInfo, '06 Tourist wishlist page', async () => {
      await go(page, '/wishlist');
      await waitForAnyText(page, [/my wishlist/i, /wishlist is empty/i, /saved activities/i]);
      await cinematicScroll(page, 600);
      await clickNice(page.getByRole('link', { name: /view details/i }).first(), { optional: true });
      await waitForUi(page, 900);
    });

    await softStep(page, testInfo, '07 Tourist schedule and export', async () => {
      await go(page, '/schedule');
      await waitForAnyText(page, [/my egypt schedule/i, /your schedule is empty/i, /total activities/i]);
      await cinematicScroll(page, 450);

      const downloadPromise = page.waitForEvent('download', { timeout: 6000 }).catch(() => null);
      await clickNice(page.getByRole('button', { name: /export/i }), { optional: true });
      const download = await downloadPromise;
      if (download) await download.saveAs(testInfo.outputPath('nileguide-schedule-demo.pdf'));
    });

    await softStep(page, testInfo, '08 Tourist interactive map', async () => {
      await go(page, '/map');
      await waitForAnyText(page, [/interactive map/i, /itinerary/i]);
      await selectByValueOrIndex(page.locator('select').first(), undefined, 1, true);
      await clickNice(page.locator('button[title="Center Map"]').first(), { optional: true });
      await cinematicScroll(page, 400);
    });

    await softStep(page, testInfo, '09 Tourist profile upload and preview', async () => {
      await go(page, '/profile');
      await waitForAnyText(page, [/welcome to egypt/i, /personal information/i, /travel preferences/i]);
      await page.locator('input[type="file"]').first().setInputFiles(demoUserImage).catch(() => undefined);
      await waitForUi(page);
      await clickNice(page.getByRole('button', { name: /upload/i }), { optional: true });
      await waitForUi(page, 1200);
      await cinematicScroll(page, 700);
      await cinematicScroll(page, -350);
    });

    await softStep(page, testInfo, '10 Tourist help center and FAQs', async () => {
      await go(page, '/help');
      await waitForAnyText(page, [/help center/i, /faq/i, /frequently/i]);
      await clickNice(page.locator('button').filter({ hasText: /features|available|how/i }).first(), { optional: true });
      await waitForUi(page);
      await cinematicScroll(page, 450);
    });

    await softStep(page, testInfo, '11 Tourist contact form', async () => {
      await go(page, '/contact');
      await waitForAnyText(page, [/get in touch/i, /contact/i]);
      await fillNice(page.getByPlaceholder(/john doe/i), 'NileGuide Demo User', { optional: true });
      await fillNice(page.getByPlaceholder(/john@example.com/i), DEMO_USER_EMAIL, { optional: true });
      await selectByValueOrIndex(page.locator('#subject, select').first(), 'Technical Support', 1, true);
      await fillNice(page.getByPlaceholder(/tell us how we can help/i), 'Professional automated demo check for NileGuide.', { optional: true });
      await clickNice(page.getByRole('button', { name: /send message/i }), { optional: true });
      await waitForAnyText(page, [/sent/i, /success/i, /configure emailjs/i, /failed/i], true);
    });

    await softStep(page, testInfo, '12 Tourist AI chatbot', async () => {
      await go(page, '/home');
      await clickNice(page.getByLabel(/open nileguide ai chat/i));
      await waitForAnyText(page, [/nileguide ai/i, /ask about egypt/i]);
      await fillNice(page.getByPlaceholder(/ask about egypt/i), 'Suggest a one day plan in Cairo.');
      await clickNice(page.getByLabel(/send message/i));
      await waitForAnyText(page, [/thinking/i, /cairo/i, /plan/i, /failed/i, /error/i], true, 12_000);
      await clickNice(page.getByLabel(/close chat/i), { optional: true });
    });

    await softStep(page, testInfo, '13 Tourist logout', async () => {
      await logout(page);
    });

    await requiredStep(page, testInfo, '14 Admin login from real UI', async () => {
      await login(page, DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, 'admin');
    });

    await softStep(page, testInfo, '15 Admin dashboard overview', async () => {
      await go(page, '/dashboard');
      await waitForAnyText(page, [/admin dashboard/i, /manage activities/i, /manage users/i]);
      await cinematicScroll(page, 380);
    });

    const demoUserEmail = `nileguide.demo.${DEMO_TIMESTAMP}@example.com`;
    const demoUserName = `NileGuide Demo ${DEMO_TIMESTAMP}`;
    await softStep(page, testInfo, '16 Admin users create, view, role, status, delete', async () => {
      await go(page, '/dashboard/users-management');
      await waitForAnyText(page, [/users management/i, /add new user/i]);
      await createDemoUser(page, demoUserName, demoUserEmail);
      await findAdminUser(page, demoUserEmail);
      await viewAdminUser(page, demoUserEmail);
      await changeAdminUserRole(page, demoUserEmail, 'Admin');
      await toggleAdminUserStatus(page, demoUserEmail);
      await toggleAdminUserStatus(page, demoUserEmail);
      await deleteAdminUser(page, demoUserEmail);
    });

    const demoActivityName = `NileGuide Demo Activity ${DEMO_TIMESTAMP}`;
    const updatedActivityName = `${demoActivityName} Updated`;
    await softStep(page, testInfo, '17 Admin activities create, view, update, delete', async () => {
      await go(page, '/dashboard/activities-management');
      await waitForAnyText(page, [/activities management/i, /add new activity/i]);
      await createDemoActivity(page, demoActivityName);
      await findAdminActivity(page, demoActivityName);
      await viewAdminActivity(page, demoActivityName);
      await updateAdminActivity(page, demoActivityName, updatedActivityName);
      await findAdminActivity(page, updatedActivityName);
      await deleteAdminActivity(page, updatedActivityName);
    });

    await softStep(page, testInfo, '18 Admin reports and analytics', async () => {
      await go(page, '/dashboard/reports');
      await waitForAnyText(page, [/admin report/i, /analytics/i, /activity views/i]);
      await cinematicScroll(page, 720);
      await clickNice(page.getByRole('button', { name: /refresh/i }), { optional: true });
      await waitForUi(page, 1000);
    });

    await softStep(page, testInfo, '19 Admin AI files upload, refresh, update, delete', async () => {
      await go(page, '/dashboard');
      await clickNice(page.getByLabel(/open nileguide ai files/i));
      await waitForAnyText(page, [/nileguide ai files/i, /upload/i, /files/i]);
      await page.locator('input[type="file"]').first().setInputFiles(demoAiFile);
      await waitForUi(page, 700);
      await clickNice(page.getByRole('button', { name: /confirm files/i }), { optional: true });
      await waitForAnyText(page, [/uploaded/i, /success/i, /failed/i, /attached/i], true, 10_000);
      await clickNice(page.getByRole('button', { name: /refresh/i }), { optional: true });
      await waitForUi(page, 1200);

      const fileCard = page.locator('div').filter({ hasText: /demo-ai-file/i }).filter({ has: page.getByLabel(/delete file/i) }).first();
      if (await isVisible(fileCard, 2500)) {
        await fileCard.locator('input[type="file"]').first().setInputFiles(demoAiFileUpdated).catch(async () => {
          await page.locator('input[type="file"]').nth(1).setInputFiles(demoAiFileUpdated).catch(() => undefined);
        });
        await waitForAnyText(page, [/updated/i, /success/i, /failed/i], true, 10_000);
        await clickNice(fileCard.getByLabel(/delete file/i), { optional: true });
        await clickNice(page.getByRole('button', { name: /yes|delete/i }).last(), { optional: true });
        await waitForAnyText(page, [/deleted/i, /success/i, /failed/i], true, 10_000);
      }

      await clickNice(page.getByLabel(/close ai files/i), { optional: true });
    });

    await softStep(page, testInfo, '20 Admin logout', async () => {
      await logout(page);
    });

    await attachSummary(testInfo);
  });
});

async function login(page: Page, email: string, password: string, role: 'tourist' | 'admin') {
  await go(page, '/auth/login');
  await waitForAnyText(page, [/welcome back/i, /sign in/i]);
  await fillNice(page.getByPlaceholder(/enter your email/i), email);
  await fillNice(page.getByPlaceholder(/enter your password/i), password);
  await clickNice(page.getByRole('button', { name: /^sign in$/i }));

  await Promise.race([
    page.getByText(/logged in successfully/i).waitFor({ state: 'visible', timeout: 25_000 }),
    page.waitForURL(role === 'admin' ? /\/dashboard/ : /\/(home|activities|profile)/, { timeout: 25_000 }),
  ]);

  await page.waitForURL(role === 'admin' ? /\/dashboard/ : /\/home/, { timeout: 35_000 }).catch(() => undefined);
  await waitForUi(page, 1300);

  const currentUrl = page.url();
  if (role === 'admin' && !currentUrl.includes('/dashboard')) {
    await go(page, '/dashboard');
  }
  if (role === 'tourist' && currentUrl.includes('/auth/login')) {
    await go(page, '/home');
  }
}

async function logout(page: Page) {
  await waitForUi(page, 500);
  const profileButton = page.locator('.profile-menu-wrapper button').first();

  if (await isVisible(profileButton, 4000)) {
    await clickNice(profileButton);
    const logoutButton = page.getByRole('button', { name: /logout/i });
    if (await clickNice(logoutButton, { optional: true })) {
      await waitForAnyText(page, [/sign in/i, /welcome back/i], true, 10_000);
      return;
    }
  }

  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await go(page, '/auth/login');
}

async function createDemoUser(page: Page, fullName: string, email: string) {
  await clickNice(page.getByRole('button', { name: /add new user/i }));
  await waitForAnyText(page, [/add new user/i]);
  await fillNice(page.getByPlaceholder(/e\.g\., ahmed mohamed/i), fullName);
  await fillNice(page.getByPlaceholder(/example@email\.com/i), email);
  await fillNice(page.getByPlaceholder(/enter password/i), 'DemoUser@123456');
  await fillNice(page.getByPlaceholder(/e\.g\., egyptian/i), 'Egyptian');
  await setInputValue(page.locator('input[type="date"]').first(), '1998-01-15');
  await selectByValueOrIndex(page.locator('select[formcontrolname="role"]').first(), 'User', 0, true);
  await page.locator('input[type="radio"][value="Active"]').check().catch(() => undefined);
  await page.locator('input[type="file"]').first().setInputFiles(demoUserImage).catch(() => undefined);
  await clickNice(page.getByRole('button', { name: /^add user$/i }));
  await waitForAnyText(page, [/created/i, /success/i, /already/i, /failed/i], true, 12_000);
}

async function findAdminUser(page: Page, email: string) {
  await go(page, '/dashboard/users-management');
  await fillNice(page.getByPlaceholder(/search users/i), email);
  await waitForUi(page, 1300);
  await waitForAnyText(page, [new RegExp(escapeRegExp(email), 'i'), /no users found/i], true);
}

async function viewAdminUser(page: Page, email: string) {
  const row = adminRow(page, email, 'View user');
  if (!(await isVisible(row, 3500))) return;
  await clickNice(row.locator('button[title="View user"]').first());
  await waitForAnyText(page, [/user details/i], true);
  await closeModal(page);
}

async function changeAdminUserRole(page: Page, email: string, role: 'User' | 'Admin') {
  await findAdminUser(page, email);
  const row = adminRow(page, email, 'Change role');
  if (!(await isVisible(row, 3500))) return;
  await clickNice(row.locator('button[title="Change role"]').first());
  await waitForAnyText(page, [/change role/i], true);
  await selectByValueOrIndex(page.locator('.fixed select').last(), role, role === 'Admin' ? 1 : 0, true);
  await clickNice(page.getByRole('button', { name: /^save$/i }), { optional: true });
  await waitForAnyText(page, [/updated/i, /success/i, /failed/i], true, 10_000);
}

async function toggleAdminUserStatus(page: Page, email: string) {
  await findAdminUser(page, email);
  const row = page.locator('div.grid.grid-cols-12').filter({ hasText: email }).filter({ has: page.locator('button[title="Block user"], button[title="Activate user"]') }).first();
  if (!(await isVisible(row, 3500))) return;
  await clickNice(row.locator('button[title="Block user"], button[title="Activate user"]').first());
  await clickNice(page.getByRole('button', { name: /yes|block|activate/i }).last(), { optional: true });
  await waitForAnyText(page, [/blocked/i, /activated/i, /updated/i, /success/i, /failed/i], true, 10_000);
}

async function deleteAdminUser(page: Page, email: string) {
  await findAdminUser(page, email);
  const row = adminRow(page, email, 'Delete user');
  if (!(await isVisible(row, 3500))) return;
  await clickNice(row.locator('button[title="Delete user"]').first());
  await clickNice(page.getByRole('button', { name: /yes|delete/i }).last(), { optional: true });
  await waitForAnyText(page, [/deleted/i, /removed/i, /success/i, /failed/i], true, 10_000);
}

async function createDemoActivity(page: Page, activityName: string) {
  await clickNice(page.getByRole('button', { name: /add new activity/i }));
  await waitForAnyText(page, [/add new activity/i]);
  await fillNice(page.getByPlaceholder(/pyramids of giza guided tour/i), activityName);
  await fillNice(page.getByPlaceholder(/brief description/i), 'Created by NileGuide automated cinematic demo.');
  await selectByValueOrIndex(page.locator('select[formcontrolname="categoryId"]').first(), undefined, 1, true);
  await selectByValueOrIndex(page.locator('select[formcontrolname="cityId"]').first(), undefined, 1, true);
  await fillNice(page.locator('input[formcontrolname="price"]').first(), '90');
  await fillNice(page.locator('input[formcontrolname="minPrice"]').first(), '70');
  await fillNice(page.locator('input[formcontrolname="priceCurrency"]').first(), 'USD');
  await fillNice(page.locator('input[formcontrolname="priceBasis"]').first(), 'per person');
  await fillNice(page.locator('input[formcontrolname="duration"]').first(), '120');
  await fillNice(page.locator('input[formcontrolname="groupSize"]').first(), 'Up to 12 people');
  await fillNice(page.locator('input[formcontrolname="cancellation"]').first(), 'Free cancellation up to 24 hours');
  await fillNice(page.locator('input[formcontrolname="requiredDocuments"]').first(), 'Passport or national ID');
  await fillNice(page.locator('input[formcontrolname="provider"]').first(), 'NileGuide');
  await fillNice(page.locator('input[formcontrolname="externalId"]').first(), `NG-DEMO-${DEMO_TIMESTAMP}`);
  await fillNice(page.locator('input[formcontrolname="region"]').first(), 'Greater Cairo');
  await fillNice(page.locator('input[formcontrolname="rating"]').first(), '4.8', { optional: true });
  await fillNice(page.locator('input[formcontrolname="latitude"]').first(), '29.9792');
  await fillNice(page.locator('input[formcontrolname="longitude"]').first(), '31.1342');
  await page.locator('input[type="radio"][value="Active"]').check().catch(() => undefined);
  await clickNice(page.getByRole('button', { name: /add booking link/i }), { optional: true });
  await fillNice(page.getByPlaceholder(/provider e\.g\. getyourguide/i).last(), 'GetYourGuide', { optional: true });
  await fillNice(page.getByPlaceholder(/booking url/i).last(), 'https://example.com/nileguide-demo-booking', { optional: true });
  await clickNice(page.getByRole('button', { name: /add hours|add opening hours/i }), { optional: true });
  await fillNice(page.getByPlaceholder(/open hour/i).last(), '9', { optional: true });
  await fillNice(page.getByPlaceholder(/close hour/i).last(), '5', { optional: true });
  await page.locator('input[type="file"]').first().setInputFiles(demoActivityImage).catch(() => undefined);
  await clickNice(page.getByRole('button', { name: /^add activity$/i }).last());
  await waitForAnyText(page, [/created/i, /success/i, /failed/i], true, 15_000);
}

async function findAdminActivity(page: Page, name: string) {
  await go(page, '/dashboard/activities-management');
  await fillNice(page.getByPlaceholder(/search activities/i), name);
  await waitForUi(page, 1500);
  await waitForAnyText(page, [new RegExp(escapeRegExp(name), 'i'), /no activities found/i], true);
}

async function viewAdminActivity(page: Page, name: string) {
  const row = adminRow(page, name, 'View activity');
  if (!(await isVisible(row, 3500))) return;
  await clickNice(row.locator('button[title="View activity"]').first());
  await waitForAnyText(page, [/activity details/i], true);
  await cinematicScroll(page, 400);
  await closeModal(page);
}

async function updateAdminActivity(page: Page, oldName: string, newName: string) {
  await findAdminActivity(page, oldName);
  const row = adminRow(page, oldName, 'Update activity');
  if (!(await isVisible(row, 3500))) return;
  await clickNice(row.locator('button[title="Update activity"]').first());
  await waitForAnyText(page, [/update activity/i], true);
  await fillNice(page.getByPlaceholder(/pyramids of giza guided tour/i), newName);
  await fillNice(page.getByPlaceholder(/brief description/i), 'Updated by NileGuide automated cinematic demo.');
  await fillNice(page.locator('input[formcontrolname="price"]').first(), '95');
  await page.locator('input[type="file"]').first().setInputFiles(demoActivityImage).catch(() => undefined);
  await clickNice(page.getByRole('button', { name: /^update activity$/i }).last());
  await waitForAnyText(page, [/updated/i, /success/i, /failed/i], true, 15_000);
}

async function deleteAdminActivity(page: Page, name: string) {
  await findAdminActivity(page, name);
  const row = adminRow(page, name, 'Delete activity');
  if (!(await isVisible(row, 3500))) return;
  await clickNice(row.locator('button[title="Delete activity"]').first());
  await clickNice(page.getByRole('button', { name: /yes|delete/i }).last(), { optional: true });
  await waitForAnyText(page, [/deleted/i, /archived/i, /success/i, /failed/i], true, 12_000);
}

function adminRow(page: Page, text: string, actionTitle: string) {
  return page
    .locator('div.grid.grid-cols-12')
    .filter({ hasText: text })
    .filter({ has: page.locator(`button[title="${actionTitle}"]`) })
    .first();
}

async function requiredStep(page: Page, testInfo: TestInfo, title: string, action: () => Promise<void>) {
  await runStep(page, testInfo, title, action, true);
}

async function softStep(page: Page, testInfo: TestInfo, title: string, action: () => Promise<void>) {
  await runStep(page, testInfo, title, action, false);
}

async function runStep(page: Page, testInfo: TestInfo, title: string, action: () => Promise<void>, required: boolean) {
  await test.step(title, async () => {
    await showBadge(page, title, 'running');
    await waitForUi(page, 500);

    try {
      await action();
      stepResults.push({ step: title, status: 'done' });
      await showBadge(page, title, 'done');
    } catch (error) {
      const note = error instanceof Error ? error.message : String(error);
      stepResults.push({ step: title, status: required ? 'failed' : 'warning', note });
      await showBadge(page, `${title}\n${required ? 'Failed' : 'Skipped/Warning'}: ${note.slice(0, 90)}`, required ? 'failed' : 'warning');
      if (required) {
        await capture(page, testInfo, title);
        throw error;
      }
    } finally {
      await waitForUi(page, 650);
      await capture(page, testInfo, title);
    }
  });
}

async function prepareDemoPage(page: Page) {
  await page.addStyleTag({
    content: `
      * { scroll-behavior: smooth !important; }
      #nileguide-demo-badge { white-space: pre-line; }
      .nileguide-demo-highlight {
        outline: 4px solid #e0b100 !important;
        outline-offset: 6px !important;
        box-shadow: 0 0 0 9999px rgba(0,0,0,.18), 0 0 32px rgba(224,177,0,.65) !important;
        border-radius: 18px !important;
        transition: outline .25s ease, box-shadow .25s ease !important;
      }
    `,
  }).catch(() => undefined);
}

async function showBadge(page: Page, title: string, status: 'running' | 'done' | 'warning' | 'failed') {
  await page.evaluate(
    ({ title, status }) => {
      let badge = document.getElementById('nileguide-demo-badge');
      if (!badge) {
        badge = document.createElement('div');
        badge.id = 'nileguide-demo-badge';
        badge.style.position = 'fixed';
        badge.style.left = '22px';
        badge.style.bottom = '22px';
        badge.style.zIndex = '999999';
        badge.style.maxWidth = '680px';
        badge.style.padding = '14px 18px';
        badge.style.borderRadius = '18px';
        badge.style.backdropFilter = 'blur(14px)';
        badge.style.font = '800 15px/1.45 Inter, system-ui, -apple-system, Segoe UI, sans-serif';
        badge.style.boxShadow = '0 20px 60px rgba(0,0,0,.45)';
        document.body.appendChild(badge);
      }

      const color = status === 'done' ? '#22c55e' : status === 'warning' ? '#f59e0b' : status === 'failed' ? '#ef4444' : '#e0b100';
      badge.style.color = color;
      badge.style.border = `1px solid ${color}80`;
      badge.style.background = 'rgba(8,7,5,.88)';
      badge.textContent = `${status === 'done' ? '✓' : status === 'warning' ? '!' : status === 'failed' ? '×' : '▶'} ${title}`;
    },
    { title, status }
  ).catch(() => undefined);
}

async function go(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await waitForUi(page, 900);
}

async function waitForUi(page: Page, ms = DEMO_PAUSE_MS) {
  await page.waitForTimeout(ms);
}

async function waitForActivitiesReady(page: Page) {
  await Promise.race([
    page.locator('.card-activity').first().waitFor({ state: 'visible', timeout: 18_000 }),
    page.getByText(/no activities found/i).waitFor({ state: 'visible', timeout: 18_000 }),
    page.getByText(/showing/i).waitFor({ state: 'visible', timeout: 18_000 }),
  ]).catch(() => undefined);
  await waitForUi(page, 700);
}

async function waitForAnyText(page: Page, patterns: RegExp[], optional = false, timeout = 8000) {
  const result = await Promise.race(
    patterns.map((pattern) => page.getByText(pattern).first().waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false))
  );

  if (!result && !optional) {
    throw new Error(`Expected one of these texts: ${patterns.map(String).join(', ')}`);
  }
}

async function isVisible(locator: Locator, timeout = 2000) {
  return locator.first().isVisible({ timeout }).catch(() => false);
}

async function clickNice(locator: Locator, options: { optional?: boolean } = {}) {
  const target = locator.first();
  if (!(await isVisible(target, options.optional ? 2500 : 6000))) {
    if (options.optional) return false;
    throw new Error('Clickable element was not visible.');
  }

  await highlight(target);
  await target.click({ timeout: 6000 }).catch(async () => target.click({ force: true, timeout: 6000 }));
  await waitForUi(target.page(), 450);
  return true;
}

async function fillNice(locator: Locator, value: string, options: { optional?: boolean } = {}) {
  const target = locator.first();
  if (!(await isVisible(target, options.optional ? 2500 : 6000))) {
    if (options.optional) return false;
    throw new Error('Input element was not visible.');
  }

  await highlight(target);
  await target.fill(value, { timeout: 6000 }).catch(async () => {
    await setInputValue(target, value);
  });
  await waitForUi(target.page(), 220);
  return true;
}

async function selectByValueOrIndex(locator: Locator, value?: string, index = 1, optional = false) {
  const target = locator.first();
  if (!(await isVisible(target, optional ? 2500 : 6000))) {
    if (optional) return false;
    throw new Error('Select element was not visible.');
  }

  await highlight(target);
  const optionCount = await target.locator('option').count().catch(() => 0);
  if (optionCount === 0) return false;

  if (value) {
    const selected = await target.selectOption(value, { timeout: 3000 }).then(() => true).catch(() => false);
    if (selected) return true;
  }

  await target.selectOption({ index: Math.min(index, Math.max(optionCount - 1, 0)) }).catch(() => undefined);
  await waitForUi(target.page(), 300);
  return true;
}

async function highlight(locator: Locator) {
  await locator.evaluate((element) => {
    const el = element as HTMLElement;
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    el.classList.add('nileguide-demo-highlight');
    window.setTimeout(() => el.classList.remove('nileguide-demo-highlight'), 1200);
  }).catch(() => undefined);
  await waitForUi(locator.page(), 450);
}

async function cinematicScroll(page: Page, pixels: number) {
  await page.mouse.wheel(0, pixels);
  await waitForUi(page, 900);
}

async function setInputValue(locator: Locator, value: string) {
  await locator.evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function closeModal(page: Page) {
  await clickNice(page.locator('.fixed button:has(i.fa-xmark)').last(), { optional: true });
  await waitForUi(page, 500);
}

async function capture(page: Page, testInfo: TestInfo, title: string) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'step';
  let name = `${slug}.png`;
  let i = 2;
  while (screenshotNames.has(name)) {
    name = `${slug}-${i}.png`;
    i += 1;
  }
  screenshotNames.add(name);
  await page.screenshot({ path: testInfo.outputPath(name), fullPage: false }).catch(() => undefined);
}

async function attachSummary(testInfo: TestInfo) {
  const summary = {
    generatedAt: new Date().toISOString(),
    totalSteps: stepResults.length,
    done: stepResults.filter((s) => s.status === 'done').length,
    warnings: stepResults.filter((s) => s.status === 'warning').length,
    failed: stepResults.filter((s) => s.status === 'failed').length,
    steps: stepResults,
  };

  await testInfo.attach('nileguide-demo-summary.json', {
    body: JSON.stringify(summary, null, 2),
    contentType: 'application/json',
  });
}

function validateCredentials() {
  const missing = [
    ['DEMO_USER_EMAIL', DEMO_USER_EMAIL],
    ['DEMO_USER_PASSWORD', DEMO_USER_PASSWORD],
    ['DEMO_ADMIN_EMAIL', DEMO_ADMIN_EMAIL],
    ['DEMO_ADMIN_PASSWORD', DEMO_ADMIN_PASSWORD],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

function env(name: string, fallback: string) {
  return process.env[name] || fallback;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
