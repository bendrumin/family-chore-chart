import { test, expect, type Page } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config as dotenvConfig } from 'dotenv'

/**
 * Feature checks for the Premium work (October 2026): what free families see
 * and are offered, and what Premium families can do, end to end in the web
 * app against the real backend.
 *
 * Runs as The Star Family, the throwaway demo account (never a real family).
 * The service role flips it between free and Premium and cleans up every row a
 * test makes; it needs SUPABASE_SERVICE_ROLE_KEY from .env.local.
 *
 *   npx playwright test --project=features
 *   PLAYWRIGHT_BASE_URL=https://chorestar.app npx playwright test --project=features
 */

dotenvConfig({ path: '.env.local' })

const DEMO_EMAIL = 'bsiegel13+uitest-preview@gmail.com'
const DEMO_PASSWORD = 'RedditDemo2026!'
const TAG = 'e2e-features'

let admin: SupabaseClient
let familyId: string
let kids: { id: string; name: string }[]

async function setPlan(plan: 'free' | 'premium') {
  await admin.from('profiles').update({ subscription_type: plan }).eq('id', familyId)
}

async function signIn(page: Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(DEMO_EMAIL)
  await page.getByLabel(/password/i).fill(DEMO_PASSWORD)
  // Exact: the page also has "Sign in with Apple".
  await page.getByRole('button', { name: /^(sign in|log in)$/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
}

async function openSettings(page: Page, tab: string) {
  await page.goto(`/dashboard?settings=${tab}`)
  await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible({ timeout: 15_000 })
}

async function cleanup() {
  const kidIds = kids.map((k) => k.id)
  const { data: chores } = await admin.from('chores').select('id').in('child_id', kidIds).like('name', `${TAG}%`)
  const ids = (chores ?? []).map((c: { id: string }) => c.id)
  if (ids.length) {
    await admin.from('chore_completions').delete().in('chore_id', ids)
    await admin.from('chores').delete().in('id', ids)
  }
  await admin.from('routines').delete().in('child_id', kidIds).like('name', `${TAG}%`)
  await (admin as any).from('family_settings').update({ weekly_report_email: false }).eq('user_id', familyId)
  await (admin as any).from('paywall_events').delete().eq('user_id', familyId)
  await setPlan('free')
}

test.beforeAll(async () => {
  const key = (process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim().replace(/\\n$/, '')
  admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), key, { auth: { persistSession: false } })
  const { data: p } = await admin.from('profiles').select('id').eq('email', DEMO_EMAIL).single()
  familyId = p!.id
  const { data: k } = await admin.from('children').select('id, name').eq('user_id', familyId).order('created_at')
  kids = k ?? []
  expect(kids.length).toBeGreaterThanOrEqual(2)
  await cleanup()
})

test.afterAll(async () => {
  await cleanup()
})

test.describe.configure({ mode: 'serial' })

test.describe('public pages', () => {
  test('homepage sells the new Premium features and the free plan stays honest', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/chores that rotate between kids/i).first()).toBeVisible()
    await expect(page.getByText(/bonus chores, first to finish earns it/i).first()).toBeVisible()
    await expect(page.getByText(/10 more routine templates/i).first()).toBeVisible()
    await expect(page.getByText(/step-by-step routines with timers/i).first()).toBeVisible()
    await expect(page.getByText(/weekly progress reports/i)).toHaveCount(0)
  })

  test('the siblings blog post is published and in the sitemap', async ({ page, request }) => {
    await page.goto('/blog/split-chores-fairly-between-siblings')
    await expect(page.getByRole('heading', { level: 1, name: /split chores fairly between siblings/i })).toBeVisible()
    const sitemap = await (await request.get('/sitemap.xml')).text()
    expect(sitemap).toContain('/blog/split-chores-fairly-between-siblings')
  })

  test('the money jars blog post is published and in the sitemap', async ({ page, request }) => {
    await page.goto('/blog/spend-save-give-jars-allowance-for-kids')
    await expect(page.getByRole('heading', { level: 1, name: /spend, save, give/i })).toBeVisible()
    const sitemap = await (await request.get('/sitemap.xml')).text()
    expect(sitemap).toContain('/blog/spend-save-give-jars-allowance-for-kids')
  })

  test('the allowance cron refuses calls without the cron secret', async ({ request }) => {
    expect((await request.get('/api/cron/allowance')).status()).toBe(404)
  })

  test('weekly report unsubscribe link answers without signing in', async ({ page }) => {
    await page.goto('/api/reports/weekly/unsubscribe?t=not-a-token')
    await expect(page.getByText(/that link did not work/i)).toBeVisible()
  })
})

