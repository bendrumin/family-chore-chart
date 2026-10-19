import { test, expect, type APIRequestContext, type Browser, type Page } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config as dotenvConfig } from 'dotenv'
import crypto from 'crypto'
import { todayIn, weekWindow } from '../lib/challenges/progress'

/**
 * End-to-end checks for the October 19 2026 changes that had no coverage,
 * free and Premium, against the real backend:
 *
 *   1. Star Pets (migration 034)
 *   2. Finished routines' rewards count toward the wallet (routine-earnings)
 *   3. Shared (rotating and bonus) chores edited and stopped as one group
 *   4. The free savings-goal cap, in the UI and in the database (migration 029)
 *   5. Joining a family by code goes through the server (migration 028)
 *   6. A lapsed (free) owner can still remove a co-parent
 *
 * Runs as The Star Family, the throwaway demo account (never a real family),
 * like e2e/features.spec.ts and e2e/premium-features.spec.ts. The service role
 * flips the plan, stands in for a kid's PIN login (a kid_sessions row), ticks
 * chores, and removes every row a test makes. Everything a test creates is
 * tagged `e2e-more` or recorded by id; the family ends on the free plan with
 * the same pets, goals, members and balances it started with. Test 6 makes a
 * temporary auth user (bsiegel13+e2e-coparent-<ts>@gmail.com) and deletes it.
 *
 *   npm run test:e2e:features
 */

dotenvConfig({ path: '.env.local' })

const DEMO_EMAIL = 'bsiegel13+uitest-preview@gmail.com'
const DEMO_PASSWORD = 'RedditDemo2026!'
const TAG = 'e2e-more'
const COPARENT_PREFIX = 'bsiegel13+e2e-coparent-'

let admin: SupabaseClient
/** The demo parent's own session (RLS applies), for the database checks. */
let parent: SupabaseClient
let parentToken: string
let familyId: string
let timeZone: string
let kids: { id: string; name: string }[]
const kidTokens: string[] = []
const tempUserIds: string[] = []

// ---------------------------------------------------------------------------
// Helpers (same shapes as premium-features.spec.ts)
// ---------------------------------------------------------------------------

async function setPlan(plan: 'free' | 'premium') {
  await admin.from('profiles').update({ subscription_type: plan }).eq('id', familyId)
}

async function signIn(page: Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(DEMO_EMAIL)
  await page.getByLabel(/password/i).fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: /^(sign in|log in)$/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
}

async function openSettings(page: Page, tab: string) {
  await page.goto(`/dashboard?settings=${tab}`)
  await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible({ timeout: 15_000 })
  return page.getByRole('dialog', { name: /^settings$/i })
}

async function paywallSources(): Promise<string[]> {
  const { data } = await (admin as any).from('paywall_events').select('source').eq('user_id', familyId)
  return (data ?? []).map((e: { source: string }) => e.source)
}

/** A kid session, as a correct PIN at /kid-login makes one (8 hours). */
async function kidSession(childId: string): Promise<string> {
  const { data, error } = await admin
    .from('kid_sessions')
    .insert({ child_id: childId, expires_at: new Date(Date.now() + 8 * 3600_000).toISOString() })
    .select('token')
    .single()
  expect(error).toBeNull()
  kidTokens.push(data!.token)
  return data!.token
}

async function wallet(request: APIRequestContext, token: string) {
  const res = await request.get('/api/kid/wallet', { headers: { Authorization: `Bearer ${token}` } })
  expect(res.status()).toBe(200)
  return res.json()
}

const parentHeaders = () => ({ Authorization: `Bearer ${parentToken}` })
const kidHeaders = (token: string) => ({ Authorization: `Bearer ${token}` })

/** A browser page in kid mode on its own device: no parent session at all. */
async function kidPage(browser: Browser, child: { id: string; name: string }, token: string): Promise<Page> {
  const context = await browser.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000' })
  await context.addInitScript(
    ({ child, token }) => {
      localStorage.setItem(
        'kidMode',
        JSON.stringify({ child, kidToken: token, familyCode: null, timestamp: Date.now(), expiresIn: 8 * 3600_000 })
      )
    },
    { child, token }
  )
  return context.newPage()
}

function todayKeys() {
  const today = todayIn(timeZone)
  return {
    today,
    week_start: weekWindow(today).starts_on,
    day_of_week: new Date(`${today}T00:00:00Z`).getUTCDay(),
  }
}

