/**
 * Tutorial: Kid Login
 * Slow-paced recording for use in how-to videos and newsletters.
 * Features shown: kid login page, family code entry, PIN keypad, kid dashboard.
 */
import { test, expect } from '@playwright/test';

test.describe('Tutorial — Kid Login', () => {
  test('kid enters family code then PIN and lands on dashboard', async ({ page }) => {
    test.setTimeout(90_000);

    const familyCode = process.env.TEST_FAMILY_CODE;
    const pin = process.env.TEST_CHILD_PIN;

    if (!familyCode || !pin) {
      test.skip();
      return;
    }

    // ── KID LOGIN LANDING PAGE ────────────────────────────────────────────────
    await page.goto('/kid-login');
    await expect(page.getByRole('heading', { name: /kid login/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1500); // Let viewer read the page

    // ── TYPE THE FAMILY CODE SLOWLY ───────────────────────────────────────────
    const codeInput = page.getByLabel(/family code/i);
    await codeInput.hover();
    await page.waitForTimeout(800);
    // Type code character by character for a more natural look
    for (const char of familyCode) {
      await codeInput.type(char, { delay: 120 });
    }
    await page.waitForTimeout(1200);

    // ── CONTINUE ──────────────────────────────────────────────────────────────
    const continueBtn = page.getByRole('button', { name: /continue/i });
    await continueBtn.hover();
    await page.waitForTimeout(600);
    await continueBtn.click();

    // ── PIN ENTRY PAGE ────────────────────────────────────────────────────────
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1500); // Let viewer see the PIN keypad

    // ── ENTER PIN ON KEYPAD ───────────────────────────────────────────────────
    for (const digit of pin) {
      const digitBtn = page.getByRole('button', { name: digit }).first();
      await digitBtn.hover();
      await page.waitForTimeout(300);
      await digitBtn.click();
      await page.waitForTimeout(500); // Slow, deliberate PIN entry
    }

    // ── WAIT FOR KID DASHBOARD ────────────────────────────────────────────────
    await page.waitForURL(/\/kid\/[a-f0-9-]+$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /hi,/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(2500); // Show the kid dashboard
  });
});
