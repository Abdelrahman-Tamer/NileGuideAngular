import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Load .env.demo file so passwords with special chars don't get mangled by PowerShell
const envFile = path.resolve(__dirname, 'demo', '.env.demo');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

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
    viewport: { width: 1920, height: 1080 },
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    trace: 'on',
    video: { mode: 'on', size: { width: 1920, height: 1080 } },
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
        viewport: { width: 1920, height: 1080 },
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