async function makeChore(childId: string, name: string, extra: Record<string, unknown> = {}) {
  const { data, error } = await (admin as any)
    .from('chores')
    .insert({ child_id: childId, name: `${TAG} ${name}`, reward_cents: 0, days_of_week: [0, 1, 2, 3, 4, 5, 6], ...extra })
    .select('id')
    .single()
  expect(error).toBeNull()
  return data!.id as string
}

async function tickToday(choreId: string) {
  const { week_start, day_of_week } = todayKeys()
  const { error } = await admin.from('chore_completions').insert({ chore_id: choreId, week_start, day_of_week, status: 'approved' })
  expect(error).toBeNull()
}

async function getPet(request: APIRequestContext, token: string) {
  const res = await request.get('/api/kid/pet', { headers: kidHeaders(token) })
  expect(res.status()).toBe(200)
  return (await res.json()).pet
}

const postPet = (request: APIRequestContext, token: string, data: Record<string, unknown>) =>
  request.post('/api/kid/pet', { headers: kidHeaders(token), data })

// ---------------------------------------------------------------------------
// Cleanup: every row these tests make, for the demo family only
// ---------------------------------------------------------------------------

/** Pets as they were when the run started (none, today), restored at the end. */
let petBaseline: { pets: Record<string, unknown>[]; cosmetics: Record<string, unknown>[] } | null = null

async function snapshotPets() {
  const ids = kids.map((k) => k.id)
  const [{ data: pets }, { data: cosmetics }] = await Promise.all([
    (admin as any).from('child_pets').select('*').in('child_id', ids),
    (admin as any).from('child_pet_cosmetics').select('*').in('child_id', ids),
  ])
  petBaseline = { pets: pets ?? [], cosmetics: cosmetics ?? [] }
}

async function cleanupPets() {
  if (!petBaseline) return
  const ids = kids.map((k) => k.id)
  await (admin as any).from('child_pet_cosmetics').delete().in('child_id', ids)
  await (admin as any).from('child_pets').delete().in('child_id', ids)
  if (petBaseline.pets.length) await (admin as any).from('child_pets').insert(petBaseline.pets)
  if (petBaseline.cosmetics.length) await (admin as any).from('child_pet_cosmetics').insert(petBaseline.cosmetics)
}

async function cleanupChores() {
  const { data } = await admin.from('chores').select('id').in('child_id', kids.map((k) => k.id)).like('name', `${TAG}%`)
  const ids = (data ?? []).map((c: { id: string }) => c.id)
  if (ids.length) {
    await admin.from('chore_completions').delete().in('chore_id', ids)
    await admin.from('chores').delete().in('id', ids)
  }
}

async function cleanupRoutines() {
  const { data } = await admin.from('routines').select('id').in('child_id', kids.map((k) => k.id)).like('name', `${TAG}%`)
  const ids = (data ?? []).map((r: { id: string }) => r.id)
  if (ids.length) {
    await admin.from('routine_completions').delete().in('routine_id', ids)
    await (admin as any).from('routine_progress').delete().in('routine_id', ids)
    await admin.from('routine_steps').delete().in('routine_id', ids)
    await admin.from('routines').delete().in('id', ids)
  }
}

async function cleanupGoals() {
  await admin.from('goals').delete().in('child_id', kids.map((k) => k.id)).like('title', `${TAG}%`)
}

/** Family codes this run made (only when the family had none). */
let createdFamilyCodeId: string | null = null

async function cleanupJoining() {
  if (createdFamilyCodeId) {
    await (admin as any).from('family_codes').delete().eq('id', createdFamilyCodeId)
    createdFamilyCodeId = null
  }
  // Wrong-code attempts by the demo parent: keeps the rate limit clear.
  await (admin as any).from('family_join_attempts').delete().eq('user_id', familyId)
  // A refused self-insert should leave nothing, but never leave it behind.
  await (admin as any).from('family_members').delete().eq('user_id', familyId).eq('family_id', familyId)
}

async function cleanupTempUsers() {
  const { data } = await admin.from('profiles').select('id').like('email', `${COPARENT_PREFIX}%`)
  const ids = new Set<string>([...tempUserIds, ...(data ?? []).map((p: { id: string }) => p.id)])
  for (const id of ids) {
    await (admin as any).from('family_members').delete().eq('user_id', id)
    await admin.from('profiles').delete().eq('id', id)
    await admin.auth.admin.deleteUser(id).catch(() => undefined)
  }
  tempUserIds.length = 0
}

async function cleanupAll() {
  await cleanupPets()
  await cleanupRoutines()
  await cleanupChores()
  await cleanupGoals()
  await cleanupJoining()
  await cleanupTempUsers()
  if (kidTokens.length) await admin.from('kid_sessions').delete().in('token', kidTokens)
  await (admin as any).from('paywall_events').delete().eq('user_id', familyId)
  await setPlan('free')
}

