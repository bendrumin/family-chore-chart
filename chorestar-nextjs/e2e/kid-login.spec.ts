import { test, expect } from '@playwright/test';

test.describe('Kid Login (recording flow)', () => {
  test('kid enters PIN and lands on dashboard', async ({ page }) => {
    const familyCode = process.env.TEST_FAMILY_CODE;
    const pin = process.env.TEST_CHILD_PIN;

    if (!familyCode || !pin) {
      test.skip();
      return;
    }

    await page.goto(`/kid-login/${familyCode}`);

    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible({ timeout: 5000 });

    // Enter PIN using the numeric keypad
    for (const digit of pin) {
      await page.getByRole('button', { name: digit }).click();
      await page.waitForTimeout(150); // Slight delay between keypresses (looks natural)
    }

    // Wait for redirect to kid dashboard
    await page.waitForURL(/\/kid\/[a-f0-9-]+$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /hi,/i })).toBeVisible({ timeout: 5000 });
  });
});
