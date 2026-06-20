const fs = require('fs');
const http = require('http');
const https = require('https');
const net = require('net');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'documentation', 'screenshots');

const VIEWPORT = { width: 1440, height: 1000 };
const DEFAULT_BASE_URL = 'http://localhost:4200';
const FALLBACK_DEV_PORTS = [4201, 4202, 4203, 4204, 4205, 4206, 4207, 4208, 4209, 4210];

const DEFAULT_API_BASE_URL =
  'https://nileguide-b4c2eec6cte2fsbe.uaenorth-01.azurewebsites.net/api';

const DEFAULT_CREDENTIALS = {
  user: {
    email: 'botta@gmail.com',
    password: String.raw`edJ!Uhd{>J\"M3#k(Vni}ffsrpb*=1bYRmzO)!\\\"T<.CEE+tk8w;YR(a8)c(Qu`,
  },
  admin: {
    email: 'botta12779@gmail.com',
    password: 'Abdo2005',
  },
};

const ROUTES = {
  home: '/home',
  login: '/auth/login',
  register: '/auth/register',
  activities: '/activities',
  wishlist: '/wishlist',
  schedule: '/schedule',
  map: '/map',
  profile: '/profile',
  dashboard: '/dashboard',
  adminUsers: '/dashboard/users-management',
  adminActivities: '/dashboard/activities-management',
  adminReports: '/dashboard/reports',
  contact: '/contact',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
};

const PUBLIC_SCREENSHOTS = [
  {
    name: '01-home.png',
    route: ROUTES.home,
    content: /Plan Your Perfect Egyptian Adventure|NileGuide|Egypt/i,
  },
  {
    name: '02-login.png',
    route: ROUTES.login,
    content: /Welcome Back|Sign In|Login/i,
  },
  {
    name: '03-register.png',
    route: ROUTES.register,
    content: /Create Account|Adventure|Register/i,
  },
  {
    name: '16-contact.png',
    route: ROUTES.contact,
    content: /Contact|message|Email/i,
  },
  {
    name: '20-forgot-password.png',
    route: ROUTES.forgotPassword,
    content: /Forgot|password/i,
  },
  {
    name: '21-reset-password.png',
    route: ROUTES.resetPassword,
    content: /Reset|password|code|new password/i,
  },
];

const USER_SCREENSHOTS = [
  {
    name: '04-activities.png',
    route: ROUTES.activities,
    content: /Curated Experiences|Activities|Discover/i,
  },
  {
    name: '06-wishlist.png',
    route: ROUTES.wishlist,
    content: /My Wishlist|wishlist/i,
  },
  {
    name: '07-schedule.png',
    route: ROUTES.schedule,
    content: /My Egypt Schedule|schedule|itinerary/i,
  },
  {
    name: '08-map.png',
    route: ROUTES.map,
    content: /Interactive Map|Itinerary|map/i,
  },
  {
    name: '09-profile.png',
    route: ROUTES.profile,
    content: /Basic Information|Welcome to Egypt|Profile/i,
  },
];

const ADMIN_SCREENSHOTS = [
  {
    name: '11-admin-dashboard.png',
    route: ROUTES.dashboard,
    content: /Admin Dashboard|Manage Activities|Dashboard/i,
  },
  {
    name: '12-admin-users-management.png',
    route: ROUTES.adminUsers,
    content: /Users Management|Search users|Users/i,
  },
  {
    name: '13-admin-activities-management.png',
    route: ROUTES.adminActivities,
    content: /Activities Management|Search activities|Activities/i,
  },
  {
    name: '14-admin-reports.png',
    route: ROUTES.adminReports,
    content: /Admin Report|Analytics|Reports/i,
  },
];

const results = [];
const notes = [];
let devServerProcess;