/** Both kids' wallets on the free plan before anything ran. */
const walletsBefore: Record<string, any>[] = []
const WALLET_KEYS = ['balanceCents', 'earnedCents', 'paidCents', 'owedCents', 'spendableCents', 'jars', 'minutes', 'moneyNews', 'goals']

test.beforeAll(async ({ request }) => {
  const key = (process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim().replace(/\\n$/, '')
  admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), key, { auth: { persistSession: false } })
  const { data: p } = await admin.from('profiles').select('id').eq('email', DEMO_EMAIL).single()
  familyId = p!.id
  const { data: k } = await admin.from('children').select('id, name').eq('user_id', familyId).order('created_at')
  kids = k ?? []
  expect(kids.length).toBeGreaterThanOrEqual(2)
  const { data: settings } = await admin.from('family_settings').select('timezone').eq('user_id', familyId).maybeSingle()
  timeZone = settings?.timezone || 'UTC'

  parent = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(), {
    auth: { persistSession: false },
  })
  const session = await parent.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
  parentToken = session.data.session!.access_token

  // Leftovers from an interrupted run first (tagged rows, temp users), then
  // the baselines. Pets have no tag, so they're snapshotted as they stand.
  await cleanupRoutines()
  await cleanupChores()
  await cleanupGoals()
  await cleanupJoining()
  await cleanupTempUsers()
  await (admin as any).from('paywall_events').delete().eq('user_id', familyId)
  await setPlan('free')
  await snapshotPets()
  for (const kid of kids.slice(0, 2)) walletsBefore.push(await wallet(request, await kidSession(kid.id)))
})

test.afterAll(async () => {
  await cleanupAll()
})

test.describe.configure({ mode: 'serial' })

// ---------------------------------------------------------------------------
// 1. Star Pets
// ---------------------------------------------------------------------------

