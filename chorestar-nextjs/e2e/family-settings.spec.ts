import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/parent.json' });

test.describe('Family Settings (recording flow)', () => {
  test('parent views family share link and sets child PIN', async ({ page }) => {
    await page.goto('/dashboard');

    await page.waitForSelector('button', { timeout: 10_000 });
    await page.waitForTimeout(800);

    // === OPEN SETTINGS ===
    await page.locator('[title="Settings"]').click();
    await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(600);

    // Family tab is active by default — wait for Kid Login Link URL to load (async API call)
    const kidLoginInput = page.locator('input[readonly]').first();
    await kidLoginInput.waitFor({ state: 'visible', timeout: 8_000 });
    await kidLoginInput.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await kidLoginInput.hover();
    await page.waitForTimeout(600);

    // Copy the family share link
    await page.getByRole('button', { name: /copy/i }).click();
    await page.waitForTimeout(1000); // Let "Link copied!" toast appear

    // === OPEN EDIT CHILDREN to set a child PIN ===
    await page.getByRole('button', { name: /open editor/i }).click();
    await expect(page.getByRole('heading', { name: /edit children/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(800);

    // Scroll to and show the PIN section
    const pinHeading = page.getByRole('heading', { name: /kid login pin/i });
    await pinHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    // Click "Set PIN" (or "Change PIN" if already set from a prior run)
    await page.getByRole('button', { name: /set pin|change pin/i }).click();
    await page.waitForTimeout(400);

    // Enter the PIN in both fields
    await page.locator('#pin').fill('1234');
    await page.waitForTimeout(300);
    await page.locator('#confirmPin').fill('1234');
    await page.waitForTimeout(300);

    // Save the PIN
    await page.getByRole('button', { name: /save pin/i }).click();
    await page.waitForTimeout(1200);

    // Confirm "✓ Set" badge appears
    await expect(page.getByText('✓ Set')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);
  });
});