function log(message) {
  console.log(`[docs:screenshots] ${message}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function maskEmail(email) {
  if (!email || !email.includes('@')) {
    return email || '';
  }

  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
}

function getConfig() {
  return {
    apiBaseUrl: (
      process.env.NILEGUIDE_API_BASE_URL ||
      process.env.API_BASE_URL ||
      DEFAULT_API_BASE_URL
    ).replace(/\/$/, ''),

    baseUrl: process.env.NILEGUIDE_BASE_URL || process.env.BASE_URL || '',

    user: {
      email:
        process.env.NILEGUIDE_USER_EMAIL ||
        process.env.USER_EMAIL ||
        DEFAULT_CREDENTIALS.user.email,
      password:
        process.env.NILEGUIDE_USER_PASSWORD ||
        process.env.USER_PASSWORD ||
        DEFAULT_CREDENTIALS.user.password,
    },

    admin: {
      email:
        process.env.NILEGUIDE_ADMIN_EMAIL ||
        process.env.ADMIN_EMAIL ||
        DEFAULT_CREDENTIALS.admin.email,
      password:
        process.env.NILEGUIDE_ADMIN_PASSWORD ||
        process.env.ADMIN_PASSWORD ||
        DEFAULT_CREDENTIALS.admin.password,
    },
  };
}

function stopDevServer() {
  if (!devServerProcess?.pid) {
    return;
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(devServerProcess.pid), '/T', '/F'], {
      stdio: 'ignore',
    });
  } else {
    devServerProcess.kill('SIGTERM');
  }
}

function requestOk(url, timeoutMs = 3500) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https://') ? https : http;

    const request = lib.get(url, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 500);
    });

    request.on('error', () => resolve(false));

    request.setTimeout(timeoutMs, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(false));

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '127.0.0.1');
  });
}

async function findFallbackPort() {
  for (const port of FALLBACK_DEV_PORTS) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(
    `No available Angular dev-server port found in ${FALLBACK_DEV_PORTS.join(', ')}.`
  );
}

async function waitForServer(url, timeoutMs = 120000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (await requestOk(url)) {
      return true;
    }

    await delay(1000);
  }

  return false;
}

async function resolveBaseUrl(config) {
  if (config.baseUrl) {
    const url = config.baseUrl.replace(/\/$/, '');

    if (await requestOk(url)) {
      log(`Using configured frontend base URL: ${url}`);
      return url;
    }

    notes.push(`Configured NILEGUIDE_BASE_URL was ${url}, but it did not respond.`);
  }

  if (await requestOk(DEFAULT_BASE_URL)) {
    log(`Using existing Angular dev server at ${DEFAULT_BASE_URL}`);
    return DEFAULT_BASE_URL;
  }

  const fallbackPort = await findFallbackPort();

  log(`No existing server found on ${DEFAULT_BASE_URL}. Starting npm start on port ${fallbackPort}...`);

  let detectedUrl = null;

  devServerProcess = spawn(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['start', '--', '--port', String(fallbackPort)],
    {
      cwd: ROOT,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        NG_CLI_ANALYTICS: 'false',
      },
    }
  );

  const parseOutput = (chunk) => {
    const text = chunk.toString();

    process.stdout.write(text);

    const match = text.match(/http:\/\/localhost:(\d+)/i) || text.match(/localhost:(\d+)/i);

    if (match) {
      detectedUrl = `http://localhost:${match[1]}`;
    }
  };

  devServerProcess.stdout.on('data', parseOutput);
  devServerProcess.stderr.on('data', parseOutput);

  const fallbackUrl = `http://localhost:${fallbackPort}`;
  const started = await waitForServer(fallbackUrl, 120000);
  const baseUrl = detectedUrl || fallbackUrl;

  if (!started && !(await requestOk(baseUrl))) {
    throw new Error('Angular dev server did not become reachable.');
  }

  log(`Started Angular dev server at ${baseUrl}`);

  return baseUrl;
}

