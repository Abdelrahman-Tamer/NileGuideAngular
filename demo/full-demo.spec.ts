import { expect, Locator, Page, test, TestInfo } from '@playwright/test';
import path from 'node:path';

const DEMO_USER_EMAIL = process.env['DEMO_USER_EMAIL'] || process.env['DEMO_EMAIL'] || '';
const DEMO_USER_PASSWORD = process.env['DEMO_USER_PASSWORD'] || process.env['DEMO_PASSWORD'] || '';
const DEMO_ADMIN_EMAIL = process.env['DEMO_ADMIN_EMAIL'] || '';
const DEMO_ADMIN_PASSWORD = process.env['DEMO_ADMIN_PASSWORD'] || '';

const DEMO_SEARCH_TERM = process.env['DEMO_SEARCH_TERM'] || 'pyramid';
const DEMO_PLAN_DATE = process.env['DEMO_PLAN_DATE'] || '2026-06-28';
const DEMO_PLAN_TIME = process.env['DEMO_PLAN_TIME'] || '10:00';
const DEMO_PLAN_PERIOD = (process.env['DEMO_PLAN_PERIOD'] || 'AM').toUpperCase();
const DEMO_PAUSE_MS = Number(process.env['DEMO_PAUSE_MS'] || 650);
const DEMO_TIMESTAMP = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

// Full demo means write actions are ON by default.
// Set any of these to "false" only if you intentionally want a read-only recording.
const DEMO_ADD_TO_SCHEDULE = process.env['DEMO_ADD_TO_SCHEDULE'] !== 'false';
const DEMO_SEND_CONTACT = process.env['DEMO_SEND_CONTACT'] !== 'false';
const DEMO_RUN_AI = process.env['DEMO_RUN_AI'] !== 'false';
const DEMO_CRUD_USERS = process.env['DEMO_CRUD_USERS'] !== 'false';
const DEMO_CRUD_ACTIVITIES = process.env['DEMO_CRUD_ACTIVITIES'] !== 'false';
const DEMO_CRUD_AI_FILES = process.env['DEMO_CRUD_AI_FILES'] !== 'false';

const demoAssetDir = path.resolve(__dirname, 'assets');
const demoUserImagePath = path.join(demoAssetDir, 'demo-user.png');
const demoActivityImagePath = path.join(demoAssetDir, 'demo-activity.png');
const demoAiFilePath = path.join(demoAssetDir, 'demo-ai-file.txt');
const demoAiUpdateFilePath = path.join(demoAssetDir, 'demo-ai-file-updated.txt');

const screenshotNames = new Set<string>();

test.describe.configure({ mode: 'serial' });

test.describe('NileGuide full professional user + admin demo', () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(25_000);

    page.on('dialog', async (dialog) => {
      await dialog.accept().catch(() => undefined);
    });

    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('complete user flow then complete admin flow', async ({ page }, testInfo) => {
    validateRequiredCredentials();

    await runTouristJourney(page, testInfo);
    await runAdminJourney(page, testInfo);
  });
});

