import { test, expect, type APIRequestContext, type Browser, type Page } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config as dotenvConfig } from 'dotenv'
import { todayIn, weekWindow } from '../lib/challenges/progress'

/**
 * End-to-end checks for the four Premium features of October 2026, free and
 * Premium, against the real backend:
 *
 *   1. Family challenges (migration 031)
 *   2. Calendar feed (migration 033)
 *   3. Routine upgrades: read-aloud, picture steps, finish-by timer, Build with
 *      AI, live view (migration 032)
 *   4. Money: jars, fines, donations, screen-time minutes (migration 030)
 *
 * Runs as The Star Family, the throwaway demo account (never a real family),
 * like e2e/features.spec.ts. The service role flips the plan, stands in for a
 * kid's PIN login (a kid_sessions row, as /api/child-pin/verify makes), ticks
 * chores, and removes every row a test makes. Everything a test creates is
 * tagged `e2e-premium` or recorded by id; the family ends on the free plan
 * with the same balances it started with.
 *
 *   npm run test:e2e:features
 */

dotenvConfig({ path: '.env.local' })

const DEMO_EMAIL = 'bsiegel13+uitest-preview@gmail.com'
const DEMO_PASSWORD = 'RedditDemo2026!'
const TAG = 'e2e-premium'
const STEP_PHOTO_BUCKET = 'routine-step-photos'

let admin: SupabaseClient
let familyId: string
let timeZone: string
let kids: { id: string; name: string }[]
let parentToken: string
const kidTokens: string[] = []

// ---------------------------------------------------------------------------
// Helpers
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

/** The chore_completions keys for "today" in the family's timezone. */
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

async function openKidRoutines(page: Page, kidName: string) {
  await page.goto('/dashboard')
  await page.getByRole('button', { name: new RegExp(`^show ${kidName}'s chores$`, 'i') }).click()
  await page.getByRole('tab', { name: /^routines$/i }).click()
}

async function openRoutineBuilder(page: Page, kidName: string) {
  await openKidRoutines(page, kidName)
  await page.getByRole('button', { name: /add routine|new routine/i }).first().click()
  const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: /create new routine/i }) })
  await expect(dialog).toBeVisible({ timeout: 10_000 })
  return dialog
}

// ---------------------------------------------------------------------------
// Cleanup: every row these tests make, for the demo family only
// ---------------------------------------------------------------------------

async function cleanupChallenges() {
  const { data } = await (admin as any).from('family_challenges').select('id').eq('user_id', familyId).like('title', `${TAG}%`)
  const ids = (data ?? []).map((c: { id: string }) => c.id)
  if (ids.length) {
    await (admin as any).from('family_challenge_rewards').delete().in('challenge_id', ids)
    await (admin as any).from('family_challenges').delete().in('id', ids)
  }
  // Ledger rows keep their note if a challenge was ever deleted first.
  await (admin as any)
    .from('family_challenge_rewards')
    .delete()
    .in('child_id', kids.map((k) => k.id))
    .like('note', `Challenge: ${TAG}%`)
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
  const kidIds = kids.map((k) => k.id)
  const { data } = await admin.from('routines').select('id, routine_steps(image_path)').in('child_id', kidIds).like('name', `${TAG}%`)
  const rows = (data ?? []) as Array<{ id: string; routine_steps: Array<{ image_path: string | null }> }>
  const paths = rows.flatMap((r) => r.routine_steps.map((s) => s.image_path).filter((p): p is string => !!p))
  if (paths.length) await admin.storage.from(STEP_PHOTO_BUCKET).remove(paths)
  // Uploads abandoned before a save: everything under the demo family's folders.
  for (const kidId of kidIds) {
    const { data: objects } = await admin.storage.from(STEP_PHOTO_BUCKET).list(`${familyId}/${kidId}`)
    const stale = (objects ?? []).map((o) => `${familyId}/${kidId}/${o.name}`)
    if (stale.length) await admin.storage.from(STEP_PHOTO_BUCKET).remove(stale)
  }
  await (admin as any).from('routine_progress').delete().in('child_id', kidIds)
  if (rows.length) await admin.from('routines').delete().in('id', rows.map((r) => r.id))
}