async function apiJson(url, options = {}) {
  if (typeof fetch !== 'function') {
    throw new Error('This script requires Node.js 18+ because it uses global fetch.');
  }

  const response = await fetch(url, options);
  const text = await response.text();

  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const message = typeof body === 'string' ? body : JSON.stringify(body);
    throw new Error(`${response.status} ${response.statusText}: ${message}`);
  }

  return body;
}

async function loginThroughApi(config, credentials, expectedRole) {
  if (!credentials.email || !credentials.password) {
    throw new Error(`${expectedRole} credentials are missing.`);
  }

  const auth = await apiJson(`${config.apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
      rememberMe: false,
    }),
  });

  if (!auth?.token) {
    throw new Error(`API login for ${expectedRole} did not return a token.`);
  }

  const role = auth.role || expectedRole;

  if (String(role).toLowerCase() !== expectedRole.toLowerCase()) {
    throw new Error(
      `API login returned role "${role}" for ${maskEmail(credentials.email)}, expected "${expectedRole}".`
    );
  }

  log(`${expectedRole} API login succeeded for ${maskEmail(credentials.email)}.`);

  return {
    ...auth,
    role,
  };
}

async function preparePage(page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });

    const injectScreenshotStyles = () => {
      if (document.querySelector('[data-doc-screenshot-style="true"]')) {
        return;
      }

      const style = document.createElement('style');

      style.setAttribute('data-doc-screenshot-style', 'true');

      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0.001s !important;
          animation-delay: 0s !important;
          transition-duration: 0.001s !important;
          transition-delay: 0s !important;
          caret-color: transparent !important;
        }

        .animate-pulse,
        .animate-spin {
          animation: none !important;
        }
      `;

      document.documentElement.appendChild(style);
    };

    if (document.documentElement) {
      injectScreenshotStyles();
    } else {
      document.addEventListener('DOMContentLoaded', injectScreenshotStyles, {
        once: true,
      });
    }
  });
}

async function applyAuth(page, baseUrl, auth) {
  await page.goto(baseUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  }).catch(() => {});

  await page.evaluate((data) => {
    localStorage.clear();

    localStorage.setItem('user_token', data.token);
    localStorage.setItem('user_role', data.role);

    if (data.userId !== undefined && data.userId !== null) {
      localStorage.setItem('user_id', String(data.userId));
    }
  }, auth);

  await delay(300);
}

async function clearAuth(page, baseUrl) {
  await page.goto(baseUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  }).catch(() => {});

  await page.evaluate(() => localStorage.clear()).catch(() => {});
}

async function waitForStablePage(page, expectedText) {
  await page.waitForLoadState('domcontentloaded', {
    timeout: 30000,
  }).catch(() => {});

  await page.waitForLoadState('networkidle', {
    timeout: 20000,
  }).catch(() => {});

  await page.locator('body').waitFor({
    state: 'visible',
    timeout: 30000,
  });

  if (expectedText) {
    const found = await page
      .getByText(expectedText)
      .first()
      .waitFor({
        state: 'visible',
        timeout: 8000,
      })
      .then(() => true)
      .catch(() => false);

    if (!found) {
      notes.push(`Expected text was not found on ${page.url()}: ${expectedText}`);
    }
  }

  await page
    .waitForFunction(
      () => {
        const active = document.querySelectorAll(
          '.animate-pulse, .fa-spinner, .ngx-spinner-overlay, [class*="loading"]'
        );

        return active.length === 0;
      },
      null,
      {
        timeout: 4500,
      }
    )
    .catch(() => {});

  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});

  await page
    .locator('img')
    .evaluateAll((imgs) =>
      Promise.all(
        imgs.map((img) => {
          if (img.complete) {
            return Promise.resolve();
          }

          return new Promise((resolve) => {
            img.addEventListener('load', resolve, {
              once: true,
            });

            img.addEventListener('error', resolve, {
              once: true,
            });

            setTimeout(resolve, 3000);
          });
        })
      )
    )
    .catch(() => {});

  await delay(700);
}