async function runTouristJourney(page: Page, testInfo: TestInfo) {
  await demoStep(page, testInfo, '01 Tourist Login', async () => {
    await login(page, DEMO_USER_EMAIL, DEMO_USER_PASSWORD, 'tourist');
  });

  await demoStep(page, testInfo, '02 Tourist Home Page', async () => {
    await page.goto('/home');
    await expect(page.getByRole('heading', { name: /plan your perfect egyptian adventure/i })).toBeVisible();
    await expect(page.getByText(/AI-powered journey starts here/i)).toBeVisible();
    await page.mouse.wheel(0, 620);
    await waitForUi(page);
    await expect(page.getByRole('heading', { name: /explore ancient cities/i })).toBeVisible();
  });

  await demoStep(page, testInfo, '03 Tourist Activities Search Filter Sort', async () => {
    await goByNavOrUrl(page, 'Activities', '/activities');
    await expect(page.getByRole('heading', { name: /curated experiences in egypt/i })).toBeVisible();
    await waitForCardsOrEmpty(page);

    const searchInput = page.getByPlaceholder(/search activities/i);
    await searchInput.fill(DEMO_SEARCH_TERM);
    await page.getByRole('button', { name: /^search$/i }).click();
    await waitForCardsOrEmpty(page);

    const noResults = await page.getByText(/no activities found/i).isVisible().catch(() => false);
    if (noResults) {
      await searchInput.fill('');
      await page.getByRole('button', { name: /^search$/i }).click();
      await waitForCardsOrEmpty(page);
    }

    await page.locator('select').filter({ hasText: /popularity/i }).selectOption('priceLowToHigh');
    await waitForCardsOrEmpty(page);

    const firstFilter = page.locator('aside button').first();
    if (await firstFilter.isVisible().catch(() => false)) {
      await firstFilter.click();
      await waitForCardsOrEmpty(page);

      const emptyAfterFilter = await page.getByText(/no activities found/i).isVisible().catch(() => false);
      if (emptyAfterFilter) {
        await firstFilter.click();
        await waitForCardsOrEmpty(page);
      }
    }
  });

  await demoStep(page, testInfo, '04 Tourist Activity Details Wishlist', async () => {
    await ensureAtLeastOneActivity(page);
    await page.getByRole('link', { name: /view details/i }).first().click();
    await expect(page).toHaveURL(/\/activities\/\d+/);
    await expect(page.getByRole('button', { name: /save|saved/i })).toBeVisible();

    const saveButton = page.getByRole('button', { name: /^save$/i });
    if (await saveButton.isVisible().catch(() => false)) {
      await saveButton.click();
      await expect(page.getByRole('button', { name: /^saved$/i })).toBeVisible({ timeout: 25_000 });
    }

    await page.mouse.wheel(0, 700);
    await waitForUi(page);
  });

  await demoStep(page, testInfo, '05 Tourist Add To Schedule', async () => {
    if (!DEMO_ADD_TO_SCHEDULE) return;

    await page.goto('/activities');
    await waitForCardsOrEmpty(page);
    await ensureAtLeastOneActivity(page);
    await page.getByRole('button', { name: /^add to plan$/i }).first().click();
    await expect(page.getByRole('heading', { name: /add to schedule/i })).toBeVisible({ timeout: 25_000 });

    await setInputValue(page.getByPlaceholder(/yyyy-mm-dd/i), DEMO_PLAN_DATE);
    await page.getByPlaceholder(/hh:mm/i).fill(DEMO_PLAN_TIME);

    const periodSelect = page.locator('select').last();
    if (DEMO_PLAN_PERIOD === 'AM' || DEMO_PLAN_PERIOD === 'PM') {
      await periodSelect.selectOption(DEMO_PLAN_PERIOD);
    }

    await page.getByRole('button', { name: /^add to schedule$/i }).click();
    await expect(page.getByText(/added to schedule|conflicts|outside|failed/i)).toBeVisible({ timeout: 30_000 });
  });

  await demoStep(page, testInfo, '06 Tourist Wishlist Page', async () => {
    await page.goto('/wishlist');
    await expect(page.getByRole('heading', { name: /my wishlist/i })).toBeVisible();
    await expect(page.getByText(/saved activities|activities you want|your wishlist is empty|no wishlist/i)).toBeVisible();
    await page.mouse.wheel(0, 450);
    await waitForUi(page);
  });

  await demoStep(page, testInfo, '07 Tourist Schedule Export', async () => {
    await goByNavOrUrl(page, 'Schedule', '/schedule');
    await expect(page.getByRole('heading', { name: /my egypt schedule/i })).toBeVisible();
    await expect(page.getByText(/total activities/i)).toBeVisible();

    const emptySchedule = await page.getByText(/your schedule is empty/i).isVisible().catch(() => false);
    if (!emptySchedule) {
      const downloadPromise = page.waitForEvent('download', { timeout: 12_000 }).catch(() => null);
      await page.getByRole('button', { name: /export/i }).click();
      const download = await downloadPromise;
      if (download) {
        await download.saveAs(testInfo.outputPath('nileguide-schedule-demo.pdf'));
      }
    }
  });

  await demoStep(page, testInfo, '08 Tourist Interactive Map', async () => {
    await goByNavOrUrl(page, 'Map', '/map');
    await expect(page.getByRole('heading', { name: /interactive map/i })).toBeVisible();

    const citySelect = page.locator('select').first();
    const cityOptionsCount = await citySelect.locator('option').count().catch(() => 0);
    if (cityOptionsCount > 1) {
      await citySelect.selectOption({ index: 1 });
      await waitForUi(page);
    }

    await clickFirstIfExists(page.getByTitle(/center map/i));
    await clickFirstIfExists(page.getByRole('button', { name: /view/i }));
  });

  await demoStep(page, testInfo, '09 Tourist Profile Edit Preview', async () => {
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: /welcome to egypt/i })).toBeVisible({ timeout: 25_000 });
    await expect(page.getByPlaceholder(/enter your name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();

    const nationality = page.getByPlaceholder(/select nationality|enter nationality/i).first();
    if (await nationality.isVisible().catch(() => false)) {
      await nationality.click().catch(() => undefined);
    }

    await page.mouse.wheel(0, 700);
    await waitForUi(page);
  });

  await demoStep(page, testInfo, '10 Tourist Help Center FAQs', async () => {
    await page.goto('/help');
    await expect(page.getByRole('heading', { name: /help center/i })).toBeVisible();
    await page.getByRole('button', { name: /what features are available/i }).click();
    await expect(page.getByText(/personalized trip planning/i)).toBeVisible();
  });

  await demoStep(page, testInfo, '11 Tourist Contact Send', async () => {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { name: /get in touch/i })).toBeVisible();
    await page.getByPlaceholder(/john doe/i).fill('NileGuide Demo User');
    await page.getByPlaceholder(/john@example.com/i).fill(DEMO_USER_EMAIL);
    await page.locator('#subject').selectOption('Technical Support');
    await page.getByPlaceholder(/tell us how we can help/i).fill('Automated professional full demo check for NileGuide.');

    if (DEMO_SEND_CONTACT) {
      await page.getByRole('button', { name: /send message/i }).click();
      await expect(page.getByText(/sent successfully|configure emailjs|failed|success/i)).toBeVisible({ timeout: 25_000 });
    }
  });

  await demoStep(page, testInfo, '12 Tourist AI Chatbot Send', async () => {
    await page.goto('/home');
    await expect(page.getByLabel(/open nileguide ai chat/i)).toBeVisible({ timeout: 25_000 });
    await page.getByLabel(/open nileguide ai chat/i).click();
    await expect(page.getByRole('heading', { name: /nileguide ai/i })).toBeVisible();

    if (DEMO_RUN_AI) {
      await page.getByPlaceholder(/ask about egypt/i).fill('Suggest a one day plan in Cairo.');
      await page.getByLabel(/send message/i).click();
      await expect(page.getByText(/thinking|cairo|error|failed|plan/i)).toBeVisible({ timeout: 50_000 });
    }

    await clickFirstIfExists(page.getByLabel(/close chat/i));
  });

  await demoStep(page, testInfo, '13 Tourist Logout', async () => {
    await logout(page);
  });
}

