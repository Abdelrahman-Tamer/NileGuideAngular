import { expect, Locator, Page, test, TestInfo } from '@playwright/test';

const DEMO_EMAIL = process.env['DEMO_EMAIL'] || '';
const DEMO_PASSWORD = process.env['DEMO_PASSWORD'] || '';
const DEMO_SEARCH_TERM = process.env['DEMO_SEARCH_TERM'] || 'pyramid';
const DEMO_PLAN_DATE = process.env['DEMO_PLAN_DATE'] || '2026-06-28';
const DEMO_PLAN_TIME = process.env['DEMO_PLAN_TIME'] || '10:00';
const DEMO_PLAN_PERIOD = (process.env['DEMO_PLAN_PERIOD'] || 'AM').toUpperCase();
const DEMO_ADD_TO_SCHEDULE = process.env['DEMO_ADD_TO_SCHEDULE'] === 'true';
const DEMO_SEND_CONTACT = process.env['DEMO_SEND_CONTACT'] === 'true';
const DEMO_RUN_AI = process.env['DEMO_RUN_AI'] === 'true';
const DEMO_PAUSE_MS = Number(process.env['DEMO_PAUSE_MS'] || 650);

const screenshotNames = new Set<string>();

test.describe.configure({ mode: 'serial' });

test.describe('NileGuide professional tourist demo', () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(20_000);

    page.on('dialog', async (dialog) => {
      await dialog.accept().catch(() => undefined);
    });

    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('tourist user journey: login, browse, save, plan, map, help, contact, AI', async ({ page }, testInfo) => {
    validateRequiredCredentials();

    await demoStep(page, testInfo, '01 Login as Tourist User', async () => {
      await page.goto('/auth/login');
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
      await page.getByPlaceholder(/enter your email/i).fill(DEMO_EMAIL);
      await page.getByPlaceholder(/enter your password/i).fill(DEMO_PASSWORD);
      await page.getByRole('button', { name: /^sign in$/i }).click();

      await expect(page.getByText(/logged in successfully/i)).toBeVisible({ timeout: 20_000 });
      await page.waitForURL(/\/home(?:\?.*)?$/, { timeout: 10_000 });
      await expect(page.getByRole('link', { name: /^activities$/i })).toBeVisible();
    });

    await demoStep(page, testInfo, '02 Home Page - Tourism Landing Experience', async () => {
      await page.goto('/home');
      await expect(page.getByRole('heading', { name: /plan your perfect egyptian adventure/i })).toBeVisible();
      await expect(page.getByText(/AI-powered journey starts here/i)).toBeVisible();
      await page.mouse.wheel(0, 520);
      await waitForUi(page);
      await expect(page.getByRole('heading', { name: /explore ancient cities/i })).toBeVisible();
    });

    await demoStep(page, testInfo, '03 Activities - Search, Filters, Sort', async () => {
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

        const noActivitiesAfterFilter = await page.getByText(/no activities found/i).isVisible().catch(() => false);
        if (noActivitiesAfterFilter) {
          await firstFilter.click();
          await waitForCardsOrEmpty(page);
        }
      }
    });

    await demoStep(page, testInfo, '04 Activity Details + Wishlist Save', async () => {
      await ensureAtLeastOneActivity(page);
      await page.getByRole('link', { name: /view details/i }).first().click();
      await expect(page).toHaveURL(/\/activities\/\d+/);
      await expect(page.getByRole('button', { name: /save|saved/i })).toBeVisible();

      const saveButton = page.getByRole('button', { name: /^save$/i });
      if (await saveButton.isVisible().catch(() => false)) {
        await saveButton.click();
        await expect(page.getByRole('button', { name: /^saved$/i })).toBeVisible({ timeout: 20_000 });
      }

      await page.mouse.wheel(0, 700);
      await waitForUi(page);
    });

    await demoStep(page, testInfo, '05 Add Activity To Schedule - Optional Write Action', async () => {
      if (!DEMO_ADD_TO_SCHEDULE) {
        await showBadge(page, 'Skipping schedule write. Set DEMO_ADD_TO_SCHEDULE=true to add a real plan item.');
        await waitForUi(page, 1200);
        return;
      }

      await page.goto('/activities');
      await waitForCardsOrEmpty(page);
      await ensureAtLeastOneActivity(page);
      await page.getByRole('button', { name: /^add to plan$/i }).first().click();
      await expect(page.getByRole('heading', { name: /add to schedule/i })).toBeVisible({ timeout: 20_000 });

      await setInputValue(page.getByPlaceholder(/yyyy-mm-dd/i), DEMO_PLAN_DATE);
      await page.getByPlaceholder(/hh:mm/i).fill(DEMO_PLAN_TIME);

      const periodSelect = page.locator('select').last();
      if (DEMO_PLAN_PERIOD === 'AM' || DEMO_PLAN_PERIOD === 'PM') {
        await periodSelect.selectOption(DEMO_PLAN_PERIOD);
      }

      await page.getByRole('button', { name: /^add to schedule$/i }).click();
      await expect(page.getByText(/added to schedule|conflicts|outside|failed/i)).toBeVisible({ timeout: 25_000 });
    });

    await demoStep(page, testInfo, '06 Wishlist Page', async () => {
      await page.goto('/wishlist');
      await expect(page.getByRole('heading', { name: /my wishlist/i })).toBeVisible();
      await expect(page.getByText(/saved activities|activities you want|your wishlist is empty|no wishlist/i)).toBeVisible();
      await page.mouse.wheel(0, 450);
      await waitForUi(page);
    });

    await demoStep(page, testInfo, '07 Schedule Page + Export Button', async () => {
      await goByNavOrUrl(page, 'Schedule', '/schedule');
      await expect(page.getByRole('heading', { name: /my egypt schedule/i })).toBeVisible();
      await expect(page.getByText(/total activities/i)).toBeVisible();

      const emptySchedule = await page.getByText(/your schedule is empty/i).isVisible().catch(() => false);
      if (!emptySchedule) {
        const downloadPromise = page.waitForEvent('download', { timeout: 10_000 }).catch(() => null);
        await page.getByRole('button', { name: /export/i }).click();
        const download = await downloadPromise;
        if (download) {
          await download.saveAs(testInfo.outputPath('nileguide-schedule-demo.pdf'));
        }
      }
    });

    await demoStep(page, testInfo, '08 Interactive Map', async () => {
      await goByNavOrUrl(page, 'Map', '/map');
      await expect(page.getByRole('heading', { name: /interactive map/i })).toBeVisible();

      const citySelect = page.locator('select').first();
      const options = await citySelect.locator('option').allTextContents();
      if (options.length > 1) {
        await citySelect.selectOption({ index: 1 });
        await waitForUi(page);
      }

      await clickFirstIfExists(page.getByTitle(/center map/i));
      await clickFirstIfExists(page.getByRole('button', { name: /view/i }));
    });

    await demoStep(page, testInfo, '09 Profile Page - User Data Preview', async () => {
      await page.goto('/profile');
      await expect(page.getByRole('heading', { name: /welcome to egypt/i })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByPlaceholder(/enter your name/i)).toBeVisible();
      await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
      await page.mouse.wheel(0, 650);
      await waitForUi(page);
    });

    await demoStep(page, testInfo, '10 Help Center FAQs', async () => {
      await page.goto('/help');
      await expect(page.getByRole('heading', { name: /help center/i })).toBeVisible();
      await page.getByRole('button', { name: /what features are available/i }).click();
      await expect(page.getByText(/personalized trip planning/i)).toBeVisible();
    });

    await demoStep(page, testInfo, '11 Contact Form - Fill Only By Default', async () => {
      await page.goto('/contact');
      await expect(page.getByRole('heading', { name: /get in touch/i })).toBeVisible();
      await page.getByPlaceholder(/john doe/i).fill('NileGuide Demo User');
      await page.getByPlaceholder(/john@example.com/i).fill(DEMO_EMAIL);
      await page.locator('#subject').selectOption('Technical Support');
      await page.getByPlaceholder(/tell us how we can help/i).fill('Automated professional demo check for the NileGuide contact form.');

      if (DEMO_SEND_CONTACT) {
        await page.getByRole('button', { name: /send message/i }).click();
        await expect(page.getByText(/sent successfully|configure emailjs|failed/i)).toBeVisible({ timeout: 20_000 });
      }
    });

    await demoStep(page, testInfo, '12 NileGuide AI Chatbot', async () => {
      await page.goto('/home');
      await expect(page.getByLabel(/open nileguide ai chat/i)).toBeVisible({ timeout: 20_000 });
      await page.getByLabel(/open nileguide ai chat/i).click();
      await expect(page.getByRole('heading', { name: /nileguide ai/i })).toBeVisible();

      if (DEMO_RUN_AI) {
        await page.getByPlaceholder(/ask about egypt/i).fill('Suggest a one day plan in Cairo.');
        await page.getByLabel(/send message/i).click();
        await expect(page.getByText(/thinking|cairo|error|failed/i)).toBeVisible({ timeout: 45_000 });
      } else {
        await showBadge(page, 'AI send skipped. Set DEMO_RUN_AI=true to send a real chatbot message.');
        await waitForUi(page, 1200);
      }

      await page.getByLabel(/close chat/i).click();
    });

    await demoStep(page, testInfo, '13 Logout', async () => {
      await page.goto('/home');
      const profileButton = page.locator('.profile-menu-wrapper button').first();
      await profileButton.click();
      await page.getByRole('button', { name: /logout/i }).click();
      await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible({ timeout: 15_000 });
    });
  });
});

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
  if (!DEMO_EMAIL || !DEMO_PASSWORD) {
    throw new Error(
      'Missing demo credentials. Set DEMO_EMAIL and DEMO_PASSWORD before running the demo.'
    );
  }
}