async function gotoStable(page, baseUrl, route, expectedText, options = {}) {
  const target = new URL(route, baseUrl).toString();

  await page.goto(target, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  await waitForStablePage(page, expectedText);

  if (options.protectedPage && page.url().includes('/auth/login')) {
    throw new Error(`Navigation to ${route} was redirected to login. Auth token is missing/invalid.`);
  }
}

async function capture(page, baseUrl, item, options = {}) {
  const outputPath = path.join(OUTPUT_DIR, item.name);

  try {
    if (item.route) {
      await gotoStable(page, baseUrl, item.route, item.content, options);
    }

    await page.screenshot({
      path: outputPath,
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    });

    results.push({
      file: item.name,
      status: 'success',
      path: outputPath,
      route: item.route || page.url().replace(baseUrl, ''),
    });

    log(`Captured ${item.name}`);
  } catch (error) {
    const screenshotSaved = await page
      .screenshot({
        path: outputPath,
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
      })
      .then(() => true)
      .catch(() => false);

    results.push({
      file: item.name,
      status: 'failed',
      route: item.route || page.url().replace(baseUrl, ''),
      reason: error.message,
      path: screenshotSaved ? outputPath : undefined,
    });

    log(`Failed ${item.name}: ${error.message}`);
  }
}

async function captureCurrent(page, baseUrl, item, routeLabel) {
  const outputPath = path.join(OUTPUT_DIR, item.name);

  try {
    await waitForStablePage(page, item.content);

    await page.screenshot({
      path: outputPath,
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    });

    results.push({
      file: item.name,
      status: 'success',
      path: outputPath,
      route: routeLabel || page.url().replace(baseUrl, ''),
    });

    log(`Captured ${item.name}`);
  } catch (error) {
    results.push({
      file: item.name,
      status: 'failed',
      route: routeLabel || page.url().replace(baseUrl, ''),
      reason: error.message,
    });

    log(`Failed ${item.name}: ${error.message}`);
  }
}

async function captureActivityDetails(page, baseUrl) {
  const item = {
    name: '05-activity-details.png',
    content: /About this Activity|Gallery|Activity/i,
  };

  const outputPath = path.join(OUTPUT_DIR, item.name);

  try {
    await gotoStable(
      page,
      baseUrl,
      ROUTES.activities,
      /Curated Experiences|Activities|Discover/i,
      {
        protectedPage: true,
      }
    );

    const firstDetails = page
      .locator('a[href^="/activities/"], a[href*="/activities/"]')
      .filter({
        hasNotText: /^$/,
      })
      .first();

    await firstDetails.waitFor({
      state: 'visible',
      timeout: 25000,
    });

    const href = await firstDetails.getAttribute('href');

    await firstDetails.click({
      force: true,
    });

    await waitForStablePage(page, item.content);

    if (page.url().includes('/auth/login')) {
      throw new Error('Activity details redirected to login.');
    }

    await page.screenshot({
      path: outputPath,
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    });

    results.push({
      file: item.name,
      status: 'success',
      path: outputPath,
      route: href || page.url().replace(baseUrl, ''),
    });

    log(`Captured ${item.name}`);
  } catch (error) {
    const screenshotSaved = await page
      .screenshot({
        path: outputPath,
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
      })
      .then(() => true)
      .catch(() => false);

    results.push({
      file: item.name,
      status: 'failed',
      route: `${ROUTES.activities} -> first activity/details link`,
      reason: error.message,
      path: screenshotSaved ? outputPath : undefined,
    });

    log(`Failed ${item.name}: ${error.message}`);
  }
}

async function clickFirstVisible(page, locators, timeout = 12000) {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    for (const locator of locators) {
      const count = await locator.count().catch(() => 0);

      for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index);

        if (await candidate.isVisible().catch(() => false)) {
          await candidate.click({
            force: true,
          });

          return true;
        }
      }
    }

    await delay(300);
  }

  return false;
}

