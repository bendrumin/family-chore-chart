/**
 * Tutorial: Family Settings — Share Link & Child PIN
 * Slow-paced recording for use in how-to videos and newsletters.
 * Features shown: Settings → Family tab, Kid Login Link copy, Open Editor, set PIN.
 */
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/parent.json' });

test.describe('Tutorial — Family Settings', () => {
  test('parent finds the share link and sets a child PIN', async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto('/dashboard');
    await page.waitForSelector('button', { timeout: 10_000 });
    await page.waitForTimeout(1500);

    // ── OPEN SETTINGS ─────────────────────────────────────────────────────────
    const settingsBtn = page.locator('[title="Settings"]');
    await settingsBtn.hover();
    await page.waitForTimeout(800);
    await settingsBtn.click();

    await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1500); // Let settings modal open fully

    // ── FAMILY TAB — KID LOGIN LINK ───────────────────────────────────────────
    // Family tab is the default — wait for the Kid Login Link URL to load
    const kidLoginInput = page.locator('input[readonly]').first();
    await kidLoginInput.waitFor({ state: 'visible', timeout: 8_000 });
    await kidLoginInput.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await kidLoginInput.hover();
    await page.waitForTimeout(1200); // Let viewer see the share link

    // ── COPY THE LINK ─────────────────────────────────────────────────────────
    const copyBtn = page.getByRole('button', { name: /copy/i });
    await copyBtn.hover();
    await page.waitForTimeout(600);
    await copyBtn.click();
    await page.waitForTimeout(1500); // "Link copied!" toast

    // ── OPEN EDIT CHILDREN ────────────────────────────────────────────────────
    const openEditorBtn = page.getByRole('button', { name: /open editor/i });
    await openEditorBtn.hover();
    await page.waitForTimeout(800);
    await openEditorBtn.click();

    await expect(page.getByRole('heading', { name: /edit children/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1500);

    // ── SCROLL TO PIN SECTION ─────────────────────────────────────────────────
    const pinHeading = page.getByRole('heading', { name: /kid login pin/i });
    await pinHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200); // Let viewer read the PIN section

    // ── CLICK SET PIN / CHANGE PIN ────────────────────────────────────────────
    const setPinBtn = page.getByRole('button', { name: /set pin|change pin/i });
    await setPinBtn.hover();
    await page.waitForTimeout(800);
    await setPinBtn.click();
    await page.waitForTimeout(1000);

    // ── ENTER PIN ─────────────────────────────────────────────────────────────
    const pinInput = page.locator('#pin');
    await pinInput.hover();
    await page.waitForTimeout(500);
    for (const digit of '1234') {
      await pinInput.type(digit, { delay: 200 });
    }
    await page.waitForTimeout(800);

    const confirmInput = page.locator('#confirmPin');
    await confirmInput.hover();
    await page.waitForTimeout(500);
    for (const digit of '1234') {
      await confirmInput.type(digit, { delay: 200 });
    }
    await page.waitForTimeout(800);

    // ── SAVE PIN ──────────────────────────────────────────────────────────────
    const savePinBtn = page.getByRole('button', { name: /save pin/i });
    await savePinBtn.hover();
    await page.waitForTimeout(600);
    await savePinBtn.click();
    await page.waitForTimeout(1500); // Watch success toast

    // ── CONFIRM ✓ SET BADGE ────────────────────────────────────────────────────
    await expect(page.getByText('✓ Set')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(2000); // Show the result
  });
});
