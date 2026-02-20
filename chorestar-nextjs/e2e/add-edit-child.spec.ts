import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/parent.json' });

const CHILD_NAME = 'Demo Child';

test.describe('Add & Edit Child (recording flow)', () => {
  test('parent adds a child then edits them', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for dashboard to be ready
    await page.waitForSelector('button', { timeout: 10_000 });
    await page.waitForTimeout(1000);

    // === ADD CHILD ===
    // Prefer the "Add Your First Child" CTA if no children yet, else the header "Add" button
    const addChildCta = page.getByRole('button', { name: /add.*first.*child/i });
    const addHeaderBtn = page.getByRole('button', { name: /^add$/i });

    if (await addChildCta.isVisible()) {
      await addChildCta.click();
    } else {
      await addHeaderBtn.click();
    }

    await expect(page.getByRole('heading', { name: /add child/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500); // Let modal animate in

    await page.getByLabel(/child's name/i).fill(CHILD_NAME);
    await page.waitForTimeout(400);

    await page.getByLabel(/age/i).fill('9');
    await page.waitForTimeout(400);

    await page.getByRole('button', { name: /add child/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1200); // Let success toast show + list refresh

    // === EDIT THE NEW CHILD ===
    // Select the new child card to make the edit button always visible
    await page.getByRole('button', { name: `Select ${CHILD_NAME}` }).click();
    await page.waitForTimeout(500);

    await page.locator('[title="Edit child"]').last().click();
    await expect(page.getByRole('heading', { name: new RegExp(CHILD_NAME, 'i') })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    // Change the age
    const ageInput = page.getByLabel(/age/i);
    await ageInput.clear();
    await ageInput.fill('10');
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(800);
  });
});
