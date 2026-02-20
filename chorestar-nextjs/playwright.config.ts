import { defineConfig, devices } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: '.env.test' });

// Timestamp for this run so videos don't overwrite each other
const runId = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

/**
 * Playwright config for ChoreStar recording scripts.
 * Run: npx playwright test --project=chromium
 * Videos saved to: test-results/<timestamp>/<test-name>/
 * After each run, webm files are auto-converted to mp4 via globalTeardown.
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
  globalTeardown: './e2e/convert-videos.ts',
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
      name: 'kid-dashboard',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /kid-dashboard\.spec\.ts/,
    },
    {
      name: 'run-routine',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /run-routine\.spec\.ts/,
    },
    {
      name: 'add-edit-child',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /add-edit-child\.spec\.ts/,
      dependencies: ['setup'],
    },
    {
      name: 'add-edit-chore',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /add-edit-chore\.spec\.ts/,
      dependencies: ['setup'],
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [/auth\.setup\.ts/],
    },
  ],
  outputDir: `test-results/${runId}`,
});