async function showBadge(page: Page, title: string) {
  await page.evaluate((text) => {
    const id = 'nileguide-demo-badge';
    let badge = document.getElementById(id);

    if (!badge) {
      badge = document.createElement('div');
      badge.id = id;
      badge.style.position = 'fixed';
      badge.style.left = '24px';
      badge.style.bottom = '24px';
      badge.style.zIndex = '999999';
      badge.style.maxWidth = '560px';
      badge.style.padding = '14px 18px';
      badge.style.borderRadius = '18px';
      badge.style.border = '1px solid rgba(242,185,13,.45)';
      badge.style.background = 'rgba(0,0,0,.82)';
      badge.style.color = '#f2b90d';
      badge.style.font = '700 16px/1.35 system-ui, -apple-system, Segoe UI, sans-serif';
      badge.style.boxShadow = '0 18px 50px rgba(0,0,0,.35)';
      badge.style.backdropFilter = 'blur(10px)';
      document.body.appendChild(badge);
    }

    badge.textContent = text;
  }, title).catch(() => undefined);
}

async function capture(page: Page, testInfo: TestInfo, title: string) {
  const slug = title
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
    page.locator('.card-activity').first().waitFor({ state: 'visible', timeout: 20_000 }),
    page.getByText(/no activities found/i).waitFor({ state: 'visible', timeout: 20_000 }),
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
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;

    nativeInputValueSetter?.call(input, nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function waitForUi(page: Page, ms = DEMO_PAUSE_MS) {
  await page.waitForTimeout(ms);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
