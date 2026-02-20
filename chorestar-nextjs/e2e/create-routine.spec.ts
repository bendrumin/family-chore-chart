import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/parent.json' });

test.describe('Create Routine (recording flow)', () => {
  test('create a routine using template', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for dashboard to load (child list or content)
    await page.waitForSelector('[data-testid="child-list"], button:has-text("Chores")', { timeout: 10_000 });

    // Dismiss any welcome / "What's New" modal that may auto-open
    const overlay = page.locator('[data-dialog-overlay="true"]');
    if (await overlay.isVisible()) {
      await page.keyboard.press('Escape');
      await overlay.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    }

    // Click Routines tab
    await page.getByRole('button', { name: /routines/i }).click();

    // Click Add Routine (in tab bar) or New Routine (in content)
    await page.getByRole('button', { name: /add routine|new routine/i }).first().click();

    // Wait for routine builder modal
    await expect(page.getByRole('heading', { name: /create new routine/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(400);

    // Click the Morning Routine template card
    await page.getByText('Morning Routine').first().click();
    await page.waitForTimeout(800); // Let template fill name + steps

    // Save routine
    await page.getByRole('button', { name: /create routine/i }).click();

    // Modal closes and routine appears in the list
    await expect(page.getByRole('heading', { name: /create new routine/i })).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/morning routine/i).first()).toBeVisible({ timeout: 8000 });
  });
});