test.describe('Star Pets', () => {
  const FREE_NAME = 'Biscuit'
  const PREMIUM_NAME = 'Rex'
  const RENAMED = 'Rexy'
  let freeToken: string
  let premiumToken: string

  test.beforeAll(async () => {
    await setPlan('free')
    // Start with no pets so the adoption flow shows; restored afterwards.
    const ids = kids.map((k) => k.id)
    await (admin as any).from('child_pet_cosmetics').delete().in('child_id', ids)
    await (admin as any).from('child_pets').delete().in('child_id', ids)
    freeToken = await kidSession(kids[0].id)
    premiumToken = await kidSession(kids[1].id)
  })

  test('free: the kid adopts the pup; other species and outfits are Premium', async ({ browser, request }) => {
    const kid = kids[0]
    const page = await kidPage(browser, kid, freeToken)
    await page.goto(`/kid/${kid.id}`)
    const adopt = page.getByRole('region', { name: /adopt a star pet/i })
    await expect(adopt).toBeVisible({ timeout: 20_000 })
    // Only the pup is open; a locked species asks for a grown-up instead.
    await expect(adopt.getByRole('radio', { name: /^pup$/i })).toHaveAttribute('aria-checked', 'true')
    const kitty = adopt.getByRole('radio', { name: /kitty/i })
    await expect(kitty).toHaveAttribute('aria-disabled', 'true')
    // aria-disabled, so Playwright won't click it the usual way; a kid's tap still lands.
    await kitty.dispatchEvent('click')
    await expect(adopt.getByText(/ask a grown-up about star pets/i)).toBeVisible()
    await expect(adopt.getByRole('radio', { name: /^pup$/i })).toHaveAttribute('aria-checked', 'true')

    await adopt.getByLabel('Name your pet').fill(FREE_NAME)
    await adopt.getByRole('button', { name: /^adopt!$/i }).click()
    const card = page.getByRole('region', { name: FREE_NAME })
    await expect(card).toBeVisible({ timeout: 10_000 })
    await expect(card.getByText(/ask a grown-up about star pets/i).first()).toBeVisible()
    await page.context().close()

    const { data: row } = await (admin as any).from('child_pets').select('species, name, adopted_on, enabled').eq('child_id', kid.id).single()
    expect(row).toMatchObject({ species: 'pup', name: FREE_NAME, enabled: true, adopted_on: todayIn(timeZone) })

    // The API holds the line for any client.
    const kittyRes = await postPet(request, freeToken, { action: 'adopt', species: 'kitty', name: 'Whiskers' })
    expect(kittyRes.status()).toBe(403)
    expect((await kittyRes.json()).error).toBe('premium_required')
    const equipRes = await postPet(request, freeToken, { action: 'equip', slot: 'hat', itemId: 'cap' })
    expect(equipRes.status()).toBe(403)
    expect((await equipRes.json()).error).toBe('premium_required')

    const pet = await getPet(request, freeToken)
    expect(pet).toMatchObject({ adopted: true, premium: false, species: 'pup', name: FREE_NAME })
    expect(pet.equipped).toEqual({ hat: null, accessory: null, habitat: null })
    expect(pet.speciesOptions.filter((o: { locked: boolean }) => !o.locked).map((o: { id: string }) => o.id)).toEqual(['pup'])
    expect(pet.wardrobe.every((w: { state: string }) => w.state === 'premium')).toBe(true)
  })

  test('free: the parent dashboard shows the pet; See Premium logs gate_pet', async ({ page }) => {
    await signIn(page)
    const card = page.getByRole('region', { name: /^star pets$/i })
    await expect(card).toBeVisible({ timeout: 15_000 })
    const maya = card.getByRole('listitem').filter({ hasText: kids[0].name })
    await expect(maya.getByText(new RegExp(`^${FREE_NAME} · Lv \\d+ `))).toBeVisible()
    await expect(card.getByText(/premium unlocks all six pets/i)).toBeVisible()
    await card.getByRole('button', { name: /^see premium$/i }).click()
    await expect(page.getByText(/upgrade to premium/i).first()).toBeVisible({ timeout: 10_000 })
    await expect.poll(paywallSources).toContain('gate_pet')
  })

  test('Premium: adopt a Premium species, rename it, and dress it if anything is unlocked', async ({ browser, request }) => {
    await setPlan('premium')
    const kid = kids[1]
    const page = await kidPage(browser, kid, premiumToken)
    await page.goto(`/kid/${kid.id}`)
    const adopt = page.getByRole('region', { name: /adopt a star pet/i })
    await expect(adopt).toBeVisible({ timeout: 20_000 })
    const dino = adopt.getByRole('radio', { name: /^dino$/i })
    await expect(dino).not.toHaveAttribute('aria-disabled', 'true')
    await dino.click()
    await expect(dino).toHaveAttribute('aria-checked', 'true')
    await adopt.getByLabel('Name your pet').fill(PREMIUM_NAME)
    await adopt.getByRole('button', { name: /^adopt!$/i }).click()
    const card = page.getByRole('region', { name: PREMIUM_NAME })
    await expect(card).toBeVisible({ timeout: 10_000 })
    await expect(card.getByText(/ask a grown-up/i)).toHaveCount(0)

    // Rename from the card's Change panel.
    await card.getByRole('button', { name: /^change$/i }).click()
    await card.getByLabel('Name your pet').fill(RENAMED)
    await card.getByRole('button', { name: /^save$/i }).click()
    await expect(page.getByRole('region', { name: RENAMED })).toBeVisible({ timeout: 10_000 })

    const { data: row } = await (admin as any).from('child_pets').select('species, name').eq('child_id', kid.id).single()
    expect(row).toEqual({ species: 'dino', name: RENAMED })

    // Rename through the API too (the iOS/Android path).
    const renamed = await postPet(request, premiumToken, { action: 'rename', name: `  ${RENAMED}  ` })
    expect(renamed.status()).toBe(200)
    expect((await renamed.json()).pet.name).toBe(RENAMED)

    const pet = await getPet(request, premiumToken)
    expect(pet).toMatchObject({ premium: true, species: 'dino', name: RENAMED })
    expect(pet.speciesOptions.every((o: { locked: boolean }) => !o.locked)).toBe(true)
    const unlocked = pet.wardrobe.find((w: { state: string }) => w.state === 'unlocked')
    if (unlocked) {
      const res = await postPet(request, premiumToken, { action: 'equip', slot: unlocked.slot, itemId: unlocked.id })
      expect(res.status()).toBe(200)
      expect((await res.json()).pet.equipped[unlocked.slot]).toBe(unlocked.id)
    } else {
      // A brand-new pet is level 1 and the first outfit unlocks at level 2.
      expect(pet.level).toBe(1)
      expect(pet.wardrobe.length).toBeGreaterThan(0)
      expect(pet.wardrobe.every((w: { state: string }) => w.state === 'level')).toBe(true)
      const locked = await postPet(request, premiumToken, { action: 'equip', slot: 'accessory', itemId: 'bowtie' })
      expect(locked.status()).toBe(409)
      expect((await locked.json()).error).toBe('locked')
      // The wardrobe shows it locked with the level it opens at.
      const hat = card.getByRole('button', { name: /: locked$/i }).first()
      await expect(hat).toBeDisabled()
      await expect(card.getByText(/level 3/i).first()).toBeVisible()
    }
    await page.context().close()
  })

  test('Premium: XP rises after an approved chore tick', async ({ request }) => {
    const before = await getPet(request, premiumToken)
    const choreId = await makeChore(kids[1].id, 'pet xp chore')
    await tickToday(choreId)
    const after = await getPet(request, premiumToken)
    expect(after.breakdown.choreCount).toBe(before.breakdown.choreCount + 1)
    expect(after.xp).toBeGreaterThanOrEqual(before.xp + 10)
    expect(after.level).toBeGreaterThanOrEqual(before.level)
  })

  test('the per-kid switch in Settings > Family hides the pet from the kid', async ({ page, browser, request }) => {
    const kid = kids[1]
    await signIn(page)
    const settings = await openSettings(page, 'family')
    const toggle = settings.getByRole('switch', { name: `Star Pet for ${kid.name}` })
    await expect(toggle).toHaveAttribute('aria-checked', 'true', { timeout: 15_000 })
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'false', { timeout: 10_000 })
    await expect
      .poll(async () => (await (admin as any).from('child_pets').select('enabled').eq('child_id', kid.id).single()).data?.enabled)
      .toBe(false)

    const kidView = await kidPage(browser, kid, premiumToken)
    const petResponse = kidView.waitForResponse((r) => r.url().includes('/api/kid/pet') && r.request().method() === 'GET')
    await kidView.goto(`/kid/${kid.id}`)
    const body = await (await petResponse).json()
    expect(body.pet.enabled).toBe(false)
    await expect(kidView.getByRole('button', { name: /log ?out/i }).first()).toBeVisible({ timeout: 20_000 })
    await expect(kidView.getByText(/my star pet/i)).toHaveCount(0)
    await expect(kidView.getByRole('region', { name: RENAMED })).toHaveCount(0)
    await kidView.context().close()

    // Off means off for the API too; nothing was deleted.
    const refused = await postPet(request, premiumToken, { action: 'rename', name: 'Nope' })
    expect(refused.status()).toBe(403)
    expect((await refused.json()).error).toBe('pets_off')
    const { data: row } = await (admin as any).from('child_pets').select('species, name').eq('child_id', kid.id).single()
    expect(row).toEqual({ species: 'dino', name: RENAMED })

    // Back on brings the same pet back.
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'true', { timeout: 10_000 })
    expect((await getPet(request, premiumToken)).name).toBe(RENAMED)
  })
})

