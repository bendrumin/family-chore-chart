import { test, expect, type Page } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config as dotenvConfig } from 'dotenv'
import { applyFreeLimits, liftFreeLimits, FREE_CHORE_LIMIT, FREE_KID_LIMIT } from '../lib/billing/plan-limits'

/**
 * End-to-end checks for the free limits after a subscription ends
 * (lib/billing/plan-limits.ts, migration 038) and the monthly free week.
 *
 * Runs as The Star Family, the throwaway demo account (never a real family).
 * The store webhooks can't be faked here (Apple and Google sign them), so the
 * test calls the same applyFreeLimits / liftFreeLimits they call, then checks
 * everything a family sees: the database, /api/plan-limits, the trigger that
 * keeps paused chores off, the dashboard banner and chooser, and the billing
 * cards. Every kid and chore it makes is named `e2e-pause`, and is deleted at
 * the end; the plan is put back.
 *
 *   npm run test:e2e:features
 */

dotenvConfig({ path: '.env.local' })

const DEMO_EMAIL = 'bsiegel13+uitest-preview@gmail.com'
const DEMO_PASSWORD = 'RedditDemo2026!'
const TAG = 'e2e-pause'

let admin: SupabaseClient
let familyId: string
let originalPlan: string
let parentToken: string
let tempKids: string[] = []
let tempChores: string[] = []
let realKids: { id: string; name: string }[] = []

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

const api = (path: string, init: RequestInit = {}) =>
  fetch(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${parentToken}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })

async function cleanup() {
  const { data: kids } = await admin.from('children').select('id').eq('user_id', familyId).like('name', `${TAG}%`)
  const kidIds = (kids ?? []).map((k) => k.id)
  // Chores we added to the real kids, then our kids (their chores cascade).
  await (admin as any).from('chores').delete().like('name', `${TAG}%`).in('child_id', realKids.map((k) => k.id))
  if (kidIds.length) await admin.from('children').delete().in('id', kidIds)
  // Anything left paused on the real kids comes back.
  await liftFreeLimits(admin, familyId)
}

test.beforeAll(async () => {
  const key = (process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim().replace(/\\n$/, '')
  admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), key, { auth: { persistSession: false } })
  const { data: p } = await admin.from('profiles').select('id, subscription_type').eq('email', DEMO_EMAIL).single()
  familyId = p!.id
  originalPlan = p!.subscription_type
  const { data: k } = await admin.from('children').select('id, name').eq('user_id', familyId).order('created_at')
  realKids = (k ?? []).filter((c) => !c.name.startsWith(TAG))
  expect(realKids.length).toBeLessThan(FREE_KID_LIMIT)
  await cleanup()

  const session = await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim().replace(/\\n/g, ''), {
    auth: { persistSession: false },
  }).auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
  parentToken = session.data.session!.access_token

  // Over both limits: kids up to limit + 1 extra beyond it (the newest),
  // and chores past 20 (the newest ones, on the first real kid).
  await setPlan('premium')
  const needKids = FREE_KID_LIMIT + 1 - realKids.length
  for (let i = 0; i < needKids; i++) {
    const { data, error } = await admin.from('children').insert({ user_id: familyId, name: `${TAG} kid ${i}` }).select('id').single()
    expect(error).toBeNull()
    tempKids.push(data!.id)
  }
  const { count } = await admin.from('chores').select('id', { count: 'exact', head: true })
    .in('child_id', realKids.map((c) => c.id)).eq('is_active', true)
  const needChores = FREE_CHORE_LIMIT + 2 - (count ?? 0)
  for (let i = 0; i < needChores; i++) {
    const { data, error } = await admin.from('chores').insert({
      child_id: realKids[0].id, name: `${TAG} chore ${i}`, icon: '🧪', reward_cents: 0,
      days_of_week: [0, 1, 2, 3, 4, 5, 6], is_active: true, category: 'household_chores',
    }).select('id').single()
    expect(error).toBeNull()
    tempChores.push(data!.id)
  }
})

test.afterAll(async () => {
  await cleanup()
  await admin.from('profiles').update({ subscription_type: originalPlan }).eq('id', familyId)
})

test.describe.configure({ mode: 'serial' })