async function openUserChatbot(page, baseUrl) {
  await gotoStable(page, baseUrl, ROUTES.home, /NileGuide|Egypt|Discover/i);

  const clicked = await clickFirstVisible(page, [
    page.getByRole('button', {
      name: /open nileguide ai chat/i,
    }),
    page.locator('button[aria-label="Open NileGuide AI chat"]'),
    page.locator(
      'button:has(.fa-message), button:has(.fa-regular.fa-message), button:has(.fa-comments)'
    ),
  ]);

  if (!clicked) {
    throw new Error('Could not find user chatbot open button.');
  }

  await page
    .getByText(/NileGuide AI|Always here to help/i)
    .first()
    .waitFor({
      state: 'visible',
      timeout: 12000,
    });
}

async function openAdminFilesPanel(page, baseUrl) {
  await gotoStable(
    page,
    baseUrl,
    ROUTES.dashboard,
    /Admin Dashboard|Manage Activities|Dashboard/i,
    {
      protectedPage: true,
    }
  );

  const clicked = await clickFirstVisible(page, [
    page.getByRole('button', {
      name: /open nileguide ai files/i,
    }),
    page.locator('button[aria-label="Open NileGuide AI files"]'),
    page.locator(
      'button:has(.fa-message), button:has(.fa-regular.fa-message), button:has(.fa-file), button:has(.fa-folder)'
    ),
  ]);

  if (!clicked) {
    throw new Error('Could not find admin AI files open button.');
  }

  await page
    .getByText(/NileGuide AI Files|Attach AI data files/i)
    .first()
    .waitFor({
      state: 'visible',
      timeout: 12000,
    });
}

