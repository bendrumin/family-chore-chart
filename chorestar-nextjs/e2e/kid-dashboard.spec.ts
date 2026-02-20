import { test, expect } from '@playwright/test';

test.describe('Kid Dashboard (recording flow)', () => {
  test('kid logs in and sees routine with Start button', async ({ page }) => {
    const familyCode = process.env.TEST_FAMILY_CODE;
    const pin = process.env.TEST_CHILD_PIN;

    if (!familyCode || !pin) {
      test.skip();
      return;
    }

    // Log in as kid
    await page.goto(`/kid-login/${familyCode}`);
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible({ timeout: 5000 });

    for (const digit of pin) {
      await page.getByRole('button', { name: digit }).click();
      await page.waitForTimeout(200);
    }

    // Land on kid dashboard
    await page.waitForURL(/\/kid\/[a-f0-9-]+$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /hi,/i })).toBeVisible({ timeout: 5000 });

    // Wait for routine cards to load and show the Start button
    const startBtn = page.getByRole('button', { name: /start/i }).first();
    await startBtn.waitFor({ state: 'visible', timeout: 8_000 });

    // Pause to let the viewer read the screen
    await page.waitForTimeout(2000);

    // Scroll the routine card into clear view
    await startBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Hover over the Start button to highlight it
    await startBtn.hover();
    await page.waitForTimeout(2000);
  });
});
