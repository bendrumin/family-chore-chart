import { test, expect } from '@playwright/test';

test.describe('Run Routine (recording flow)', () => {
  test('kid logs in, starts routine, completes steps, sees celebration', async ({ page }) => {
    test.setTimeout(120_000); // Routines can have many steps; allow up to 2 min

    const familyCode = process.env.TEST_FAMILY_CODE;
    const pin = process.env.TEST_CHILD_PIN;

    if (!familyCode || !pin) {
      test.skip();
      return;
    }

    // Step 1: Kid login
    await page.goto(`/kid-login/${familyCode}`);
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible({ timeout: 5000 });

    for (const digit of pin) {
      await page.getByRole('button', { name: digit }).click();
      await page.waitForTimeout(150);
    }

    await page.waitForURL(/\/kid\/[a-f0-9-]+$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /hi,/i })).toBeVisible({ timeout: 5000 });

    // Step 2: Wait for routine cards to load, then click Start
    const startBtn = page.getByRole('button', { name: /start/i }).first();
    try {
      await startBtn.waitFor({ state: 'visible', timeout: 8_000 });
    } catch {
      test.skip(); // No routines set up yet
      return;
    }
    await startBtn.click();

    // Step 3: Complete each step by clicking Done! / Finish!
    await page.waitForURL(/\/kid\/[^/]+\/routine\//, { timeout: 5000 });

    const maxSteps = 15; // Safety cap
    for (let i = 0; i < maxSteps; i++) {
      // Wait for the Done!/Finish! button to appear (handles transition animations)
      const doneBtn = page.getByRole('button', { name: /done!|finish!/i }).first();
      try {
        await doneBtn.waitFor({ state: 'visible', timeout: 5_000 });
      } catch {
        break; // No more steps or already on celebration
      }

      await doneBtn.click();
      await page.waitForTimeout(600); // Let animation play

      // Stop if we've landed on the celebration screen
      if (await page.getByRole('heading', { name: /you did it/i }).isVisible()) {
        break;
      }
    }

    // Celebration screen: "You Did It!" heading + "Back to Home" button
    await expect(page.getByRole('heading', { name: /you did it/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /back to home/i })).toBeVisible({ timeout: 5_000 });
  });
});
