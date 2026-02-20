import { test, expect } from '@playwright/test';

test.describe('Run Routine (recording flow)', () => {
  test('kid logs in, starts routine, completes steps, sees celebration', async ({ page }) => {
    const familyCode = process.env.TEST_FAMILY_CODE;
    const pin = process.env.TEST_CHILD_PIN;

    if (!familyCode || !pin) {
      test.skip();
      return;
    }

    // Step 1: Kid login
    await page.goto(`/kid-login/${familyCode}`);
    await expect(page.getByText(/welcome|enter your.*pin/i)).toBeVisible({ timeout: 5000 });

    for (const digit of pin) {
      await page.getByRole('button', { name: digit }).click();
      await page.waitForTimeout(150);
    }

    await page.waitForURL(/\/kid\/[a-f0-9-]+$/, { timeout: 15_000 });
    await expect(page.getByText(/hi,|ready for your routines/i)).toBeVisible({ timeout: 5000 });

    // Step 2: Click first routine card (Start button)
    const startBtn = page.getByRole('button', { name: /start/i }).first();
    if (!(await startBtn.isVisible())) {
      test.skip();
      return; // No routines - run create-routine first
    }
    await startBtn.click();

    // Step 3: Complete each step (Done! / Finish!)
    await page.waitForURL(/\/kid\/[^/]+\/routine\//, { timeout: 5000 });

    let stepCount = 0;
    const maxSteps = 10; // Safety
    while (stepCount < maxSteps) {
      const doneBtn = page.getByRole('button', { name: /done|finish/i });
      if (!(await doneBtn.isVisible())) break;

      await doneBtn.click();
      await page.waitForTimeout(800); // Let animation/transition play

      if (await page.getByText(/saving/i).isVisible()) {
        await page.waitForTimeout(2000); // Wait for API
      }

      // Celebration screen?
      if (await page.getByText(/awesome|great job|celebration/i).isVisible()) {
        break;
      }
      stepCount++;
    }

    await expect(
      page.getByRole('button', { name: /continue|go back/i }).or(page.getByText(/points|earned/i))
    ).toBeVisible({ timeout: 10_000 });
  });
});