// ---------------------------------------------------------------------------
// 2. Routine rewards count toward the wallet
// ---------------------------------------------------------------------------

test.describe('Routine rewards', () => {
  const REWARD = 30
  let routineId: string
  let token: string

  test.beforeAll(async () => {
    await setPlan('free')
    const kid = kids[1]
    const { data, error } = await admin
      .from('routines')
      .insert({ child_id: kid.id, name: `${TAG} Reward routine`, type: 'custom', icon: 'check', color: '#6366f1', reward_cents: REWARD })
      .select('id')
      .single()
    expect(error).toBeNull()
    routineId = data!.id
    await admin.from('routine_steps').insert([
      { routine_id: routineId, title: 'Brush teeth', icon: 'check', order_index: 0 },
      { routine_id: routineId, title: 'Pack bag', icon: 'check', order_index: 1 },
    ])
    token = await kidSession(kid.id)
  })
  test.afterAll(async () => cleanupRoutines())

  test('finishing every step adds exactly the reward to the wallet, once a day', async ({ request }) => {
    const kid = kids[1]
    const before = await wallet(request, token)
    const complete = () =>
      request.post(`/api/routines/${routineId}/complete`, {
        headers: kidHeaders(token),
        data: { childId: kid.id, stepsCompleted: 2, stepsTotal: 2, durationSeconds: 95 },
      })

    const res = await complete()
    expect(res.status()).toBe(200)
    expect(await res.json()).toMatchObject({ success: true, pointsEarned: REWARD })

    const after = await wallet(request, token)
    expect(after.earnedCents).toBe(before.earnedCents + REWARD)
    expect(after.balanceCents).toBe(before.balanceCents + REWARD)
    expect(after.owedCents).toBe(before.owedCents + REWARD)

    // Again the same day: refused, and the wallet doesn't move.
    const again = await complete()
    expect(again.status()).toBe(200)
    expect(await again.json()).toMatchObject({ alreadyCompleted: true })
    const third = await wallet(request, token)
    expect(third.earnedCents).toBe(after.earnedCents)
    expect(third.balanceCents).toBe(after.balanceCents)
    const { data: rows } = await admin.from('routine_completions').select('points_earned').eq('routine_id', routineId)
    expect(rows).toEqual([{ points_earned: REWARD }])
  })
})