async function runAdminJourney(page: Page, testInfo: TestInfo) {
  const createdUserEmail = `nileguide.demo.user.${DEMO_TIMESTAMP}@example.com`;
  const createdUserName = `NileGuide Demo User ${DEMO_TIMESTAMP}`;
  const createdActivityName = `NileGuide Demo Activity ${DEMO_TIMESTAMP}`;
  const updatedActivityName = `${createdActivityName} Updated`;

  await demoStep(page, testInfo, '14 Admin Login', async () => {
    await login(page, DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, 'admin');
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible({ timeout: 25_000 });
  });

  await demoStep(page, testInfo, '15 Admin Dashboard Overview', async () => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();
    await expect(page.getByText(/manage activities, bookings, and content/i)).toBeVisible();
    await expect(page.getByText(/manage users/i)).toBeVisible();
    await expect(page.getByText(/manage activities/i)).toBeVisible();
    await expect(page.getByText(/view reports/i)).toBeVisible();
  });

  await demoStep(page, testInfo, '16 Admin Users CRUD', async () => {
    if (!DEMO_CRUD_USERS) return;

    await page.goto('/dashboard/users-management');
    await expect(page.getByRole('heading', { name: /users management/i })).toBeVisible({ timeout: 25_000 });

    await createDemoUser(page, createdUserName, createdUserEmail);
    await searchAdminUsers(page, createdUserEmail);

    const userRow = await getAdminUserRow(page, createdUserEmail);
    await userRow.locator('button[title="View user"]').click();
    await expect(page.getByRole('heading', { name: /user details/i })).toBeVisible();
    await closeModalByHeading(page, 'User Details');

    await searchAdminUsers(page, createdUserEmail);
    const userRowForRole = await getAdminUserRow(page, createdUserEmail);
    await userRowForRole.locator('button[title="Change role"]').click();
    await expect(page.getByRole('heading', { name: /change role/i })).toBeVisible();
    await page.locator('select').last().selectOption('Admin');
    await page.getByRole('button', { name: /^save$/i }).click();
    await waitForToastOrQuiet(page, /role updated|failed/i);

    await searchAdminUsers(page, createdUserEmail);
    const userRowForBlock = await getAdminUserRow(page, createdUserEmail);
    await userRowForBlock.locator('button[title="Block user"], button[title="Activate user"]').click();
    await page.getByRole('button', { name: /yes, block|yes, activate/i }).click();
    await waitForToastOrQuiet(page, /blocked|activated|failed/i);

    await searchAdminUsers(page, createdUserEmail);
    const userRowForStatus = await getAdminUserRow(page, createdUserEmail);
    await userRowForStatus.locator('button[title="Block user"], button[title="Activate user"]').click();
    await page.getByRole('button', { name: /yes, block|yes, activate/i }).click();
    await waitForToastOrQuiet(page, /blocked|activated|failed/i);

    await searchAdminUsers(page, createdUserEmail);
    const userRowForDelete = await getAdminUserRow(page, createdUserEmail);
    await userRowForDelete.locator('button[title="Delete user"]').click();
    await page.getByRole('button', { name: /yes, delete/i }).click();
    await waitForToastOrQuiet(page, /deleted|failed/i);
  });

  await demoStep(page, testInfo, '17 Admin Activities CRUD', async () => {
    if (!DEMO_CRUD_ACTIVITIES) return;

    await page.goto('/dashboard/activities-management');
    await expect(page.getByRole('heading', { name: /activities management/i })).toBeVisible({ timeout: 25_000 });

    await createDemoActivity(page, createdActivityName);
    await searchAdminActivities(page, createdActivityName);

    const activityRow = await getAdminActivityRow(page, createdActivityName);
    await activityRow.locator('button[title="View activity"]').click();
    await expect(page.getByRole('heading', { name: /activity details/i })).toBeVisible();
    await closeModalByHeading(page, 'Activity Details');

    await searchAdminActivities(page, createdActivityName);
    const activityRowForEdit = await getAdminActivityRow(page, createdActivityName);
    await activityRowForEdit.locator('button[title="Update activity"]').click();
    await expect(page.getByRole('heading', { name: /update activity/i })).toBeVisible();
    await page.getByPlaceholder(/e\.g\., pyramids of giza guided tour/i).fill(updatedActivityName);
    await page.getByPlaceholder(/brief description of the activity/i).fill(
      'Updated by the automated NileGuide full demo. This validates admin update activity flow.'
    );
    await page.getByPlaceholder(/45/i).fill('95');
    await page.getByRole('button', { name: /update activity/i }).click();
    await waitForToastOrQuiet(page, /updated|failed/i);

    await searchAdminActivities(page, updatedActivityName);
    const activityRowForDelete = await getAdminActivityRow(page, updatedActivityName);
    await activityRowForDelete.locator('button[title="Delete activity"]').click();
    await page.getByRole('button', { name: /yes|delete/i }).last().click();
    await waitForToastOrQuiet(page, /deleted|archived|failed/i);
  });

  await demoStep(page, testInfo, '18 Admin Reports', async () => {
    await page.goto('/dashboard/reports');
    await expect(page.getByRole('heading', { name: /admin report/i })).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText(/analytics and insights/i)).toBeVisible();
    await expect(page.getByText(/activity views/i)).toBeVisible({ timeout: 25_000 });
    await page.mouse.wheel(0, 700);
    await waitForUi(page);
  });

  await demoStep(page, testInfo, '19 Admin AI Files CRUD', async () => {
    if (!DEMO_CRUD_AI_FILES) return;

    await page.goto('/dashboard');
    await expect(page.getByLabel(/open nileguide ai files/i)).toBeVisible({ timeout: 25_000 });
    await page.getByLabel(/open nileguide ai files/i).click();
    await expect(page.getByRole('heading', { name: /nileguide ai files/i })).toBeVisible();

    await page.locator('input[type="file"]').first().setInputFiles(demoAiFilePath);
    await expect(page.getByText(/demo-ai-file\.txt/i)).toBeVisible();
    await page.getByRole('button', { name: /confirm files/i }).click();
    await waitForToastOrQuiet(page, /uploaded|attached|failed|success/i);

    await page.getByRole('button', { name: /refresh/i }).click();
    await waitForUi(page, 1000);

    const uploadedFileCard = page.locator('div').filter({ hasText: /demo-ai-file\.txt/i }).filter({ has: page.getByLabel(/update file/i) }).first();
    if (await uploadedFileCard.isVisible().catch(() => false)) {
      await uploadedFileCard.getByLabel(/update file/i).locator('xpath=preceding-sibling::input[1]').setInputFiles(demoAiUpdateFilePath).catch(async () => {
        await page.locator('input[type="file"]').nth(1).setInputFiles(demoAiUpdateFilePath);
      });
      await waitForToastOrQuiet(page, /updated|failed|success/i);
    }

    const deleteCard = page.locator('div').filter({ hasText: /demo-ai-file/i }).filter({ has: page.getByLabel(/delete file/i) }).first();
    if (await deleteCard.isVisible().catch(() => false)) {
      await deleteCard.getByLabel(/delete file/i).click();
      await page.getByRole('button', { name: /yes, delete/i }).click();
      await waitForToastOrQuiet(page, /deleted|failed|success/i);
    }

    await clickFirstIfExists(page.getByLabel(/close ai files/i));
  });

  await demoStep(page, testInfo, '20 Admin Logout', async () => {
    await logout(page);
  });
}

