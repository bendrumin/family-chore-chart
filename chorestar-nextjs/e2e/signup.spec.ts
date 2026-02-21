import { test, expect } from '@playwright/test';

/**
 * Signup E2E Tests
 *
 * No env vars required — validation tests use fake data,
 * the happy-path test creates a real (unconfirmed) account
 * using a timestamp-tagged email so each run gets a fresh address.
 *
 * Tests:
 *   1. Mismatched passwords → toast error
 *   2. Weak password (no uppercase) → toast error
 *   3. Happy path → lands on /signup-success and shows the email
 */

// Fresh email per run — all land in the same inbox via + addressing
const SIGNUP_EMAIL = `bsiegel13+e2e-${Date.now()}@gmail.com`;

// ────────────────────────────────────────────────────────────────────────────
// 1 & 2. Validation errors (no real account created)
// ────────────────────────────────────────────────────────────────────────────
test.describe('Signup — Form Validation', () => {
  test('shows error when passwords do not match', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForSelector('form', { timeout: 8000 });

    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('Password123');
    await page.getByLabel('Confirm Password').fill('Password999');

    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText(/passwords do not match/i)).toBeVisible({ timeout: 5000 });
  });

  test('shows error for a weak password (no uppercase)', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForSelector('form', { timeout: 8000 });

    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Confirm Password').fill('password123');

    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText(/uppercase/i)).toBeVisible({ timeout: 5000 });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Happy path — valid signup → confirm-email page
// ────────────────────────────────────────────────────────────────────────────
test.describe('Signup — Happy Path', () => {
  test('new user sees the confirm-email page after signing up', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForSelector('form', { timeout: 8000 });

    await page.getByLabel('Email').fill(SIGNUP_EMAIL);
    // Family name is optional — leave it to test the default
    await page.getByLabel('Password', { exact: true }).fill('TestPass123');
    await page.getByLabel('Confirm Password').fill('TestPass123');

    await page.getByRole('button', { name: /create account/i }).click();

    // Should redirect to /signup-success
    await page.waitForURL('**/signup-success**', { timeout: 15_000 });

    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(SIGNUP_EMAIL)).toBeVisible();

    // "Back to Login" link should be present
    await expect(page.getByRole('link', { name: /back to login/i })).toBeVisible();
  });
});