function writeReport() {
  const lines = [
    '# Screenshot Report',
    '',
    `Generated at: ${new Date().toISOString()}`,
    '',
  ];

  if (notes.length) {
    lines.push('## Notes', '');

    for (const note of notes) {
      lines.push(`- ${note}`);
    }

    lines.push('');
  }

  lines.push('## Results', '');

  for (const result of results) {
    if (result.status === 'success') {
      lines.push(`- SUCCESS: ${result.file}`);
      lines.push(`  - Route/selector: ${result.route}`);
      lines.push(`  - Path: ${result.path}`);
    } else if (result.status === 'skipped') {
      lines.push(`- SKIPPED: ${result.file}`);
      lines.push(`  - Reason: ${result.reason}`);
    } else {
      lines.push(`- FAILED: ${result.file}`);
      lines.push(`  - Route/selector attempted: ${result.route}`);
      lines.push(`  - Reason: ${result.reason}`);

      if (result.path) {
        lines.push(`  - Attempted screenshot path: ${result.path}`);
      }
    }
  }

  const reportPath = path.join(OUTPUT_DIR, 'SCREENSHOT_REPORT.md');

  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');

  return reportPath;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, {
    recursive: true,
  });

  const config = getConfig();
  const baseUrl = await resolveBaseUrl(config);

  log(`Using API base URL: ${config.apiBaseUrl}`);

  if (baseUrl.startsWith('http://localhost')) {
    notes.push(
      'The frontend is running on localhost. If browser API calls show Failed to fetch because of CORS, run with NILEGUIDE_BASE_URL=https://www.nileguide.online.'
    );
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    colorScheme: 'dark',
  });

  const page = await context.newPage();

  await preparePage(page);

  page.on('dialog', (dialog) => dialog.dismiss().catch(() => {}));

  page.on('pageerror', (error) => {
    notes.push(`Page error on ${page.url()}: ${error.message}`);
  });

  page.on('requestfailed', (request) => {
    const url = request.url();

    if (url.includes('/api/') || url.includes('nileguide')) {
      notes.push(
        `Request failed: ${request.method()} ${url} -> ${
          request.failure()?.errorText || 'unknown error'
        }`
      );
    }
  });

  try {
    await clearAuth(page, baseUrl);

    for (const item of PUBLIC_SCREENSHOTS) {
      await clearAuth(page, baseUrl);
      await capture(page, baseUrl, item);
    }

    let userAuth = null;

    try {
      userAuth = await loginThroughApi(config, config.user, 'Tourist');
      await applyAuth(page, baseUrl, userAuth);
    } catch (error) {
      notes.push(`Tourist login failed: ${error.message}`);
      log(`Tourist login failed: ${error.message}`);
    }

    if (userAuth) {
      for (const item of USER_SCREENSHOTS) {
        await capture(page, baseUrl, item, {
          protectedPage: true,
        });
      }

      await captureActivityDetails(page, baseUrl);

      const userChat = {
        name: '10-user-chatbot.png',
        content: /NileGuide AI|Always here to help/i,
      };

      try {
        await openUserChatbot(page, baseUrl);
        await captureCurrent(page, baseUrl, userChat, `${ROUTES.home} -> open user chatbot`);
      } catch (error) {
        results.push({
          file: userChat.name,
          status: 'failed',
          route: `${ROUTES.home} -> open user chatbot`,
          reason: error.message,
        });

        log(`Failed ${userChat.name}: ${error.message}`);
      }
    } else {
      for (const file of [
        '04-activities.png',
        '05-activity-details.png',
        '06-wishlist.png',
        '07-schedule.png',
        '08-map.png',
        '09-profile.png',
        '10-user-chatbot.png',
      ]) {
        results.push({
          file,
          status: 'skipped',
          reason: 'Tourist API login failed, so protected user screenshots were skipped.',
        });
      }
    }

    await clearAuth(page, baseUrl);

    let adminAuth = null;

    try {
      adminAuth = await loginThroughApi(config, config.admin, 'Admin');
      await applyAuth(page, baseUrl, adminAuth);
    } catch (error) {
      notes.push(`Admin login failed: ${error.message}`);
      log(`Admin login failed: ${error.message}`);
    }

    if (adminAuth) {
      for (const item of ADMIN_SCREENSHOTS) {
        await capture(page, baseUrl, item, {
          protectedPage: true,
        });
      }

      const adminFiles = {
        name: '15-admin-ai-files-chatbot.png',
        content: /NileGuide AI Files|Attach AI data files/i,
      };

      try {
        await openAdminFilesPanel(page, baseUrl);
        await captureCurrent(
          page,
          baseUrl,
          adminFiles,
          `${ROUTES.dashboard} -> open admin AI files`
        );
      } catch (error) {
        results.push({
          file: adminFiles.name,
          status: 'failed',
          route: `${ROUTES.dashboard} -> open admin AI files`,
          reason: error.message,
        });

        log(`Failed ${adminFiles.name}: ${error.message}`);
      }
    } else {
      for (const file of [
        '11-admin-dashboard.png',
        '12-admin-users-management.png',
        '13-admin-activities-management.png',
        '14-admin-reports.png',
        '15-admin-ai-files-chatbot.png',
      ]) {
        results.push({
          file,
          status: 'skipped',
          reason: 'Admin API login failed, so protected admin screenshots were skipped.',
        });
      }
    }
  } finally {
    await browser.close().catch(() => {});
    stopDevServer();
  }

  const reportPath = writeReport();

  const successCount = results.filter((result) => result.status === 'success').length;
  const failedCount = results.filter((result) => result.status === 'failed').length;
  const skippedCount = results.filter((result) => result.status === 'skipped').length;

  log(`Done. ${successCount} succeeded, ${failedCount} failed, ${skippedCount} skipped.`);
  log(`Report: ${reportPath}`);
  log('Generated paths:');

  for (const result of results.filter((entry) => entry.status === 'success')) {
    log(`- ${result.path}`);
  }

  if (failedCount > 0 || skippedCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[docs:screenshots] Fatal: ${error.stack || error.message}`);
  stopDevServer();
  process.exit(1);
});