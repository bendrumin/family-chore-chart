import { test, expect, type Page } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config as dotenvConfig } from 'dotenv'
import { FEATURES } from '../lib/engagement/discovery'

/**
 * End-to-end checks for the October 2026 engagement work:
 *
 *   1. /api/pets/art: the PNG the native apps draw Star Pets from
 *   2. /api/engagement/discover: which untried feature a family is pointed at
 *   3. The dashboard discover card: shows one feature, "Not now" skips it,
 *      the button opens the right place
 *   4. /api/cron/lapse-nudge: cron-only, and its dry run sends nothing
 *
 * Runs as The Star Family, the throwaway demo account (never a real family),
 * like e2e/premium-features.spec.ts. Nothing here writes family data: the
 * service role only flips the plan, which is restored at the end, and the
 * card tests stub the discover API so they don't depend on what the demo
 * family has tried.
 *
 *   npm run test:e2e:features
 */

dotenvConfig({ path: '.env.local' })

const DEMO_EMAIL = 'bsiegel13+uitest-preview@gmail.com'
const DEMO_PASSWORD = 'RedditDemo2026!'

let admin: SupabaseClient
let familyId: string
let originalPlan: string
let parentToken: string

const ORDER = FEATURES.map((f) => f.id)
const PREMIUM_ONLY = new Set(FEATURES.filter((f) => f.premiumOnly).map((f) => f.id))

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

/** Every feature the API offers, in order, by skipping each one it returns. */
async function discoverChain(request: import('@playwright/test').APIRequestContext, surface?: 'app') {
  const seen: string[] = []
  for (let i = 0; i <= ORDER.length; i++) {
    const params = new URLSearchParams({ skip: seen.join(',') })
    if (surface) params.set('surface', surface)
    const res = await request.get(`/api/engagement/discover?${params}`, { headers: { Authorization: `Bearer ${parentToken}` } })
    expect(res.status()).toBe(200)
    const { feature } = await res.json()
    if (!feature) return seen
    expect(seen).not.toContain(feature.id)
    for (const field of ['title', 'body', 'cta']) {
      expect(typeof feature[field]).toBe('string')
      expect(feature[field]).not.toContain('—')
    }
    seen.push(feature.id)
  }
  throw new Error(`discover never ran out: ${seen.join(', ')}`)
}

test.beforeAll(async () => {
  const key = (process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim().replace(/\\n$/, '')
  admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), key, { auth: { persistSession: false } })
  const { data: p } = await admin.from('profiles').select('id, subscription_type').eq('email', DEMO_EMAIL).single()
  familyId = p!.id
  originalPlan = p!.subscription_type

  const session = await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim().replace(/\\n/g, ''), {
    auth: { persistSession: false },
  }).auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
  parentToken = session.data.session!.access_token
})

test.afterAll(async () => {
  await admin.from('profiles').update({ subscription_type: originalPlan }).eq('id', familyId)
})

test.describe.configure({ mode: 'serial' })

// ---------------------------------------------------------------------------
// Pet art
// ---------------------------------------------------------------------------

