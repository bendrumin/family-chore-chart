import { test, expect } from '@playwright/test';

/**
 * Per-Chore Rewards recording flow
 *
 * Shows:
 *  1. Reward Settings in Family tab — toggle from Flat Daily Rate → Per Chore
 *  2. Setting a Full Week Bonus Reward label ("pizza night")
 *  3. Saving settings
 *  4. Back on the dashboard — chore cards show individual "$X.XX each" amounts
 *  5. Editing a chore's reward amount (e.g. "Make Bed" → $0.50)
 *  6. Return to Settings — toggle back to Flat Daily Rate
 *
 * Run:
 *   npm run test:e2e:per-chore-rewards
 */

test.use({ storageState: 'e2e/.auth/parent.json' });

const CHORE_NAME = 'Make Bed';
const CHORE_REWARD = '0.50';
const BONUS_LABEL = 'pizza night';

test.describe('Per-Chore Rewards (recording flow)', () => {
  test('toggle per-chore mode on, set chore reward, toggle back off', async ({ page }) => {
    test.setTimeout(60_000);

    await page.goto('/dashboard');
    await page.waitForSelector('button', { timeout: 10_000 });
    await page.waitForTimeout(500);

    // ── STEP 1: Open Settings ─────────────────────────────────────────────────
    await page.locator('[title="Settings"]').click();
    await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(400);

    // Ensure we're on the Family tab (default)
    const familyTab = page.getByRole('button', { name: /^family$/i });
    if (await familyTab.isVisible()) {
      await familyTab.click();
      await page.waitForTimeout(300);
    }

    // ── STEP 2: Scroll to Reward Settings ────────────────────────────────────
    const rewardHeading = page.getByRole('heading', { name: /reward settings/i });
    await rewardHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Confirm "Flat Daily Rate" is active by default
    const flatBtn = page.getByRole('button', { name: /flat daily rate/i });
    await expect(flatBtn).toBeVisible();
    await page.waitForTimeout(400);

    // ── STEP 3: Click "Per Chore" toggle ─────────────────────────────────────
    const perChoreBtn = page.getByRole('button', { name: /per chore/i });
    await perChoreBtn.click();
    await page.waitForTimeout(500);

    // The daily reward input disappears; the info note appears
    await expect(page.getByText(/each chore earns its own set amount/i)).toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(400);

    // ── STEP 4: Type the weekly bonus label ──────────────────────────────────
    const bonusInput = page.getByPlaceholder(/ice cream/i);
    await bonusInput.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await bonusInput.clear();
    await bonusInput.fill(BONUS_LABEL);
    await page.waitForTimeout(400);

    // ── STEP 5: Save settings ────────────────────────────────────────────────
    await page.getByRole('button', { name: /save settings/i }).click();
    await expect(page.getByText(/settings saved/i)).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(800);

    // ── STEP 6: Go to dashboard, select first child ──────────────────────────
    await page.goto('/dashboard');
    await page.waitForSelector('button', { timeout: 10_000 });
    await page.waitForTimeout(500);

    const firstChildBtn = page.getByRole('button', { name: /^select /i }).first();
    if (await firstChildBtn.isVisible()) {
      await firstChildBtn.click();
      await page.waitForTimeout(400);
    }

    // Make sure we're on the Chores tab (tab may have an emoji prefix on some builds)
    await page.getByRole('button', { name: /chores/i }).filter({ hasNotText: /add/i }).first().click();
    await page.waitForTimeout(400);

    // ── STEP 7: Add the demo chore (if it doesn't exist) ─────────────────────
    const choreAlreadyExists = await page.getByText(CHORE_NAME).isVisible();
    if (!choreAlreadyExists) {
      const addChoreCta = page.getByRole('button', { name: /add.*first.*chore/i });
      const addChoreBtn = page.getByRole('button', { name: /^add chore$/i });

      if (await addChoreCta.isVisible()) {
        await addChoreCta.click();
      } else {
        await addChoreBtn.click();
      }

      await expect(page.getByRole('heading', { name: /add new chore/i })).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(400);

      await page.getByLabel(/chore name/i).fill(CHORE_NAME);
      await page.waitForTimeout(300);

      const rewardInput = page.getByLabel(/reward/i);
      if (await rewardInput.isVisible()) {
        await rewardInput.clear();
        await rewardInput.fill('1.00');
        await page.waitForTimeout(300);
      }

      await page.locator('button[type="submit"]').filter({ hasText: /add chore/i }).click();
      await expect(page.getByRole('heading', { name: /add new chore/i })).not.toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(800);
    }

    // ── STEP 8: Hover the chore card — show "$X.XX each" badge ───────────────
    const choreCard = page.getByText(CHORE_NAME).first();
    await choreCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await choreCard.hover();
    await page.waitForTimeout(500);

    // Confirm the reward amount is visible on the card
    await expect(page.getByText(/each$/i).first()).toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(400);

    // ── STEP 9: Edit the chore — change the reward amount ────────────────────
    await page.locator('[title="Edit chore"]').last().click();
    await expect(page.getByRole('heading', { name: /edit chore/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(400);

    const rewardInput = page.getByLabel(/reward/i);
    await rewardInput.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await rewardInput.clear();
    await rewardInput.fill(CHORE_REWARD);
    await page.waitForTimeout(400);

    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByRole('heading', { name: /edit chore/i })).not.toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(600);

    // Card now shows updated reward
    await choreCard.hover();
    await page.waitForTimeout(500);
    await expect(page.getByText('$0.50 each')).toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(500);

    // ── STEP 10: Return to Settings — toggle back to Flat Daily Rate ──────────
    await page.locator('[title="Settings"]').click();
    await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(400);

    await rewardHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    // "Per Chore" should currently be active
    await expect(page.getByText(/each chore earns its own set amount/i)).toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(400);

    // Click "Flat Daily Rate" to switch back
    await flatBtn.click();
    await page.waitForTimeout(500);

    // Daily reward input reappears
    await expect(page.getByLabel(/daily reward/i)).toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(500);

    // Save and close
    await page.getByRole('button', { name: /save settings/i }).click();
    await expect(page.getByText(/settings saved/i)).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);
  });
});