test.describe('free family', () => {
  test.beforeAll(async () => setPlan('free'))

  test('Billing shows the free plan and plans listing the new features', async ({ page }) => {
    await signIn(page)
    await openSettings(page, 'billing')
    await expect(page.getByText(/^free plan$/i).first()).toBeVisible()
    await expect(page.getByText(/3 children • 20 chores • 3 store rewards • 1 goal per child/)).toBeVisible()
    await expect(page.getByText(/chores that rotate between kids/i).first()).toBeVisible()
    await expect(page.getByText(/weekly family report email/i).first()).toBeVisible()
  })

  test('the store cap has a See Premium button that opens Billing and logs why', async ({ page }) => {
    await signIn(page)
    await openSettings(page, 'rewards')
    // Scoped to the store: the dashboard behind Settings has its own See
    // Premium buttons now (family challenges), and so does the Money section.
    const settings = page.getByRole('dialog', { name: /^settings$/i })
    await settings
      .getByRole('heading', { name: /^reward store$/i })
      .locator('xpath=following::button[contains(normalize-space(.), "See Premium")][1]')
      .click()
    await expect(page.getByText(/upgrade to premium/i).first()).toBeVisible({ timeout: 10_000 })
    await expect
      .poll(async () => {
        const { data } = await (admin as any).from('paywall_events').select('source').eq('user_id', familyId)
        return (data ?? []).map((e: { source: string }) => e.source)
      })
      .toContain('limit_store_items')
  })

  test('Money shows a locked preview; each tool opens Billing with its own source', async ({ page }) => {
    await signIn(page)
    await openSettings(page, 'rewards')
    await expect(page.getByText(/example: maya/i)).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: /weekly allowance/i }).first().click()
    await expect(page.getByText(/upgrade to premium/i).first()).toBeVisible({ timeout: 10_000 })
    await expect
      .poll(async () => {
        const { data } = await (admin as any).from('paywall_events').select('source').eq('user_id', familyId)
        return (data ?? []).map((e: { source: string }) => e.source)
      })
      .toContain('gate_allowance')
  })

  test('the weekly report is offered as Premium', async ({ page }) => {
    await signIn(page)
    await openSettings(page, 'appearance')
    await expect(page.getByText(/sunday email with each kid/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /^see premium$/i }).first()).toBeVisible()
  })
})

test.describe('Premium family', () => {
  test.beforeAll(async () => setPlan('premium'))

  test('Billing shows Premium with the new features', async ({ page }) => {
    await signIn(page)
    await openSettings(page, 'billing')
    await expect(page.getByText(/rotating & bonus chores/i).first()).toBeVisible()
    await expect(page.getByText(/routine template library/i).first()).toBeVisible()
  })

  test('the weekly report turns on and off', async ({ page }) => {
    await signIn(page)
    await openSettings(page, 'appearance')
    await page.getByRole('button', { name: /turn on weekly report/i }).click()
    await expect
      .poll(async () => (await (admin as any).from('family_settings').select('weekly_report_email').eq('user_id', familyId).single()).data?.weekly_report_email)
      .toBe(true)
    await page.getByRole('button', { name: /turn off weekly report/i }).click()
    await expect
      .poll(async () => (await (admin as any).from('family_settings').select('weekly_report_email').eq('user_id', familyId).single()).data?.weekly_report_email)
      .toBe(false)
  })

  test('shared chores: a rotation starts with the first kid; a bonus chore goes to everyone', async ({ request }) => {
    // The form posts to this endpoint; driving it directly keeps the check
    // about the behaviour, not the dialog layout.
    const session = await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(), {
      auth: { persistSession: false },
    }).auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
    const token = session.data.session!.access_token
    const post = (mode: string) =>
      request.post('/api/chores/shared', {
        headers: { Authorization: `Bearer ${token}` },
        data: { name: `${TAG} ${mode}`, rewardCents: 25, daysOfWeek: [0, 1, 2, 3, 4, 5, 6], mode, childIds: kids.slice(0, 2).map((k) => k.id) },
      })
    const rotate = await post('rotate')
    expect(rotate.status()).toBe(200)
    const r = await rotate.json()
    expect(r.chores.map((c: { child_id: string; is_active: boolean }) => [c.child_id, c.is_active])).toEqual(
      expect.arrayContaining([[kids[0].id, true], [kids[1].id, false]])
    )
    const grab = await post('grab')
    expect(grab.status()).toBe(200)
    expect((await grab.json()).chores.every((c: { is_active: boolean }) => c.is_active)).toBe(true)
  })

  test('a Premium routine template fills the builder', async ({ page }) => {
    await signIn(page)
    // Routines live under a kid: pick the first one (the dashboard opens on All).
    await page.getByRole('button', { name: /^show .*'s chores$/i }).first().click()
    await page.getByRole('tab', { name: /^routines$/i }).click()
    await page.getByRole('button', { name: /add routine|new routine/i }).first().click()
    await expect(page.getByRole('heading', { name: /create new routine/i })).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /homework hour/i }).click()
    await expect(page.getByText(/loaded homework hour template/i)).toBeVisible({ timeout: 5000 })
  })

  test('signed-in pages wear the family theme', async ({ page }) => {
    await signIn(page)
    await page.goto('/')
    // The nav learns it's signed in asynchronously, then switches to the
    // family's themed header (the logged-out header is translucent white).
    const nav = page.getByRole('navigation', { name: /main navigation/i })
    await expect
      .poll(() => nav.evaluate((el) => getComputedStyle(el).backgroundColor), { timeout: 15_000 })
      .not.toMatch(/^rgba\((255, 255, 255, 0\.8|0, 0, 0, 0)\)$/)
  })
})
