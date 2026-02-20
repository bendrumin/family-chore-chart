import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/parent.json' });

const CHILD_NAME = 'Demo Child';

test.describe('Add & Edit Child (recording flow)', () => {
  test('parent adds a child with avatar, then edits avatar and saves', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for dashboard to be ready
    await page.waitForSelector('button', { timeout: 10_000 });
    await page.waitForTimeout(800);

    // === ADD CHILD ===
    const addChildCta = page.getByRole('button', { name: /add.*first.*child/i });
    const addHeaderBtn = page.getByRole('button', { name: /^add$/i });

    if (await addChildCta.isVisible()) {
      await addChildCta.click();
    } else {
      await addHeaderBtn.click();
    }

    await expect(page.getByRole('heading', { name: /add child/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    await page.getByLabel(/child's name/i).fill(CHILD_NAME);
    await page.waitForTimeout(400);

    await page.getByLabel(/age/i).fill('9');
    await page.waitForTimeout(400);

    // Show avatar randomization — click twice to demo the feature
    const randomizeBtn = page.getByRole('button', { name: /randomize/i });
    await randomizeBtn.click();
    await page.waitForTimeout(700);
    await randomizeBtn.click();
    await page.waitForTimeout(700);

    await page.locator('button[type="submit"]').filter({ hasText: /add child/i }).click();
    await expect(page.getByRole('heading', { name: /add child/i })).not.toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1200);

    // === EDIT THE NEW CHILD — show full avatar picker ===
    // Use .first() in case previous test runs left duplicate Demo Child entries
    await page.getByRole('button', { name: `Select ${CHILD_NAME}` }).first().click();
    await page.waitForTimeout(500);

    await page.locator('[title="Edit child"]').last().click();
    // Wait for edit modal with the Avatar & Appearance section
    await expect(page.getByRole('heading', { name: /avatar.*appearance/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    // Scroll to color picker and pick teal
    await page.locator('button[title="#4ECDC4"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.locator('button[title="#4ECDC4"]').click();
    await page.waitForTimeout(500);

    // Select a robot avatar from the default Robots tab
    const robotImg = page.locator('img[alt="Robot variant02"]');
    await robotImg.scrollIntoViewIfNeeded();
    await robotImg.click();
    await page.waitForTimeout(600);

    // Save changes
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByRole('button', { name: /save changes/i })).not.toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(800);
  });
});