async function cleanupCalendar() {
  await (admin as any).from('calendar_feeds').delete().eq('family_id', familyId)
}

/** Money rows that existed when the run started; anything else is ours. */
const moneyBaseline: Record<string, Set<string>> = {}
const MONEY_TABLES: Array<[table: string, key: string]> = [
  ['money_ledger', 'id'],
  ['money_jar_splits', 'id'],
  ['child_money_settings', 'child_id'],
  ['screen_minutes_ledger', 'id'],
  ['money_recurring_deductions', 'id'],
  ['allowance_payouts', 'id'],
]

async function snapshotMoney() {
  for (const [table, key] of MONEY_TABLES) {
    const { data } = await (admin as any).from(table).select(key).in('child_id', kids.map((k) => k.id))
    moneyBaseline[table] = new Set((data ?? []).map((r: Record<string, string>) => r[key]))
  }
}

async function cleanupMoney() {
  for (const [table, key] of MONEY_TABLES) {
    const baseline = moneyBaseline[table]
    if (!baseline) continue
    const { data } = await (admin as any).from(table).select(key).in('child_id', kids.map((k) => k.id))
    const created = (data ?? []).map((r: Record<string, string>) => r[key]).filter((id: string) => !baseline.has(id))
    if (created.length) await (admin as any).from(table).delete().in(key, created)
  }
}

async function cleanupAll() {
  await cleanupChallenges()
  await cleanupCalendar()
  await cleanupRoutines()
  await cleanupMoney()
  await cleanupChores()
  if (kidTokens.length) await admin.from('kid_sessions').delete().in('token', kidTokens)
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
  const { data: settings } = await admin.from('family_settings').select('timezone').eq('user_id', familyId).maybeSingle()
  timeZone = settings?.timezone || 'UTC'
  await snapshotMoney()
  await cleanupAll()

  const session = await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(), {
    auth: { persistSession: false },
  }).auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
  parentToken = session.data.session!.access_token
})

test.afterAll(async () => {
  await cleanupAll()
})

test.describe.configure({ mode: 'serial' })

// ---------------------------------------------------------------------------
// Free family: what's locked, and that each lock opens Billing with its reason
// ---------------------------------------------------------------------------

