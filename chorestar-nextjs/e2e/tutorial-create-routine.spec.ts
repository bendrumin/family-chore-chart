/**
 * Tutorial: Creating a Morning Routine
 * Slow-paced recording for use in how-to videos and newsletters.
 * Features shown: Routines tab, Add Routine button, Morning Routine template, creation.
 */
import { test, expect } from '@playwright/test';
import { removeRoutinesAddedSince } from './test-family';

test.use({ storageState: 'e2e/.auth/parent.json' });

test.describe('Tutorial — Create a Morning Routine', () => {
  let startedAt = ''
  test.beforeEach(() => { startedAt = new Date().toISOString() })
  // The template routine this makes on the real test family; only this run's.
  test.afterEach(async () => { await removeRoutinesAddedSince('morning routine%', startedAt) })

  test('create a morning routine using the template', async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto('/dashboard');
    await page.waitForSelector('button', { timeout: 10_000 });
    await page.waitForTimeout(1500);

    // ── PICK A KID (routines live under a kid) ────────────────────────────────
    const firstKid = page.getByRole('button', { name: /^show .*'s chores$/i }).first();
    await firstKid.hover();
    await page.waitForTimeout(600);
    await firstKid.click();
    await page.waitForTimeout(1000);

    // ── CLICK ROUTINES TAB ────────────────────────────────────────────────────
    const routinesTab = page.getByRole('tab', { name: /^routines$/i });
    await routinesTab.hover();
    await page.waitForTimeout(600);
    await routinesTab.click();
    await page.waitForTimeout(1500); // Let routines panel load

    // ── OPEN ADD ROUTINE MODAL ────────────────────────────────────────────────
    const addRoutineBtn = page.getByRole('button', { name: /add routine|new routine/i }).first();
    await addRoutineBtn.hover();
    await page.waitForTimeout(800);
    await addRoutineBtn.click();

    await expect(page.getByRole('heading', { name: /create new routine/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1500); // Let modal settle, templates visible

    // ── CLICK MORNING ROUTINE TEMPLATE ────────────────────────────────────────
    const morningTemplate = page.locator('button[type="button"]').filter({ hasText: 'Morning Routine' });
    await morningTemplate.hover();
    await page.waitForTimeout(1000);
    await morningTemplate.click();
    await page.waitForTimeout(1500); // Watch template fill name + steps

    // ── PAUSE TO SHOW FILLED FORM ─────────────────────────────────────────────
    await expect(page.getByPlaceholder(/morning routine.*bedtime/i)).not.toBeEmpty();
    await page.waitForTimeout(1500); // Let viewer read the pre-filled steps

    // ── CREATE ────────────────────────────────────────────────────────────────
    const createBtn = page.getByRole('button', { name: /create routine/i });
    await createBtn.hover();
    await page.waitForTimeout(800);
    await createBtn.click();

    await expect(page.getByRole('heading', { name: /create new routine/i })).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/morning routine/i).first()).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(2500); // Show the routine in the list
  });
});