test.describe('pet art', () => {
  test('draws a PNG, cached for good, with no sign-in', async ({ request }) => {
    const res = await request.get('/api/pets/art?species=dino&stage=teen&mood=happy&hat=wizard_hat&accessory=bowtie&habitat=space&size=240')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toBe('image/png')
    expect(res.headers()['cache-control']).toContain('immutable')
    const png = await res.body()
    expect(png.subarray(1, 4).toString()).toBe('PNG')
    // Width and height live at bytes 16-23 of the IHDR chunk.
    expect(png.readUInt32BE(16)).toBe(240)
  })

  test('nonsense falls back instead of failing, and size is clamped', async ({ request }) => {
    const res = await request.get('/api/pets/art?species=dragon&stage=ancient&mood=angry&hat=crown&accessory=crown&size=99999')
    expect(res.status()).toBe(200)
    expect((await res.body()).readUInt32BE(16)).toBe(600)
  })

  test('items in the wrong slot are ignored', async ({ request }) => {
    const [right, wrong, plain] = await Promise.all(
      ['hat=crown', 'accessory=crown', ''].map(async (q) => (await request.get(`/api/pets/art?species=pup&stage=kid&habitat=none&size=120&${q}`)).body())
    )
    expect(right.equals(plain)).toBe(false)
    expect(wrong.equals(plain)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Discover API
// ---------------------------------------------------------------------------

test.describe('discover API', () => {
  test('needs a signed-in parent', async ({ request }) => {
    expect((await request.get('/api/engagement/discover')).status()).toBe(401)
  })

  test('free family: only free features, in the list order', async ({ request }) => {
    await setPlan('free')
    const chain = await discoverChain(request)
    for (const id of chain) expect(PREMIUM_ONLY.has(id as never)).toBe(false)
    expect(chain).toEqual([...chain].sort((a, b) => ORDER.indexOf(a as never) - ORDER.indexOf(b as never)))
  })

  test('premium family: premium features can appear, still in order', async ({ request }) => {
    await setPlan('premium')
    const chain = await discoverChain(request)
    expect(chain).toEqual([...chain].sort((a, b) => ORDER.indexOf(a as never) - ORDER.indexOf(b as never)))
  })

  test('the native app is never offered something it cannot open', async ({ request }) => {
    await setPlan('premium')
    const chain = await discoverChain(request, 'app')
    const appSurface = new Set(FEATURES.filter((f) => f.surfaces.includes('push')).map((f) => f.id))
    for (const id of chain) expect(appSurface.has(id as never)).toBe(true)
  })

  test('unknown skip ids are ignored', async ({ request }) => {
    const headers = { Authorization: `Bearer ${parentToken}` }
    const plain = await (await request.get('/api/engagement/discover', { headers })).json()
    const junk = await (await request.get('/api/engagement/discover?skip=nope,%27;drop', { headers })).json()
    expect(junk).toEqual(plain)
  })
})

// ---------------------------------------------------------------------------
// Dashboard discover card (API stubbed: these test the card, not the data)
// ---------------------------------------------------------------------------

const STUB = {
  id: 'money_jars',
  title: 'Spend, Save and Give jars',
  body: 'Split earnings into jars and pay a weekly allowance automatically.',
  cta: 'Set up jars',
}

async function stubDiscover(page: Page, seenSkips: string[]) {
  await page.route('**/api/engagement/discover**', async (route) => {
    const skip = new URL(route.request().url()).searchParams.get('skip') ?? ''
    seenSkips.push(skip)
    await route.fulfill({ json: { feature: skip.split(',').includes(STUB.id) ? null : STUB } })
  })
}

test.describe('discover card', () => {
  test('waits for the getting-started card to retire', async ({ page }) => {
    const skips: string[] = []
    await stubDiscover(page, skips)
    await page.addInitScript(() => localStorage.removeItem('chorestar-getting-started-done'))
    await signIn(page)
    await page.waitForTimeout(2_000)
    await expect(page.getByRole('heading', { name: STUB.title })).toHaveCount(0)
    expect(skips).toHaveLength(0)
  })

  test('"Not now" hides it and the next visit skips that feature', async ({ page }) => {
    const skips: string[] = []
    await stubDiscover(page, skips)
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('e2e-seeded')) {
        localStorage.setItem('chorestar-getting-started-done', 'true')
        localStorage.removeItem('chorestar-discover-dismissed')
        sessionStorage.setItem('e2e-seeded', '1')
      }
    })
    await signIn(page)
    const heading = page.getByRole('heading', { name: STUB.title })
    await expect(heading).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: /^not now$/i }).click()
    await expect(heading).toHaveCount(0)
    expect(await page.evaluate(() => localStorage.getItem('chorestar-discover-dismissed'))).toContain(STUB.id)

    await page.reload()
    await expect.poll(() => skips.at(-1)).toContain(STUB.id)
    await expect(heading).toHaveCount(0)
  })

  test('the button opens the place to set it up', async ({ page }) => {
    const skips: string[] = []
    await stubDiscover(page, skips)
    await page.addInitScript(() => {
      localStorage.setItem('chorestar-getting-started-done', 'true')
      localStorage.removeItem('chorestar-discover-dismissed')
    })
    await signIn(page)
    await page.getByRole('button', { name: STUB.cta }).click()
    await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('#settings-tab-rewards')).toHaveAttribute('aria-selected', 'true')
  })
})

// ---------------------------------------------------------------------------
// Lapse-nudge cron
// ---------------------------------------------------------------------------

test.describe('lapse-nudge cron', () => {
  test('is invisible without the cron secret', async ({ request }) => {
    expect((await request.get('/api/cron/lapse-nudge?dry=1')).status()).toBe(404)
    expect((await request.get('/api/cron/lapse-nudge?dry=1', { headers: { Authorization: 'Bearer wrong' } })).status()).toBe(404)
  })

  test('dry run reports and sends nothing', async ({ request }) => {
    test.skip(!process.env.CRON_SECRET, 'CRON_SECRET not set for this run')
    const res = await request.get('/api/cron/lapse-nudge?dry=1', {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      timeout: 60_000,
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.dry).toBe(true)
    expect(body.nudged).toBe(body.results.length)
    for (const r of body.results) {
      expect(r.result).toMatch(/^would send: /)
      expect([...ORDER, 'fallback']).toContain(r.feature)
      expect(r.daysQuiet).toBeGreaterThanOrEqual(7)
      expect(r.daysQuiet).toBeLessThanOrEqual(30)
    }
  })
})
