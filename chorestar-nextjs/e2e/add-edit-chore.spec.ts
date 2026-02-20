import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/parent.json' });

const CHORE_NAME = 'Demo Chore';
const CHORE_NAME_EDITED = 'Demo Chore (edited)';

test.describe('Add & Edit Chore (recording flow)', () => {
  test('parent adds a chore then edits it', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for dashboard and children to load
    await page.waitForSelector('button', { timeout: 10_000 });
    await page.waitForTimeout(1200);

    // Select the first child so the chore list is visible
    const firstChildBtn = page.getByRole('button', { name: /^select /i }).first();
    if (await firstChildBtn.isVisible()) {
      await firstChildBtn.click();
      await page.waitForTimeout(600);
    }

    // Make sure we're on the Chores tab
    await page.getByRole('button', { name: /^chores$/i }).click();
    await page.waitForTimeout(400);

    // === ADD CHORE ===
    const addChoreCta = page.getByRole('button', { name: /add.*first.*chore/i });
    const addChoreBtn = page.getByRole('button', { name: /^add chore$/i });

    if (await addChoreCta.isVisible()) {
      await addChoreCta.click();
    } else {
      await addChoreBtn.click();
    }

    await expect(page.getByRole('heading', { name: /add new chore/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    await page.getByLabel(/chore name/i).fill(CHORE_NAME);
    await page.waitForTimeout(400);

    // Set reward amount if visible
    const rewardInput = page.getByLabel(/reward/i);
    if (await rewardInput.isVisible()) {
      await rewardInput.clear();
      await rewardInput.fill('2.00');
      await page.waitForTimeout(300);
    }

    await page.getByRole('button', { name: /add chore/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1200); // Let success toast + list refresh

    // === EDIT THE NEW CHORE ===
    // Hover the chore to reveal the edit button, then click it
    const choreCard = page.getByText(CHORE_NAME).first();
    await choreCard.hover();
    await page.waitForTimeout(400);

    await page.locator('[title="Edit chore"]').last().click();
    await expect(page.getByRole('heading', { name: /edit chore/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    const nameInput = page.getByLabel(/chore name/i);
    await nameInput.clear();
    await nameInput.fill(CHORE_NAME_EDITED);
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(800);
  });
});