test.describe('free family', () => {
  test.beforeAll(async () => setPlan('free'))

  test('family challenges: locked preview; See Premium logs gate_challenges', async ({ page }) => {
    await signIn(page)
    const card = page.getByRole('region', { name: /family challenges/i })
    await expect(card).toBeVisible({ timeout: 15_000 })
    await expect(card.getByLabel('Premium')).toBeVisible()
    await expect(card.getByRole('button', { name: /new challenge/i })).toHaveCount(0)
    await card.getByRole('button', { name: /^see premium$/i }).click()
    await expect(page.getByText(/upgrade to premium/i).first()).toBeVisible({ timeout: 10_000 })
    await expect.poll(paywallSources).toContain('gate_challenges')
  })

  test('calendar feed: gated in Settings > Family; the gate logs gate_calendar', async ({ page }) => {
    await signIn(page)
    const settings = await openSettings(page, 'family')
    const section = settings
      .getByRole('heading', { name: /^calendar feed$/i })
      .locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]')
    await expect(section.getByText(/the family calendar feed comes with premium/i)).toBeVisible({ timeout: 15_000 })
    await expect(section.getByRole('button', { name: /turn on a feed/i })).toHaveCount(0)
    await section.getByRole('button', { name: /open billing/i }).click()
    await expect(page.getByText(/upgrade to premium/i).first()).toBeVisible({ timeout: 10_000 })
    await expect.poll(paywallSources).toContain('gate_calendar')
  })

  test('routine player: the read-aloud speaker is free', async ({ browser }) => {
    const kid = kids[0]
    const { data: routine } = await admin
      .from('routines')
      .insert({ child_id: kid.id, name: `${TAG} Read aloud`, type: 'custom', icon: 'check', color: '#6366f1', reward_cents: 0 })
      .select('id')
      .single()
    await admin.from('routine_steps').insert({ routine_id: routine!.id, title: 'Brush teeth', icon: 'check', order_index: 0 })

    const page = await kidPage(browser, kid, await kidSession(kid.id))
    await page.goto(`/kid/${kid.id}/routine/${routine!.id}`)
    await expect(page.getByRole('heading', { name: 'Brush teeth' })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('button', { name: /read it to me/i })).toBeVisible()
    // Finish-by is Premium: no time bar for a free family.
    await expect(page.getByRole('timer')).toHaveCount(0)
    await page.context().close()
  })

  test('routine builder: picture steps, finish-by timer and Build with AI are crowned, each with its own source', async ({ page }) => {
    await signIn(page)

    let builder = await openRoutineBuilder(page, kids[0].name)
    await builder.getByRole('button', { name: /build with ai \(premium\)/i }).click()
    await expect.poll(paywallSources).toContain('gate_ai_routine')

    builder = await openRoutineBuilder(page, kids[0].name)
    await builder.getByRole('button', { name: /add a finish-by timer \(premium\)/i }).click()
    await expect.poll(paywallSources).toContain('gate_routine_timer')

    builder = await openRoutineBuilder(page, kids[0].name)
    await builder.getByRole('button', { name: /add first step/i }).click()
    await builder.getByRole('button', { name: /picture steps are a premium feature/i }).click()
    await expect.poll(paywallSources).toContain('gate_routine_photos')
  })
})

// ---------------------------------------------------------------------------
// Premium: family challenges
// ---------------------------------------------------------------------------

