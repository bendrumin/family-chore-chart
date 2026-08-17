import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/parent.json' });

const CHILD_NAME = 'Photo Test';

// End-to-end check of the photo-avatar pipeline: upload → Supabase storage →
// signed URL renders → remove. Creates its own child and deletes it after, so
// the family is left exactly as it was found.
test.describe('Photo avatar upload', () => {
  test('parent uploads a photo for a child, sees it render, then cleans up', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('button', { timeout: 10_000 });
    await page.waitForTimeout(800);

    // === ADD a throwaway child ===
    const addChildCta = page.getByRole('button', { name: /add.*first.*child/i });
    const addHeaderBtn = page.getByRole('button', { name: /^add( child)?$/i });
    if (await addChildCta.isVisible()) {
      await addChildCta.click();
    } else {
      await addHeaderBtn.click();
    }
    await expect(page.getByRole('heading', { name: /add child/i })).toBeVisible({ timeout: 5000 });
    await page.getByLabel(/child's name/i).fill(CHILD_NAME);
    await page.getByLabel(/age/i).fill('8');
    await page.locator('button[type="submit"]').filter({ hasText: /add child/i }).click();
    await expect(page.getByRole('heading', { name: /add child/i })).not.toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1000);

    // === OPEN the edit modal ===
    await page.getByRole('button', { name: `Select ${CHILD_NAME}` }).first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: `Edit ${CHILD_NAME}` }).first().click();
    await expect(page.getByRole('heading', { name: /avatar.*appearance/i })).toBeVisible({ timeout: 5000 });

    // === UPLOAD the photo (input is hidden; setInputFiles works regardless) ===
    await page.setInputFiles('input[type="file"][accept="image/*"]', 'e2e/fixtures/avatar-photo.png');
    await expect(page.getByText(`📸 New photo for ${CHILD_NAME}!`)).toBeVisible({ timeout: 20_000 });

    // The preview circle should now render the uploaded image via a signed URL
    await expect(page.locator(`img[alt="${CHILD_NAME}"]`).first()).toBeVisible({ timeout: 10_000 });

    // === REMOVE the photo (also deletes the storage object) ===
    await page.getByRole('button', { name: /^remove$/i }).click();
    await expect(page.getByText(/photo removed/i)).toBeVisible({ timeout: 10_000 });

    // === DELETE the throwaway child ===
    await page.getByRole('button', { name: `Delete ${CHILD_NAME}` }).click();
    await expect(page.getByRole('heading', { name: /delete child\?/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /^delete$/i }).click();
    await expect(page.getByText(/deleted successfully/i)).toBeVisible({ timeout: 10_000 });
  });
});