async function login(page: Page, email: string, password: string, role: 'tourist' | 'admin') {
  await page.goto('/auth/login');
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  await page.getByPlaceholder(/enter your email/i).fill(email);
  await page.getByPlaceholder(/enter your password/i).fill(password);
  await page.getByRole('button', { name: /^sign in$/i }).click();

  await expect(page.getByText(/logged in successfully/i)).toBeVisible({ timeout: 25_000 });

  if (role === 'admin') {
    await page.waitForURL(/\/dashboard(?:\/.*)?(?:\?.*)?$/, { timeout: 15_000 });
  } else {
    await page.waitForURL(/\/home(?:\?.*)?$/, { timeout: 15_000 });
  }
}

async function logout(page: Page) {
  await page.goto('/home').catch(() => undefined);
  await waitForUi(page, 800);

  const profileButton = page.locator('.profile-menu-wrapper button').first();
  if (await profileButton.isVisible().catch(() => false)) {
    await profileButton.click();
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible({ timeout: 15_000 });
    return;
  }

  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('/auth/login');
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
}

async function createDemoUser(page: Page, fullName: string, email: string) {
  await page.getByRole('button', { name: /add new user/i }).click();
  await expect(page.getByRole('heading', { name: /^add new user$/i })).toBeVisible();

  await page.getByPlaceholder(/e\.g\., ahmed mohamed/i).fill(fullName);
  await page.getByPlaceholder(/example@email\.com/i).fill(email);
  await page.getByPlaceholder(/enter password/i).fill('DemoUser@123456');
  await page.getByPlaceholder(/e\.g\., egyptian/i).fill('Egyptian');
  await setInputValue(page.locator('input[type="date"]').first(), '1998-01-15');
  await page.locator('select[formcontrolname="role"], select').filter({ hasText: /user/i }).last().selectOption('User');
  await page.locator('input[type="radio"][value="Active"]').check();
  await page.locator('input[type="file"]').first().setInputFiles(demoUserImagePath);

  await page.getByRole('button', { name: /^add user$/i }).click();
  await waitForToastOrQuiet(page, /user created|failed|already exists/i);
}

