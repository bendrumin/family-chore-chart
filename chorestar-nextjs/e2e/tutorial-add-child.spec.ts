/**
 * Tutorial: Adding & Customizing a Child
 * Slow-paced recording for use in how-to videos and newsletters.
 * Features shown: Add Child form, avatar Randomize, edit modal, color picker, robot avatar grid.
 */
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/parent.json' });

const CHILD_NAME = 'Demo Child';

test.describe('Tutorial — Add & Customize a Child', () => {
  test('add a child, randomize avatar, then pick color and robot style', async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto('/dashboard');
    await page.waitForSelector('button', { timeout: 10_000 });
    await page.waitForTimeout(1500); // Settle on the dashboard

    // ── OPEN ADD CHILD MODAL ──────────────────────────────────────────────────
    const addChildCta = page.getByRole('button', { name: /add.*first.*child/i });
    const addHeaderBtn = page.getByRole('button', { name: /^add$/i });

    if (await addChildCta.isVisible()) {
      await addChildCta.hover();
      await page.waitForTimeout(600);
      await addChildCta.click();
    } else {
      await addHeaderBtn.hover();
      await page.waitForTimeout(600);
      await addHeaderBtn.click();
    }

    await expect(page.getByRole('heading', { name: /add child/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1500); // Let modal fully animate in

    // ── FILL NAME ────────────────────────────────────────────────────────────
    const nameInput = page.getByLabel(/child's name/i);
    await nameInput.hover();
    await page.waitForTimeout(500);
    await nameInput.fill(CHILD_NAME);
    await page.waitForTimeout(1000);

    // ── FILL AGE ─────────────────────────────────────────────────────────────
    const ageInput = page.getByLabel(/age/i);
    await ageInput.hover();
    await page.waitForTimeout(500);
    await ageInput.fill('9');
    await page.waitForTimeout(1000);

    // ── RANDOMIZE AVATAR (show the feature) ──────────────────────────────────
    const randomizeBtn = page.getByRole('button', { name: /randomize/i });
    await randomizeBtn.hover();
    await page.waitForTimeout(800);
    await randomizeBtn.click();
    await page.waitForTimeout(1200);
    await randomizeBtn.click();
    await page.waitForTimeout(1200);
    await randomizeBtn.click();
    await page.waitForTimeout(1200);

    // ── SUBMIT ────────────────────────────────────────────────────────────────
    const submitBtn = page.locator('button[type="submit"]').filter({ hasText: /add child/i });
    await submitBtn.hover();
    await page.waitForTimeout(600);
    await submitBtn.click();
    await expect(page.getByRole('heading', { name: /add child/i })).not.toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(2000); // Watch success toast + list refresh

    // ── SELECT THE NEW CHILD ──────────────────────────────────────────────────
    const selectBtn = page.getByRole('button', { name: `Select ${CHILD_NAME}` }).first();
    await selectBtn.hover();
    await page.waitForTimeout(600);
    await selectBtn.click();
    await page.waitForTimeout(1000);

    // ── OPEN EDIT MODAL ───────────────────────────────────────────────────────
    const editBtn = page.locator('[title="Edit child"]').last();
    await editBtn.hover();
    await page.waitForTimeout(600);
    await editBtn.click();
    await expect(page.getByRole('heading', { name: /avatar.*appearance/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1500); // Let edit modal settle

    // ── PICK A BACKGROUND COLOR ───────────────────────────────────────────────
    const tealBtn = page.locator('button[title="#4ECDC4"]');
    await tealBtn.scrollIntoViewIfNeeded();
    await tealBtn.hover();
    await page.waitForTimeout(800);
    await tealBtn.click();
    await page.waitForTimeout(1200);

    // ── PICK A ROBOT AVATAR ───────────────────────────────────────────────────
    const robotImg = page.locator('img[alt="Robot variant03"]');
    await robotImg.scrollIntoViewIfNeeded();
    await robotImg.hover();
    await page.waitForTimeout(800);
    await robotImg.click();
    await page.waitForTimeout(1200);

    // ── SAVE ──────────────────────────────────────────────────────────────────
    const saveBtn = page.getByRole('button', { name: /save changes/i });
    await saveBtn.hover();
    await page.waitForTimeout(600);
    await saveBtn.click();
    await expect(saveBtn).not.toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(2000); // Watch result on dashboard
  });
});
