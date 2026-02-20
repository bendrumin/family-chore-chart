/**
 * Tutorial: Running a Routine (Kid's Perspective)
 * Slow-paced recording for use in how-to videos and newsletters.
 * Features shown: kid dashboard → routine card → step-by-step completion → celebration.
 */
import { test, expect } from '@playwright/test';

test.describe('Tutorial — Run a Routine (Kid)', () => {
  test('kid logs in, starts routine, completes each step, sees celebration', async ({ page }) => {
    test.setTimeout(180_000);

    const familyCode = process.env.TEST_FAMILY_CODE;
    const pin = process.env.TEST_CHILD_PIN;

    if (!familyCode || !pin) {
      test.skip();
      return;
    }

    // ── KID LOGIN ─────────────────────────────────────────────────────────────
    await page.goto(`/kid-login/${familyCode}`);
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1500);

    // Enter PIN slowly on the keypad
    for (const digit of pin) {
      const digitBtn = page.getByRole('button', { name: digit }).first();
      await digitBtn.hover();
      await page.waitForTimeout(300);
      await digitBtn.click();
      await page.waitForTimeout(500);
    }

    // ── KID DASHBOARD ─────────────────────────────────────────────────────────
    await page.waitForURL(/\/kid\/[a-f0-9-]+$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /hi,/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(2000); // Let viewer take in the kid dashboard

    // ── FIND AND CLICK START ──────────────────────────────────────────────────
    const startBtn = page.getByRole('button', { name: /start/i }).first();
    try {
      await startBtn.waitFor({ state: 'visible', timeout: 8_000 });
    } catch {
      test.skip(); // No routines configured
      return;
    }

    await startBtn.scrollIntoViewIfNeeded();
    await startBtn.hover();
    await page.waitForTimeout(1000); // Hover to show the button
    await startBtn.click();

    // ── ROUTINE STEPS ─────────────────────────────────────────────────────────
    await page.waitForURL(/\/kid\/[^/]+\/routine\//, { timeout: 5000 });
    await page.waitForTimeout(1500); // Show first step

    const maxSteps = 15;
    for (let i = 0; i < maxSteps; i++) {
      const doneBtn = page.getByRole('button', { name: /done!|finish!/i }).first();
      try {
        await doneBtn.waitFor({ state: 'visible', timeout: 5_000 });
      } catch {
        break;
      }

      await doneBtn.hover();
      await page.waitForTimeout(800); // Hover — viewer can read the step
      await doneBtn.click();
      await page.waitForTimeout(1000); // Watch step transition

      if (await page.getByRole('heading', { name: /you did it/i }).isVisible()) {
        break;
      }
    }

    // ── CELEBRATION ───────────────────────────────────────────────────────────
    await expect(page.getByRole('heading', { name: /you did it/i })).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(3000); // Enjoy the celebration 🎉
    await expect(page.getByRole('button', { name: /back to home/i })).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(1500);
  });
});
