import { test, expect } from '@playwright/test';

test.describe('Kid Dashboard (recording flow)', () => {
  test('kid logs in and browses routines', async ({ page }) => {
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

    // Pause to show the full dashboard
    await page.waitForTimeout(2000);

    // Scroll down to reveal routines list
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
    await page.waitForTimeout(1500);

    // Scroll back up
    await page.evaluate(() => window.scrollBy({ top: -300, behavior: 'smooth' }));
    await page.waitForTimeout(1000);

    // If a routine card is visible, hover over it to show details
    const routineCard = page.locator('[data-testid="routine-card"], .routine-card').first();
    if (await routineCard.isVisible()) {
      await routineCard.hover();
      await page.waitForTimeout(800);
    }

    // Final pause before recording ends
    await page.waitForTimeout(1000);
  });
});
