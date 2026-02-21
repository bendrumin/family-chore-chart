import { defineConfig, devices } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: '.env.test' });

// Use RUN_ID env var (set by npm scripts) so all projects share one folder.
// Falls back to a local-time timestamp when running directly with npx playwright.
const runId = process.env.RUN_ID ?? new Date().toLocaleString('sv').slice(0, 19).replace(/[ :]/g, '-');

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
      name: 'family-settings',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /family-settings\.spec\.ts/,
      dependencies: ['setup'],
    },
    {
      name: 'family-sharing',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /family-sharing\.spec\.ts/,
      dependencies: ['setup'],
    },
    {
      name: 'signup',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /signup\.spec\.ts/,
      // No auth dependency — signup is a public flow
    },
    // ── Tutorial projects (slow-paced, for how-to videos) ────────────────────
    {
      name: 'tutorial-add-child',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /tutorial-add-child\.spec\.ts/,
      dependencies: ['setup'],
    },
    {
      name: 'tutorial-create-routine',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /tutorial-create-routine\.spec\.ts/,
      dependencies: ['setup'],
    },
    {
      name: 'tutorial-kid-login',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /tutorial-kid-login\.spec\.ts/,
    },
    {
      name: 'tutorial-run-routine',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /tutorial-run-routine\.spec\.ts/,
    },
    {
      name: 'tutorial-family-settings',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /tutorial-family-settings\.spec\.ts/,
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
