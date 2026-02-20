import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/parent.json' });

test.describe('Create Routine (recording flow)', () => {
  test('create a routine using template', async ({ page }) => {
    test.setTimeout(60_000);

    await page.goto('/dashboard');

    // Wait for dashboard to load
    await page.waitForSelector('button', { timeout: 10_000 });
    await page.waitForTimeout(800);

    // Click Routines tab and wait for it to render
    await page.getByRole('button', { name: /routines/i }).click();
    await page.waitForTimeout(1000);

    // Click Add Routine (in tab bar) or New Routine (in content)
    await page.getByRole('button', { name: /add routine|new routine/i }).first().click();

    // Wait for routine builder modal (templates appear near the top)
    await expect(page.getByRole('heading', { name: /create new routine/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(400);

    // Click the Morning Routine template button (it's a <button type="button"> inside the modal)
    await page.locator('button[type="button"]').filter({ hasText: 'Morning Routine' }).click();
    await page.waitForTimeout(800); // Let template fill name + steps

    // Verify name was populated, then save
    await expect(page.getByPlaceholder(/morning routine.*bedtime/i)).not.toBeEmpty();
    await page.getByRole('button', { name: /create routine/i }).click();

    // Modal closes and routine appears in the list
    await expect(page.getByRole('heading', { name: /create new routine/i })).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/morning routine/i).first()).toBeVisible({ timeout: 8000 });
  });
});