async function createDemoActivity(page: Page, activityName: string) {
  await page.getByRole('button', { name: /add new activity/i }).click();
  await expect(page.getByRole('heading', { name: /^add new activity$/i })).toBeVisible();

  await page.getByPlaceholder(/e\.g\., pyramids of giza guided tour/i).fill(activityName);
  await page.getByPlaceholder(/brief description of the activity/i).fill(
    'Created by the automated NileGuide full demo. This validates activity creation, editing, viewing and deletion.'
  );

  await selectFirstRealOption(page.locator('select[formcontrolname="categoryId"]').first());
  await selectFirstRealOption(page.locator('select[formcontrolname="cityId"]').first());

  await page.getByPlaceholder(/45/i).fill('80');
  await page.getByPlaceholder(/35/i).fill('60');
  await page.getByPlaceholder(/USD/i).fill('USD');
  await page.getByPlaceholder(/per person/i).fill('per person');
  await page.getByPlaceholder(/180/i).fill('120');
  await page.getByPlaceholder(/1-12 people/i).fill('Up to 12 people');
  await page.getByPlaceholder(/free cancellation/i).fill('Free cancellation up to 24 hours');
  await page.getByPlaceholder(/passport or national id/i).fill('Passport or national ID');
  await page.getByPlaceholder(/NileGuide/i).fill('NileGuide');
  await page.getByPlaceholder(/NG-PYRAMIDS-001/i).fill(`NG-DEMO-${DEMO_TIMESTAMP}`);
  await page.getByPlaceholder(/Greater Cairo/i).fill('Greater Cairo');
  await page.getByPlaceholder(/4\.8/i).fill('4.8');
  await page.getByPlaceholder(/29\.9792/i).fill('29.9792');
  await page.getByPlaceholder(/31\.1342/i).fill('31.1342');
  await page.locator('input[type="radio"][value="Active"]').check();

  await page.getByRole('button', { name: /add booking link/i }).click();
  await page.getByPlaceholder(/provider e\.g\. getyourguide/i).last().fill('GetYourGuide');
  await page.getByPlaceholder(/booking url/i).last().fill('https://example.com/nileguide-demo-booking');

  await page.getByRole('button', { name: /add opening hours/i }).click();
  await page.getByPlaceholder(/open hour/i).last().fill('9');
  await page.getByPlaceholder(/close hour/i).last().fill('5');

  await page.locator('input[type="file"]').first().setInputFiles(demoActivityImagePath);
  await page.getByRole('button', { name: /^add activity$/i }).click();
  await waitForToastOrQuiet(page, /created|failed/i);
}

