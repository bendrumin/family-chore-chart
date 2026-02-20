import { defineConfig, devices } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: '.env.test' });

/**
 * Playwright config for ChoreStar recording scripts.
 * Run: npx playwright test --project=chromium
 * Record video: videos are saved to chorestar-nextjs/test-results/
 *
 * Env vars (create .env.test or set in shell):
 *   PLAYWRIGHT_BASE_URL - default http://localhost:3000
 *   TEST_USER_EMAIL - parent login email
 *   TEST_USER_PASSWORD - parent login password
 *   TEST_FAMILY_CODE - kid login family code (from Settings → Family)
 *   TEST_CHILD_PIN - child's 4-6 digit PIN
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'on', // Always record video for GIF export
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 720 }, // Good for demo/GIF
    actionTimeout: 15_000,
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'create-routine',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /create-routine\.spec\.ts/,
      dependencies: ['setup'],
    },
    {
      name: 'kid-login',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /kid-login\.spec\.ts/,
    },
    {
      name: 'run-routine',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /run-routine\.spec\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [/auth\.setup\.ts/],
    },
  ],
  outputDir: 'test-results/',
});
