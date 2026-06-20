import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env['DEMO_BASE_URL'] || 'http://127.0.0.1:4200';
const startServer = process.env['DEMO_START_SERVER'] !== 'false';
const headless = process.env['DEMO_HEADLESS'] === 'true';

export default defineConfig({
  testDir: '.',
  timeout: 8 * 60_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL,
    headless,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    trace: 'on',
    video: 'on',
    screenshot: 'only-on-failure',
    launchOptions: {
      slowMo: Number(process.env['DEMO_SLOW_MO'] || 220),
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: startServer
    ? {
        command: 'npm start -- --host 127.0.0.1 --port 4200',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