test.describe('Premium: family challenges', () => {
  const REWARD_CENTS = 50
  let challengeId: string
  let choreIds: string[] = []
  let tokens: string[] = []
  let balancesBefore: number[] = []

  test.beforeAll(async () => {
    await setPlan('premium')
    await cleanupChallenges()
    // Bonus chores of our own, so only our ticks count toward the target.
    choreIds = [
      await makeChore(kids[0].id, `bonus ${kids[0].name}`, { rotation_mode: 'grab' }),
      await makeChore(kids[1].id, `bonus ${kids[1].name}`, { rotation_mode: 'grab' }),
    ]
    tokens = [await kidSession(kids[0].id), await kidSession(kids[1].id)]
  })

  test.afterAll(async () => {
    await cleanupChallenges()
    await cleanupChores()
  })

  test('a parent starts a challenge from a template for both kids', async ({ page }) => {
    await signIn(page)
    const card = page.getByRole('region', { name: /family challenges/i })
    await card.getByRole('button', { name: /new challenge/i }).click({ timeout: 15_000 })
    const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: /new family challenge/i }) })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: /team clean-up/i }).click()
    await expect(dialog.getByLabel('Challenge name')).toHaveValue('Team Clean-Up')
    await expect(dialog.getByLabel(/which chores/i)).toHaveValue('bonus')
    await dialog.getByLabel('Challenge name').fill(`${TAG} Clean-Up`)
    await dialog.getByLabel('Target').fill('2')
    await dialog.getByLabel(/plus money for each kid/i).fill('0.50')
    for (const kid of kids.slice(0, 2)) {
      await expect(dialog.getByRole('button', { name: kid.name, exact: true })).toHaveAttribute('aria-pressed', 'true')
    }
    await expect(dialog.getByText(/goal: 2 bonus chores together/i)).toBeVisible()
    await dialog.getByRole('button', { name: /start challenge/i }).click()
    await expect(dialog).toBeHidden({ timeout: 10_000 })

    const { data } = await (admin as any)
      .from('family_challenges')
      .select('id, target, reward_cents, metric, mode, chore_filter, child_ids, status')
      .eq('user_id', familyId)
      .eq('title', `${TAG} Clean-Up`)
      .single()
    expect(data).toMatchObject({ target: 2, reward_cents: REWARD_CENTS, metric: 'chores', mode: 'team', chore_filter: 'bonus', status: 'active' })
    expect(data.child_ids).toEqual(expect.arrayContaining(kids.slice(0, 2).map((k) => k.id)))
    challengeId = data.id

    const row = card.getByRole('listitem').filter({ has: page.getByRole('heading', { name: `${TAG} Clean-Up` }) })
    await expect(row.getByText('0 of 2')).toBeVisible()
  })

  test('ticks move the team bar; the kid API shows team progress and teammates', async ({ page, request }) => {
    await signIn(page)
    const row = page
      .getByRole('region', { name: /family challenges/i })
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: `${TAG} Clean-Up` }) })
    await expect(row.getByText('0 of 2')).toBeVisible({ timeout: 15_000 })

    await tickToday(choreIds[0])
    await expect(async () => {
      await page.reload()
      await expect(row.getByText('1 of 2')).toBeVisible({ timeout: 5000 })
    }).toPass({ timeout: 30_000 })
    await expect(row.getByText(`${kids[0].name}: Helped 1x`)).toBeVisible()
    await expect(row.getByText(`${kids[1].name}: Ready to help`)).toBeVisible()

    await tickToday(choreIds[1])
    await expect(async () => {
      await page.reload()
      await expect(row.getByText('2 of 2')).toBeVisible({ timeout: 5000 })
    }).toPass({ timeout: 30_000 })
    await expect(row.getByText(/target reached!/i)).toBeVisible()

    const res = await request.get('/api/kid/challenges', { headers: { Authorization: `Bearer ${tokens[1]}` } })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.childId).toBe(kids[1].id)
    const mine = body.challenges.find((c: { id: string }) => c.id === challengeId)
    expect(mine).toMatchObject({ current: 2, goal: 2, met: true, phase: 'won', rewardCents: REWARD_CENTS, description: '2 bonus chores together' })
    const me = mine.teammates.find((t: { isMe: boolean }) => t.isMe)
    expect(me).toMatchObject({ childId: kids[1].id, count: 1 })
    expect(mine.teammates.map((t: { name: string }) => t.name)).toEqual(expect.arrayContaining([kids[0].name, kids[1].name]))
  })

  test('delivering credits each kid exactly the reward, once', async ({ page, request }) => {
    balancesBefore = []
    for (const token of tokens) balancesBefore.push((await wallet(request, token)).balanceCents)

    await signIn(page)
    const row = page
      .getByRole('region', { name: /family challenges/i })
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: `${TAG} Clean-Up` }) })
    await row.getByRole('button', { name: /reward delivered/i }).click({ timeout: 15_000 })
    await expect(row.getByText(/delivered\. nice teamwork!/i)).toBeVisible({ timeout: 10_000 })

    for (let i = 0; i < tokens.length; i++) {
      expect((await wallet(request, tokens[i])).balanceCents).toBe(balancesBefore[i] + REWARD_CENTS)
    }

    // A second delivery (double tap, another device) is refused and credits nothing.
    const again = await request.post(`/api/challenges/${challengeId}/deliver`, { headers: parentHeaders() })
    expect(again.status()).toBe(409)
    expect((await again.json()).error).toBe('already_delivered')
    for (let i = 0; i < tokens.length; i++) {
      expect((await wallet(request, tokens[i])).balanceCents).toBe(balancesBefore[i] + REWARD_CENTS)
    }
    const { data: credits } = await (admin as any).from('family_challenge_rewards').select('child_id, amount_cents').eq('challenge_id', challengeId)
    expect(credits).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Premium: calendar feed
// ---------------------------------------------------------------------------