async function searchAdminUsers(page: Page, query: string) {
  await page.goto('/dashboard/users-management');
  await expect(page.getByRole('heading', { name: /users management/i })).toBeVisible({ timeout: 25_000 });
  await page.getByPlaceholder(/search users/i).fill(query);
  await waitForUi(page, 900);
}

async function searchAdminActivities(page: Page, query: string) {
  await page.goto('/dashboard/activities-management');
  await expect(page.getByRole('heading', { name: /activities management/i })).toBeVisible({ timeout: 25_000 });
  await page.getByPlaceholder(/search activities/i).fill(query);
  await waitForUi(page, 1100);
}

async function getAdminUserRow(page: Page, email: string): Promise<Locator> {
  await expect(page.getByText(email)).toBeVisible({ timeout: 25_000 });
  const row = page.locator('div.grid.grid-cols-12').filter({ hasText: email }).filter({ has: page.locator('button[title="View user"]') }).first();
  await expect(row).toBeVisible();
  return row;
}

async function getAdminActivityRow(page: Page, name: string): Promise<Locator> {
  await expect(page.getByText(name)).toBeVisible({ timeout: 25_000 });
  const row = page.locator('div.grid.grid-cols-12').filter({ hasText: name }).filter({ has: page.locator('button[title="View activity"]') }).first();
  await expect(row).toBeVisible();
  return row;
}

async function selectFirstRealOption(select: Locator) {
  await expect(select).toBeVisible({ timeout: 25_000 });
  await expect.poll(async () => select.locator('option').count()).toBeGreaterThan(1);
  await select.selectOption({ index: 1 });
}