test('a lapse pauses the newest kid and the chores past 20, and keeps what came first', async () => {
  await setPlan('free')
  const paused = await applyFreeLimits(admin, familyId)
  expect(paused.kids).toBe(1)
  expect(paused.chores).toBeGreaterThanOrEqual(2)

  const { data: kids } = await (admin as any).from('children').select('id, name, paused_by_plan').eq('user_id', familyId)
  for (const real of realKids) expect(kids.find((k: any) => k.id === real.id).paused_by_plan).toBe(false)
  expect(kids.find((k: any) => k.id === tempKids[tempKids.length - 1]).paused_by_plan).toBe(true)

  const { count: active } = await admin.from('chores').select('id', { count: 'exact', head: true })
    .in('child_id', kids.map((k: any) => k.id)).eq('is_active', true)
  expect(active).toBe(FREE_CHORE_LIMIT)
  // The family's own chores are older than ours, so none of them paused.
  const { data: realPaused } = await (admin as any).from('chores').select('id')
    .in('child_id', realKids.map((k) => k.id)).eq('paused_by_plan', true).not('name', 'like', `${TAG}%`)
  expect(realPaused).toHaveLength(0)
})

test('no client can switch a plan-paused chore back on', async () => {
  const { data: one } = await (admin as any).from('chores').select('id').eq('paused_by_plan', true).in('id', tempChores).limit(1).single()
  await admin.from('chores').update({ is_active: true }).eq('id', one.id)
  const { data: after } = await admin.from('chores').select('is_active').eq('id', one.id).single()
  expect(after!.is_active).toBe(false)
})

test('a lapse is idempotent: running it again pauses nothing new', async () => {
  const again = await applyFreeLimits(admin, familyId)
  const { count } = await (admin as any).from('children').select('id', { count: 'exact', head: true }).eq('user_id', familyId).eq('paused_by_plan', true)
  expect(count).toBe(again.kids)
  expect(again.kids).toBe(1)
})

test('the API reports what is paused, and a parent can choose who stays on', async () => {
  const res = await api('/api/plan-limits')
  expect(res.status).toBe(200)
  const state = await res.json()
  expect(state.premium).toBe(false)
  expect(state.pausedKids).toHaveLength(1)
  expect(state.pausedChores).toBeGreaterThanOrEqual(2)
  expect(state.limits).toEqual({ kids: FREE_KID_LIMIT, chores: FREE_CHORE_LIMIT })

  // Swap: keep the paused kid instead of the newest kid that stayed on.
  const pausedId = state.pausedKids[0].id
  const keep = [...realKids.map((k) => k.id), pausedId].slice(0, FREE_KID_LIMIT)
  const chores = state.kids.filter((k: any) => keep.includes(k.id)).flatMap((k: any) => k.chores.filter((c: any) => c.on).map((c: any) => c.id)).slice(0, FREE_CHORE_LIMIT)
  const saved = await api('/api/plan-limits', { method: 'POST', body: JSON.stringify({ kids: keep, chores }) })
  expect(saved.status).toBe(200)
  const after = await saved.json()
  expect(after.kids.find((k: any) => k.id === pausedId).paused).toBe(false)
  expect(after.pausedKids).toHaveLength(tempKids.length + realKids.length - keep.length)

  // A rebalance keeps the parent's choice.
  await applyFreeLimits(admin, familyId)
  const { data: chosen } = await (admin as any).from('children').select('paused_by_plan').eq('id', pausedId).single()
  expect(chosen.paused_by_plan).toBe(false)
})

test('the API refuses more kids than the free plan has', async () => {
  const all = [...realKids.map((k) => k.id), ...tempKids]
  const res = await api('/api/plan-limits', { method: 'POST', body: JSON.stringify({ kids: all, chores: [] }) })
  expect(res.status).toBe(400)
})

test('dashboard: the paused banner and the chooser', async ({ page }) => {
  await signIn(page)
  await expect(page.getByRole('heading', { name: /paused$/i })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText(/nothing is deleted/i)).toBeVisible()
  await page.getByRole('button', { name: /choose what stays on/i }).click()
  const dialog = page.getByRole('dialog', { name: /choose what stays on/i })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(new RegExp(`Kids \\(${FREE_KID_LIMIT}/${FREE_KID_LIMIT}\\)`))).toBeVisible()
  await dialog.getByRole('button', { name: /^cancel$/i }).click()
})

test('billing: monthly and yearly both offer the free week', async ({ page }) => {
  await signIn(page)
  await page.goto('/dashboard?settings=billing')
  await expect(page.getByRole('button', { name: /try free for 7 days/i })).toHaveCount(2, { timeout: 20_000 })
})

test('resubscribing brings everything back', async () => {
  await setPlan('premium')
  await liftFreeLimits(admin, familyId)
  const { count: pausedKids } = await (admin as any).from('children').select('id', { count: 'exact', head: true }).eq('user_id', familyId).eq('paused_by_plan', true)
  expect(pausedKids).toBe(0)
  const { data: ours } = await admin.from('chores').select('is_active').in('id', tempChores)
  expect((ours ?? []).every((c) => c.is_active)).toBe(true)
  const res = await api('/api/plan-limits')
  const state = await res.json()
  expect(state.premium).toBe(true)
  expect(state.pausedKids).toHaveLength(0)
})