// ---------------------------------------------------------------------------
// 3. Shared chores are edited and stopped as one group
// ---------------------------------------------------------------------------

test.describe('Shared chores as a group', () => {
  test.beforeAll(async () => {
    await setPlan('premium')
    await cleanupChores()
  })
  test.afterAll(async () => cleanupChores())

  for (const [mode, badge] of [
    ['rotate', 'Takes turns'],
    ['grab', 'Bonus'],
  ] as const) {
    test(`${mode}: the "${badge}" badge, an edit lands on every copy, Stop sharing deletes them all`, async ({ page, request }) => {
      const name = `${TAG} ${mode} chore`
      const renamed = `${TAG} ${mode} renamed`
      const created = await request.post('/api/chores/shared', {
        headers: parentHeaders(),
        data: { name, rewardCents: 25, daysOfWeek: [0, 1, 2, 3, 4, 5, 6], mode, childIds: kids.slice(0, 2).map((k) => k.id) },
      })
      expect(created.status()).toBe(200)
      const { groupId } = await created.json()
      const copies = async () =>
        (await (admin as any).from('chores').select('child_id, name, reward_cents').eq('rotation_group_id', groupId)).data ?? []
      expect(await copies()).toHaveLength(2)

      await signIn(page)
      await page.getByRole('button', { name: new RegExp(`^show ${kids[0].name}'s chores$`, 'i') }).click()
      const edit = page.getByRole('button', { name: `Edit ${name}` }).first()
      await expect(edit).toBeVisible({ timeout: 15_000 })
      await expect(edit.locator('xpath=..').getByText(badge, { exact: true })).toBeVisible()

      await edit.click()
      const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: /edit chore/i }) })
      await expect(dialog).toBeVisible()
      await expect(dialog.getByText(/changes here apply to every kid sharing it/i)).toBeVisible()
      await expect(dialog.getByText(badge, { exact: true })).toBeVisible()
      await dialog.getByLabel('Chore Name').fill(renamed)
      await dialog.getByLabel('Reward Amount').fill('0.40')
      await dialog.getByRole('button', { name: /^save changes$/i }).click()
      await expect(page.getByText(`${renamed} updated for every kid sharing it`)).toBeVisible({ timeout: 10_000 })

      await expect.poll(copies).toEqual(
        expect.arrayContaining(kids.slice(0, 2).map((k) => ({ child_id: k.id, name: renamed, reward_cents: 40 })))
      )
      expect(await copies()).toHaveLength(2)

      const editRenamed = page.getByRole('button', { name: `Edit ${renamed}` }).first()
      await expect(editRenamed).toBeVisible({ timeout: 15_000 })
      await editRenamed.click()
      await dialog.getByRole('button', { name: /^stop sharing$/i }).click()
      const confirm = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: /stop sharing/i }) })
      await expect(confirm.getByText(/it stops for all of them/i)).toBeVisible()
      await confirm.getByRole('button', { name: /stop sharing & delete/i }).click()
      await expect(page.getByText(`Stopped sharing ${renamed}. It's deleted for every kid.`)).toBeVisible({ timeout: 10_000 })

      await expect.poll(async () => (await copies()).length).toBe(0)
      await expect(page.getByRole('button', { name: `Edit ${renamed}` })).toHaveCount(0)
    })
  }
})

// ---------------------------------------------------------------------------
// 4. The free savings-goal cap
// ---------------------------------------------------------------------------