async function closeModalByHeading(page: Page, headingText: string) {
  const closeButton = page
    .locator('h2')
    .filter({ hasText: new RegExp(`^${escapeRegExp(headingText)}$`, 'i') })
    .locator('xpath=following-sibling::button[1]');

  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click();
    await waitForUi(page, 500);
  }
}

async function demoStep(page: Page, testInfo: TestInfo, title: string, action: () => Promise<void>) {
  await test.step(title, async () => {
    await showBadge(page, title);
    await waitForUi(page);
    await action();
    await showBadge(page, `Done: ${title}`);
    await waitForUi(page);
    await capture(page, testInfo, title);
  });
}

function validateRequiredCredentials() {
  const missing: string[] = [];

  if (!DEMO_USER_EMAIL) missing.push('DEMO_USER_EMAIL');
  if (!DEMO_USER_PASSWORD) missing.push('DEMO_USER_PASSWORD');
  if (!DEMO_ADMIN_EMAIL) missing.push('DEMO_ADMIN_EMAIL');
  if (!DEMO_ADMIN_PASSWORD) missing.push('DEMO_ADMIN_PASSWORD');

  if (missing.length) {
    throw new Error(`Missing demo credentials: ${missing.join(', ')}.`);
  }
}

async function showBadge(page: Page, title: string) {
  await page
    .evaluate((text) => {
      const id = 'nileguide-demo-badge';
      let badge = document.getElementById(id);

      if (!badge) {
        badge = document.createElement('div');
        badge.id = id;
        badge.style.position = 'fixed';
        badge.style.left = '24px';
        badge.style.bottom = '24px';
        badge.style.zIndex = '999999';
        badge.style.maxWidth = '620px';
        badge.style.padding = '14px 18px';
        badge.style.borderRadius = '18px';
        badge.style.border = '1px solid rgba(242,185,13,.45)';
        badge.style.background = 'rgba(0,0,0,.84)';
        badge.style.color = '#f2b90d';
        badge.style.font = '700 16px/1.35 system-ui, -apple-system, Segoe UI, sans-serif';
        badge.style.boxShadow = '0 18px 50px rgba(0,0,0,.35)';
        badge.style.backdropFilter = 'blur(10px)';
        document.body.appendChild(badge);
      }

      badge.textContent = text;
    }, title)
    .catch(() => undefined);
}

async function capture(page: Page, testInfo: TestInfo, title: string) {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 70) || 'step';

  let name = `${slug}.png`;
  let index = 2;
  while (screenshotNames.has(name)) {
    name = `${slug}-${index}.png`;
    index += 1;
  }
  screenshotNames.add(name);

  await page.screenshot({ path: testInfo.outputPath(name), fullPage: false }).catch(() => undefined);
}

async function goByNavOrUrl(page: Page, linkName: string, url: string) {
  const navLink = page.getByRole('link', { name: new RegExp(`^${escapeRegExp(linkName)}$`, 'i') });

  if (await navLink.isVisible().catch(() => false)) {
    await navLink.click();
  } else {
    await page.goto(url);
  }
}

async function waitForCardsOrEmpty(page: Page) {
  await Promise.race([
    page.locator('.card-activity').first().waitFor({ state: 'visible', timeout: 25_000 }),
    page.getByText(/no activities found/i).waitFor({ state: 'visible', timeout: 25_000 }),
  ]).catch(() => undefined);
  await waitForUi(page);
}

async function ensureAtLeastOneActivity(page: Page) {
  const cardsCount = await page.locator('.card-activity').count();
  if (cardsCount === 0) {
    throw new Error('No activity cards found. Check the activities API, filters, or demo test data.');
  }
}

async function clickFirstIfExists(locator: Locator) {
  if (await locator.isVisible().catch(() => false)) {
    await locator.click();
  }
}

async function setInputValue(locator: Locator, value: string) {
  await locator.evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;

    nativeInputValueSetter?.call(input, nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function waitForToastOrQuiet(page: Page, pattern: RegExp) {
  await Promise.race([
    page.getByText(pattern).first().waitFor({ state: 'visible', timeout: 12_000 }),
    page.waitForTimeout(2500),
  ]).catch(() => undefined);
  await waitForUi(page, 700);
}

async function waitForUi(page: Page, ms = DEMO_PAUSE_MS) {
  await page.waitForTimeout(ms);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
