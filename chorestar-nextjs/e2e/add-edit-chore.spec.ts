import { test, expect } from '@playwright/test';
import { removeChoresAddedSince } from './test-family';

test.use({ storageState: 'e2e/.auth/parent.json' });

const CHORE_NAME = 'Demo Chore';
const CHORE_NAME_EDITED = 'Demo Chore (edited)';

test.describe('Add & Edit Chore (recording flow)', () => {
  let startedAt = ''
  test.beforeEach(() => { startedAt = new Date().toISOString() })
  // "Demo Chore" and its edited name, added to the real test family.
  test.afterEach(async () => { await removeChoresAddedSince(CHORE_NAME, startedAt) })

  test('parent adds a chore then edits it', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for dashboard and children to load
    await page.waitForSelector('button', { timeout: 10_000 });
    await page.waitForTimeout(800);

    // Chores live under a kid: pick the first (the dashboard opens on everyone)
    await page.getByRole('button', { name: /^show .*'s chores$/i }).first().click();
    await page.waitForTimeout(600);

    // Make sure we're on the Chores tab
    await page.getByRole('tab', { name: /^chores$/i }).click();
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
    // The reward field has +/- stepper buttons whose aria-labels also mention
    // "reward" — target the textbox role so strict mode resolves to one element.
    const rewardInput = page.getByRole('textbox', { name: /reward/i });
    if (await rewardInput.isVisible()) {
      await rewardInput.clear();
      await rewardInput.fill('2.00');
      await page.waitForTimeout(300);
    }

    // Use the submit button inside the modal ("✨ Add Chore"), not the opener button ("Add Chore")
    await page.locator('button[type="submit"]').filter({ hasText: /add chore/i }).click();
    await expect(page.getByRole('heading', { name: /add new chore/i })).not.toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1200); // Let success toast + list refresh

    // === EDIT THE NEW CHORE ===
    const editBtn = page.getByRole('button', { name: `Edit ${CHORE_NAME}`, exact: true }).first();
    await editBtn.hover();
    await page.waitForTimeout(400);
    await editBtn.click();
    await expect(page.getByRole('heading', { name: /edit chore/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    const nameInput = page.getByLabel(/chore name/i);
    await nameInput.clear();
    await nameInput.fill(CHORE_NAME_EDITED);
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByRole('heading', { name: /edit chore/i })).not.toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(800);
  });
});