test.describe('Savings goal cap', () => {
  let kid: { id: string; name: string }
  let goalTitle: string

  test.beforeAll(async () => {
    await setPlan('free')
    await cleanupGoals()
    // A kid already at the free cap (one active goal). The demo family has
    // one; if it was archived since, add a tagged one (removed afterwards).
    const { data } = await admin
      .from('goals')
      .select('child_id, title')
      .in('child_id', kids.map((k) => k.id))
      .eq('status', 'active')
      .order('created_at')
    const counts = new Map<string, { n: number; title: string }>()
    for (const g of data ?? []) counts.set(g.child_id, { n: (counts.get(g.child_id)?.n ?? 0) + 1, title: counts.get(g.child_id)?.title ?? g.title })
    const atCap = kids.find((k) => counts.get(k.id)?.n === 1)
    if (atCap) {
      kid = atCap
      goalTitle = counts.get(atCap.id)!.title
    } else {
      kid = kids.find((k) => !counts.has(k.id)) ?? kids[0]
      goalTitle = `${TAG} first goal`
      const { error } = await admin.from('goals').insert({ child_id: kid.id, title: goalTitle, emoji: '🎯', target_cents: 5000, created_by: 'parent' })
      expect(error).toBeNull()
    }
  })
  test.afterAll(async () => {
    await cleanupGoals()
  })

  const addGoal = () =>
    parent.from('goals').insert({ child_id: kid.id, title: `${TAG} second goal`, emoji: '🚲', target_cents: 9900, created_by: 'parent' }).select('id')

  test('free: See Premium at the cap logs limit_goals; the database refuses a second active goal', async ({ page }) => {
    await signIn(page)
    const settings = await openSettings(page, 'rewards')
    const row = settings.getByText(goalTitle, { exact: true }).locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]')
    await expect(row.getByText(/one active goal per child on the free plan/i)).toBeVisible({ timeout: 15_000 })
    await expect(row.getByRole('button', { name: /another goal/i })).toHaveCount(0)
    await row.getByRole('button', { name: /^see premium$/i }).click()
    await expect(page.getByText(/upgrade to premium/i).first()).toBeVisible({ timeout: 10_000 })
    await expect.poll(paywallSources).toContain('limit_goals')

    const { data, error } = await addGoal()
    expect(data).toBeNull()
    expect(error?.hint).toBe('free_limit_goals')
    const { count } = await admin.from('goals').select('*', { count: 'exact', head: true }).eq('child_id', kid.id).like('title', `${TAG} second%`)
    expect(count).toBe(0)
  })

  test('Premium: a second active goal is allowed', async () => {
    await setPlan('premium')
    const { data, error } = await addGoal()
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    await cleanupGoals()
    await setPlan('free')
  })
})

// ---------------------------------------------------------------------------
// 5. Joining a family by code goes through the server
// ---------------------------------------------------------------------------

test.describe('Family join by code', () => {
  test.beforeAll(async () => cleanupJoining())
  test.afterAll(async () => cleanupJoining())

  test('apps cannot add themselves to a family; the RPC checks the code', async () => {
    // A direct insert into family_members is refused (no insert policy).
    // Uses the family's own id so even a broken policy couldn't join anyone else's.
    const direct = await parent.from('family_members').insert({ user_id: familyId, family_id: familyId }).select('id')
    expect(direct.error).not.toBeNull()
    expect(direct.data).toBeNull()

    // A code that doesn't exist: null, and the attempt is logged for the rate limit.
    const bogus = await (parent as any).rpc('join_family_with_code', { p_code: 'zzzzzzzz' })
    expect(bogus.error).toBeNull()
    expect(bogus.data).toBeNull()
    await expect
      .poll(async () => (await (admin as any).from('family_join_attempts').select('*', { count: 'exact', head: true }).eq('user_id', familyId)).count)
      .toBe(1)
    await (admin as any).from('family_join_attempts').delete().eq('user_id', familyId)

    // The family's own code: own_family.
    let { data: own } = await (admin as any).from('family_codes').select('code').eq('user_id', familyId).maybeSingle()
    if (!own) {
      const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
      const code = Array.from(crypto.randomBytes(8), (b) => alphabet[b % alphabet.length]).join('')
      const { data, error } = await (admin as any).from('family_codes').insert({ user_id: familyId, code }).select('id, code').single()
      expect(error).toBeNull()
      createdFamilyCodeId = data.id
      own = data
    }
    const mine = await (parent as any).rpc('join_family_with_code', { p_code: own.code.toUpperCase() })
    expect(mine.data).toBeNull()
    expect(`${mine.error?.message} ${mine.error?.hint}`).toContain('own_family')

    // Other families' codes are invisible (some exist; we only count them).
    const { count: others } = await (admin as any).from('family_codes').select('*', { count: 'exact', head: true }).neq('user_id', familyId)
    expect(others).toBeGreaterThan(0)
    const peek = await (parent as any).from('family_codes').select('user_id, code').neq('user_id', familyId)
    expect(peek.error).toBeNull()
    expect(peek.data).toEqual([])

    const { count: members } = await (admin as any).from('family_members').select('*', { count: 'exact', head: true }).eq('user_id', familyId)
    expect(members).toBe(0)
  })

  test('the join field says "Code not found" for a bogus code', async ({ page }) => {
    // The sharing dialog (and its join field) is Premium.
    await setPlan('premium')
    await signIn(page)
    const settings = await openSettings(page, 'family')
    await settings.getByRole('button', { name: /^manage sharing$/i }).click({ timeout: 15_000 })
    const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: /join a family with a code/i }) })
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    await dialog.getByPlaceholder('abcdefgh').fill('zzzzzzzz')
    await dialog.getByRole('button', { name: /^join$/i }).click()
    await expect(page.getByText('Code not found')).toBeVisible({ timeout: 10_000 })
    await (admin as any).from('family_join_attempts').delete().eq('user_id', familyId)
    await setPlan('free')
  })
})