test.describe('Premium: calendar feed', () => {
  test.beforeAll(async () => {
    await setPlan('premium')
    await cleanupCalendar()
  })
  test.afterAll(async () => {
    await cleanupCalendar()
    await setPlan('premium')
  })

  const httpsOf = (webcal: string) => webcal.replace(/^webcal:\/\//i, 'https://')
  const unfold = (ics: string) => ics.replace(/\r\n[ \t]/g, '')

  test('turn on, subscribe, replace the link, turn off; a lapsed family gets the needs-Premium calendar', async ({ page, request }) => {
    await signIn(page)
    const settings = await openSettings(page, 'family')
    const section = settings
      .getByRole('heading', { name: /^calendar feed$/i })
      .locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]')
    await section.getByRole('button', { name: /turn on a feed for the whole family/i }).click({ timeout: 15_000 })
    const link = section.getByLabel('Subscribe link')
    await expect(link).toHaveValue(/^webcal:\/\/.+\/api\/calendar\/[A-Za-z0-9_-]{43}\.ics$/, { timeout: 10_000 })
    const firstUrl = httpsOf(await link.inputValue())

    const res = await request.get(firstUrl)
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toMatch(/^text\/calendar/)
    const raw = await res.text()
    expect(raw.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(raw.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
    // RFC 5545: every line ends in CRLF, never a bare LF.
    expect(raw).toContain('\r\n')
    expect(/[^\r]\n/.test(raw)).toBe(false)
    const ics = unfold(raw)
    const names = kids.map((k) => k.name).join('|')
    expect(ics).toMatch(new RegExp(`BEGIN:VEVENT[\\s\\S]*?SUMMARY:[^\\r\\n]*(${names})[\\s\\S]*?END:VEVENT`))
    expect(ics).toMatch(/^RRULE:FREQ=/m)

    // New link: the old URL stops working at once; the new one works.
    await section.getByRole('button', { name: /^new link$/i }).click()
    await section.getByRole('button', { name: /yes, replace the link/i }).click()
    await expect(link).not.toHaveValue(await link.inputValue(), { timeout: 10_000 })
    const secondUrl = httpsOf(await link.inputValue())
    expect(secondUrl).not.toBe(firstUrl)
    expect((await request.get(firstUrl)).status()).toBe(404)
    expect((await request.get(secondUrl)).status()).toBe(200)

    // Turn off removes it.
    await section.getByRole('button', { name: /^turn off$/i }).click()
    await expect(section.getByRole('button', { name: /turn on a feed for the whole family/i })).toBeVisible({ timeout: 10_000 })
    expect((await request.get(secondUrl)).status()).toBe(404)
    const { count } = await (admin as any).from('calendar_feeds').select('*', { count: 'exact', head: true }).eq('family_id', familyId)
    expect(count).toBe(0)

    // On again, then the family lapses: the subscription explains itself.
    await section.getByRole('button', { name: /turn on a feed for the whole family/i }).click()
    await expect(link).toHaveValue(/\.ics$/, { timeout: 10_000 })
    const thirdUrl = httpsOf(await link.inputValue())
    await setPlan('free')
    const lapsed = await request.get(thirdUrl)
    expect(lapsed.status()).toBe(200)
    expect(lapsed.headers()['content-type']).toMatch(/^text\/calendar/)
    const lapsedIcs = unfold(await lapsed.text())
    expect(lapsedIcs).toContain('needs Premium')
    expect(lapsedIcs).not.toMatch(/^RRULE:/m)
  })
})

// ---------------------------------------------------------------------------
// Premium: routine upgrades
// ---------------------------------------------------------------------------

test.describe('Premium: routine upgrades', () => {
  const NAME = `${TAG} Picture timer`
  const STEP = 'Find your shoes'
  let routineId: string
  let photoPath: string

  test.beforeAll(async () => {
    await setPlan('premium')
    await cleanupRoutines()
  })
  test.afterAll(async () => cleanupRoutines())

  test('a picture step and a finish-by timer save from the builder', async ({ page }) => {
    await signIn(page)
    const builder = await openRoutineBuilder(page, kids[0].name)
    await builder.getByLabel('Routine Name').fill(NAME)
    await builder.getByRole('button', { name: /add first step/i }).click()
    await builder.getByLabel('Step 1 name').fill(STEP)
    await builder.getByLabel(/finish-by timer/i).fill('5')

    // A tiny JPEG drawn in the browser, picked through the step's camera.
    const jpegBase64 = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 48
      canvas.height = 48
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#f59e0b'
      ctx.fillRect(0, 0, 48, 48)
      ctx.fillStyle = '#6366f1'
      ctx.fillRect(12, 12, 24, 24)
      return canvas.toDataURL('image/jpeg', 0.9).split(',')[1]
    })
    const chooser = page.waitForEvent('filechooser')
    await builder.getByRole('button', { name: /add a picture to step 1/i }).click()
    await (await chooser).setFiles({ name: 'shoes.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(jpegBase64, 'base64') })
    await expect(builder.getByRole('img', { name: /picture for step 1/i })).toBeVisible({ timeout: 20_000 })

    await builder.getByRole('button', { name: /^create routine$/i }).click()
    await expect(page.getByText(/routine created successfully/i)).toBeVisible({ timeout: 15_000 })

    const { data } = await admin
      .from('routines')
      .select('id, child_id, target_duration_seconds, routine_steps(title, image_path)')
      .eq('name', NAME)
      .single()
    expect(data!.child_id).toBe(kids[0].id)
    expect(data!.target_duration_seconds).toBe(300)
    const step = (data!.routine_steps as Array<{ title: string; image_path: string | null }>)[0]
    expect(step.title).toBe(STEP)
    expect(step.image_path).toMatch(new RegExp(`^${familyId}/${kids[0].id}/[0-9a-f-]{36}\\.jpg$`))
    routineId = data!.id
    photoPath = step.image_path!
    const { data: objects } = await admin.storage.from(STEP_PHOTO_BUCKET).list(`${familyId}/${kids[0].id}`)
    expect((objects ?? []).map((o) => o.name)).toContain(photoPath.split('/').pop())
  })

  test('the kid player shows the picture and the finish-by bar', async ({ browser }) => {
    const page = await kidPage(browser, kids[0], await kidSession(kids[0].id))
    await page.goto(`/kid/${kids[0].id}/routine/${routineId}`)
    const picture = page.getByRole('img', { name: STEP })
    await expect(picture).toBeVisible({ timeout: 20_000 })
    await expect.poll(() => picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
    const bar = page.getByRole('timer')
    await expect(bar.getByText(/finish-by timer/i)).toBeVisible()
    await expect(bar.getByText(/\d+:\d\d left/)).toBeVisible()
    await expect(page.getByRole('button', { name: /read it to me/i })).toBeVisible()
    await page.context().close()
  })

  test('Build with AI fills the builder (AI or the template fallback)', async ({ page }) => {
    await signIn(page)
    const builder = await openRoutineBuilder(page, kids[0].name)
    await builder.getByLabel(/what should this routine do/i).fill('school mornings, 8 year old, forgets to brush teeth')
    const response = page.waitForResponse((r) => r.url().includes('/api/ai/build-routine'), { timeout: 60_000 })
    await builder.getByRole('button', { name: /^build$/i }).click()
    const res = await response
    expect(res.status()).toBe(200)
    const { source, draft } = await res.json()
    expect(['ai', 'templates']).toContain(source)
    expect(draft.steps.length).toBeGreaterThan(0)
    await expect(page.getByText(source === 'ai' ? /draft ready\. edit anything, then save/i : /started from a template/i)).toBeVisible()
    await expect(builder.getByLabel('Routine Name')).toHaveValue(draft.name)
    await expect(builder.getByRole('heading', { name: `Routine Steps (${draft.steps.length})` })).toBeVisible()
    await expect(builder.getByLabel('Step 1 name')).toHaveValue(draft.steps[0].title)
    // Nothing is saved until the parent says so.
    await builder.getByRole('button', { name: /^cancel$/i }).click()
    const { count } = await admin.from('routines').select('*', { count: 'exact', head: true }).eq('child_id', kids[0].id).eq('name', draft.name).gte('created_at', new Date(Date.now() - 120_000).toISOString())
    expect(count).toBe(0)
  })

  test('live view: the parent dashboard shows which step a kid is on, then clears', async ({ page, request }) => {
    const token = await kidSession(kids[0].id)
    const post = (data: Record<string, unknown>) =>
      request.post(`/api/routines/${routineId}/progress`, { headers: { Authorization: `Bearer ${token}` }, data: { childId: kids[0].id, ...data } })
    expect((await post({ stepIndex: 1, stepsTotal: 3, stepTitle: 'Brush teeth' })).status()).toBe(200)

    await signIn(page)
    const live = page.getByRole('region', { name: /routines happening now/i })
    await expect(live.getByText(`${kids[0].name} is on step 2 of 3 — Brush teeth`)).toBeVisible({ timeout: 20_000 })
    await expect(live.getByText(NAME)).toBeVisible()
    await expect(live.getByRole('progressbar', { name: `${kids[0].name}: step 2 of 3` })).toBeVisible()

    expect((await post({ clear: true })).status()).toBe(200)
    await page.reload()
    await expect(page.getByRole('heading', { name: /family challenges/i })).toBeVisible({ timeout: 15_000 })
    await expect(live).toHaveCount(0)
  })

  test('deleting the routine removes its picture from storage', async ({ page }) => {
    await signIn(page)
    const res = await page.request.delete(`/api/routines/${routineId}`)
    expect(res.status()).toBe(200)
    const { data: gone } = await admin.from('routines').select('id').eq('id', routineId)
    expect(gone).toHaveLength(0)
    await expect
      .poll(async () => {
        const { data } = await admin.storage.from(STEP_PHOTO_BUCKET).list(`${familyId}/${kids[0].id}`)
        return (data ?? []).map((o) => o.name)
      })
      .not.toContain(photoPath.split('/').pop())
  })
})

// ---------------------------------------------------------------------------
// Premium: money
// ---------------------------------------------------------------------------

test.describe('Premium: money', () => {
  type Wallet = Record<string, any>
  const before: Wallet[] = []
  let tokens: string[] = []
  let minutesChoreId: string

  const money = (request: APIRequestContext, data: Record<string, unknown>) =>
    request.post('/api/money', { headers: parentHeaders(), data: { childId: kids[0].id, ...data } })

  test.beforeAll(async ({ request }) => {
    await setPlan('premium')
    tokens = [await kidSession(kids[0].id), await kidSession(kids[1].id)]
    for (const token of tokens) before.push(await wallet(request, token))
  })
  test.afterAll(async () => {
    await cleanupMoney()
    await cleanupChores()
  })

  test('a 70/20/10 split from Settings, then a fine with a reason', async ({ page, request }) => {
    // Income dated today, so the new split has something to divide: $2.00
    // of weekly allowance becomes $1.40 / $0.40 / $0.20.
    const { error } = await (admin as any).from('money_ledger').insert({
      child_id: kids[0].id,
      kind: 'allowance',
      jar: null,
      amount_cents: 200,
      effective_on: todayIn(timeZone),
      note: `${TAG} seed allowance`,
    })
    expect(error).toBeNull()

    await signIn(page)
    const settings = await openSettings(page, 'rewards')
    const section = settings.getByRole('region', { name: /^money$/i })
    await section.getByRole('tab', { name: kids[0].name, exact: true }).click({ timeout: 15_000 })
    await section.getByRole('button', { name: '70/20/10' }).click()
    await expect(section.getByText('Total 100%')).toBeVisible()
    await section.getByRole('button', { name: /^turn on jars$/i }).click()
    await expect(page.getByText(new RegExp(`jars are on for ${kids[0].name}`, 'i'))).toBeVisible({ timeout: 10_000 })

    const jarsOn = await wallet(request, tokens[0])
    expect(jarsOn.jars).toMatchObject({ enabled: true, split: { spend: 70, save: 20, give: 10 } })
    expect(jarsOn.jars.saveCents).toBeGreaterThanOrEqual(40)
    expect(jarsOn.jars.giveCents).toBeGreaterThanOrEqual(20)
    expect(jarsOn.spendableCents).toBe(jarsOn.jars.spendCents)

    await section.getByLabel('Fine amount').fill('1.00')
    await section.getByLabel('Reason').fill(`${TAG} left the bike out`)
    await section.getByRole('button', { name: /^take it off$/i }).click()
    await expect(page.getByText(/took \$1\.00 off/i)).toBeVisible({ timeout: 10_000 })

    const fined = await wallet(request, tokens[0])
    expect(fined.jars.spendCents).toBe(jarsOn.jars.spendCents - 100)
    expect(fined.jars.saveCents).toBe(jarsOn.jars.saveCents)
    expect(fined.balanceCents).toBe(jarsOn.balanceCents - 100)
    expect(fined.moneyNews[0]).toMatchObject({ kind: 'fine', jar: 'spend', amountCents: -100, note: `${TAG} left the bike out` })
  })

  test('a donation from Give, minutes earned on a chore and used, and a fine bigger than Spend is refused', async ({ request }) => {
    const start = await wallet(request, tokens[0])

    const donation = await money(request, { action: 'donation', amountCents: 10, note: `${TAG} animal shelter` })
    expect(donation.status()).toBe(200)

    minutesChoreId = await makeChore(kids[0].id, 'screen time chore')
    const reward = await money(request, { action: 'minutes-reward', target: 'chore', id: minutesChoreId, minutes: 15 })
    expect(reward.status()).toBe(200)
    await tickToday(minutesChoreId)
    const used = await money(request, { action: 'minutes-use', minutes: 5, note: `${TAG} tablet` })
    expect(used.status()).toBe(200)

    const after = await wallet(request, tokens[0])
    expect(after.jars.giveCents).toBe(start.jars.giveCents - 10)
    expect(after.jars.spendCents).toBe(start.jars.spendCents)
    expect(after.minutes).toEqual({
      balance: start.minutes.balance + 10,
      earned: start.minutes.earned + 15,
      used: start.minutes.used + 5,
    })
    expect(after.moneyNews[0]).toMatchObject({ kind: 'donation', jar: 'give', amountCents: -10, note: `${TAG} animal shelter` })
    expect(after.moneyNews.map((n: { kind: string }) => n.kind)).toEqual(expect.arrayContaining(['donation', 'fine', 'allowance']))

    const tooBig = await money(request, { action: 'fine', amountCents: Math.max(0, after.jars.spendCents) + 100, reason: `${TAG} too much` })
    expect(tooBig.status()).toBe(409)
    expect(await tooBig.json()).toMatchObject({ error: 'not_enough', availableCents: Math.max(0, after.jars.spendCents) })
    expect((await wallet(request, tokens[0])).balanceCents).toBe(after.balanceCents)
  })

  test('cleanup leaves both kids exactly where they started', async ({ request }) => {
    await cleanupMoney()
    await cleanupChores()
    for (let i = 0; i < tokens.length; i++) {
      const now = await wallet(request, tokens[i])
      for (const key of ['balanceCents', 'earnedCents', 'paidCents', 'owedCents', 'spendableCents', 'jars', 'minutes', 'moneyNews']) {
        expect(now[key], `${kids[i].name}: ${key}`).toEqual(before[i][key])
      }
    }
  })
})
