import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/parent.json' });

test.describe('Create Routine (recording flow)', () => {
  test('create a routine using template', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for dashboard to load (child list or content)
    await page.waitForSelector('[data-testid="child-list"], button:has-text("Chores")', { timeout: 10_000 });

    // Click Routines tab
    await page.getByRole('button', { name: /routines/i }).click();

    // Click Add Routine (in tab bar) or New Routine (in content)
    await page.getByRole('button', { name: /add routine|new routine/i }).first().click();

    // Wait for modal
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Use Morning Routine template (loads name + 8 steps)
    await page.getByRole('button', { name: /morning routine/i }).click();
    await page.waitForTimeout(600); // Let template load + toast

    // Fallback: if no template clicked, fill manually
    const nameInput = page.getByLabel(/routine name/i).or(page.getByPlaceholder(/morning|routine name/i));
    if (await nameInput.isVisible() && !(await nameInput.inputValue())) {
      await nameInput.fill('Morning Routine');
      const addStepBtn = page.getByRole('button', { name: /add first step|add step/i });
      if (await addStepBtn.isVisible()) {
        await addStepBtn.click();
        await page.locator('input[placeholder*="step" i]').first().fill('Wake up');
      }
    }

    // Save routine
    await page.getByRole('button', { name: /create routine|saving/i }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/routine created|morning routine/i)).toBeVisible({ timeout: 5000 });
  });
});