// ---------------------------------------------------------------------------
// 6. A lapsed owner can still remove a co-parent
// ---------------------------------------------------------------------------

test.describe('Lapsed owner and co-parents', () => {
  let tempId: string
  let tempEmail: string

  test.beforeAll(async () => {
    await cleanupTempUsers()
    tempEmail = `${COPARENT_PREFIX}${Date.now()}@gmail.com`
    const { data, error } = await admin.auth.admin.createUser({
      email: tempEmail,
      password: crypto.randomBytes(24).toString('base64url'),
      email_confirm: true,
    })
    expect(error).toBeNull()
    tempId = data.user!.id
    tempUserIds.push(tempId)
    // The profile, as lib/auth/signup-profile.ts writes one.
    const { data: existing } = await admin.from('profiles').select('id').eq('id', tempId).maybeSingle()
    if (!existing) {
      const { error: profileError } = await (admin as any).from('profiles').insert({
        id: tempId,
        email: tempEmail,
        family_name: `${TAG} co-parent`,
        kid_login_code: crypto.randomBytes(4).toString('hex'),
      })
      expect(profileError).toBeNull()
    }
    const { error: memberError } = await (admin as any).from('family_members').insert({ user_id: tempId, family_id: familyId })
    expect(memberError).toBeNull()
    await setPlan('free')
  })
  test.afterAll(async () => cleanupTempUsers())

  test('free owner sees who is sharing and Remove works', async ({ page }) => {
    await signIn(page)
    const settings = await openSettings(page, 'family')
    await expect(settings.getByText(/sharing your family now/i)).toBeVisible({ timeout: 15_000 })
    await expect(settings.getByText(tempEmail)).toBeVisible()
    await expect(settings.getByRole('button', { name: /^manage sharing$/i })).toHaveCount(0)
    await settings.getByRole('button', { name: `Remove ${tempEmail}` }).click()
    await expect(page.getByText('Member removed')).toBeVisible({ timeout: 10_000 })
    await expect(settings.getByText(tempEmail)).toHaveCount(0)
    await expect
      .poll(async () => (await (admin as any).from('family_members').select('*', { count: 'exact', head: true }).eq('user_id', tempId)).count)
      .toBe(0)
  })

  test('a free owner is not blocked from removing a co-parent', async ({ page }) => {
    // The request the Remove button sends, with the owner's web session.
    const { count: before } = await (admin as any).from('family_members').select('*', { count: 'exact', head: true }).eq('user_id', tempId)
    expect(before).toBe(1)
    await signIn(page)
    const res = await page.request.delete('/api/family/members', { data: { userId: tempId } })
    expect(res.status()).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    await expect
      .poll(async () => (await (admin as any).from('family_members').select('*', { count: 'exact', head: true }).eq('user_id', tempId)).count)
      .toBe(0)
  })
})

// ---------------------------------------------------------------------------
// The family ends exactly where it started
// ---------------------------------------------------------------------------

test('cleanup leaves the family on free with the same pets and wallets', async ({ request }) => {
  await cleanupAll()
  const { data: plan } = await admin.from('profiles').select('subscription_type').eq('id', familyId).single()
  expect(plan!.subscription_type).toBe('free')
  const ids = kids.map((k) => k.id)
  const { data: pets } = await (admin as any).from('child_pets').select('*').in('child_id', ids)
  expect((pets ?? []).length).toBe(petBaseline!.pets.length)
  const { count: members } = await (admin as any).from('family_members').select('*', { count: 'exact', head: true }).eq('family_id', familyId)
  expect(members).toBe(0)
  for (let i = 0; i < walletsBefore.length; i++) {
    const now = await wallet(request, await kidSession(kids[i].id))
    for (const key of WALLET_KEYS) {
      expect(now[key], `${kids[i].name}: ${key}`).toEqual(walletsBefore[i][key])
    }
  }
})
