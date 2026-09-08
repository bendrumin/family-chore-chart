#!/usr/bin/env node
// Seed the THROWAWAY Star Family (kid code b5aceec8, parent
// bsiegel13+uitest-preview@gmail.com) with demo data for the r/iosapps
// screenshots + video: chores, a month of completions, a goal mid-fill,
// starter reward store, and a known parent password. Touches ONLY rows
// belonging to that family. Run: node --env-file=.env.local <this>.
import { createClient } from '@supabase/supabase-js'

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
const key = (process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim().replace(/\\n$/, '')
if (!url || !key) { console.error('missing env'); process.exit(1) }
const admin = createClient(url, key, { auth: { persistSession: false } })

const KID_CODE = 'b5aceec8'
const PARENT_EMAIL = 'bsiegel13+uitest-preview@gmail.com'
const PARENT_PASSWORD = 'RedditDemo2026!'

// 1. Resolve the family strictly by kid code AND parent email (both must match).
const { data: profile, error: pErr } = await admin
  .from('profiles').select('id, email, family_name, kid_login_code')
  .eq('kid_login_code', KID_CODE).single()
if (pErr || !profile) { console.error('family not found', pErr?.message); process.exit(1) }
if (profile.email !== PARENT_EMAIL) {
  console.error(`SAFETY STOP: kid code resolves to ${profile.email}, expected ${PARENT_EMAIL}`)
  process.exit(1)
}
const uid = profile.id
console.log(`family: "${profile.family_name}" (${profile.email})`)

// 2. Known parent password for the -chorestar-signin capture flow.
const { error: pwErr } = await admin.auth.admin.updateUserById(uid, { password: PARENT_PASSWORD })
console.log('parent password set:', pwErr ? `FAILED ${pwErr.message}` : 'ok')

// 3. Maya.
const { data: kids } = await admin.from('children').select('id, name').eq('user_id', uid)
const maya = (kids ?? []).find((k) => k.name === 'Maya')
if (!maya) { console.error('Maya not found; children:', kids?.map((k) => k.name)); process.exit(1) }

// 4. Family settings: per-chore rewards, US locale.
await admin.from('family_settings').upsert(
  { user_id: uid, reward_mode: 'per_chore', currency_code: 'USD', timezone: 'America/Chicago' },
  { onConflict: 'user_id' }
)

// 5. Chores: exactly this demo set (idempotent by name).
const CHORES = [
  { name: 'Make your bed', icon: '🛏️', reward_cents: 25, days: [0, 1, 2, 3, 4, 5, 6] },
  { name: 'Feed the dog', icon: '🐶', reward_cents: 25, days: [0, 1, 2, 3, 4, 5, 6] },
  { name: 'Water the plants', icon: '🪴', reward_cents: 25, days: [1, 3, 5] },
  { name: 'Take out recycling', icon: '♻️', reward_cents: 50, days: [2] },
]
const { data: existing } = await admin.from('chores').select('id, name').eq('child_id', maya.id)
const byName = new Map((existing ?? []).map((c) => [c.name, c.id]))
const choreIds = {}
for (const [i, c] of CHORES.entries()) {
  if (byName.has(c.name)) { choreIds[c.name] = byName.get(c.name); continue }
  const { data, error } = await admin.from('chores').insert({
    child_id: maya.id, name: c.name, icon: c.icon, reward_cents: c.reward_cents,
    days_of_week: c.days, is_active: true, sort_order: i, category: 'household_chores',
  }).select('id').single()
  if (error) { console.error('chore insert failed:', c.name, error.message); process.exit(1) }
  choreIds[c.name] = data.id
}
console.log('chores ready:', Object.keys(choreIds).length)

// 6. Completions: four past weeks nearly perfect + this week through Sunday.
//    Weeks are Sunday-keyed; today is Mon 2026-09-07, current week 2026-09-06.
const weeks = ['2026-08-09', '2026-08-16', '2026-08-23', '2026-08-30']
const rows = []
for (const [wi, week] of weeks.entries()) {
  for (const c of CHORES) {
    for (const day of c.days) {
      // Leave a couple of realistic gaps (not robot-perfect).
      if ((wi === 1 && day === 4 && c.name === 'Make your bed') || (wi === 3 && day === 6 && c.name === 'Feed the dog')) continue
      rows.push({ chore_id: choreIds[c.name], week_start: week, day_of_week: day, status: 'approved', completed_at: `${week}T18:00:00Z` })
    }
  }
}
// This week: Sunday done, Monday (today) partially done so the grid looks live.
for (const c of CHORES) {
  if (c.days.includes(0)) rows.push({ chore_id: choreIds[c.name], week_start: '2026-09-06', day_of_week: 0, status: 'approved', completed_at: '2026-09-06T18:00:00Z' })
}
rows.push({ chore_id: choreIds['Make your bed'], week_start: '2026-09-06', day_of_week: 1, status: 'approved', completed_at: '2026-09-07T13:00:00Z' })

// Idempotency: wipe this family's completions for those weeks first (throwaway family).
const allWeeks = [...weeks, '2026-09-06']
await admin.from('chore_completions').delete().in('chore_id', Object.values(choreIds)).in('week_start', allWeeks)
const { error: compErr } = await admin.from('chore_completions').insert(rows)
if (compErr) { console.error('completions failed:', compErr.message); process.exit(1) }
console.log('completions inserted:', rows.length)

// 7. Goal: Lego set, mid-fill. Compute earned, then adjust payouts so owed = $17.00.
const earned = rows.reduce((s, r) => {
  const chore = CHORES.find((c) => choreIds[c.name] === r.chore_id)
  return s + (chore?.reward_cents ?? 0)
}, 0)
await admin.from('goals').delete().eq('child_id', maya.id)
const { error: gErr } = await admin.from('goals').insert({ child_id: maya.id, title: 'Lego Speed Champions', emoji: '🧱', target_cents: 2500, status: 'active' })
if (gErr) { console.error('goal failed:', gErr.message); process.exit(1) }
await admin.from('allowance_payouts').delete().eq('child_id', maya.id)
const payout = earned - 1700
if (payout > 0) {
  await admin.from('allowance_payouts').insert({ child_id: maya.id, amount_cents: payout, note: 'Paid out' })
}
console.log(`earned ${earned}c, payout ${Math.max(payout, 0)}c, owed = ${Math.min(earned, 1700)}c`)

// 8. Reward store: starter set if the family has none.
const { data: items } = await admin.from('reward_items').select('id').eq('user_id', uid)
if (!items || items.length === 0) {
  await admin.from('reward_items').insert([
    { user_id: uid, title: '30 min screen time', emoji: '📱', price_cents: 200, is_active: true, sort_order: 0 },
    { user_id: uid, title: 'Pick Friday dinner', emoji: '🍕', price_cents: 500, is_active: true, sort_order: 1 },
    { user_id: uid, title: 'Stay up 30 min late', emoji: '🌙', price_cents: 300, is_active: true, sort_order: 2 },
    { user_id: uid, title: 'Family movie pick', emoji: '🎬', price_cents: 400, is_active: true, sort_order: 3 },
  ])
  console.log('reward store: starter set inserted')
} else {
  console.log(`reward store: ${items.length} items already present`)
}

// 9. "Needs your OK" tray: one pending store request (Maya wants the movie
//    pick) and one pending tick (Leo, Sunday). Leo's chore is Sundays-only so
//    the hero still reads "Leo none today" on weekday captures.
const leo = (kids ?? []).find((k) => k.name === 'Leo')
if (leo) {
  const { data: leoChores } = await admin.from('chores').select('id, name').eq('child_id', leo.id)
  let putAwayId = (leoChores ?? []).find((c) => c.name === 'Put away toys')?.id
  if (!putAwayId) {
    const { data, error } = await admin.from('chores').insert({
      child_id: leo.id, name: 'Put away toys', icon: '🧸', reward_cents: 25,
      days_of_week: [0], is_active: true, sort_order: 0, category: 'household_chores',
    }).select('id').single()
    if (error) { console.error('Leo chore failed:', error.message); process.exit(1) }
    putAwayId = data.id
  }
  await admin.from('chore_completions').delete().eq('chore_id', putAwayId).eq('week_start', '2026-09-06')
  const { error: pendErr } = await admin.from('chore_completions').insert({
    chore_id: putAwayId, week_start: '2026-09-06', day_of_week: 0,
    status: 'pending', completed_at: '2026-09-06T19:30:00Z',
  })
  console.log('Leo pending tick:', pendErr ? `FAILED ${pendErr.message}` : 'ok')
} else {
  console.log('Leo not found; skipping pending tick')
}

const { data: movieItem } = await admin.from('reward_items')
  .select('id').eq('user_id', uid).eq('title', 'Family movie pick').maybeSingle()
if (movieItem) {
  await admin.from('reward_redemptions').delete().eq('child_id', maya.id)
  const { error: redErr } = await admin.from('reward_redemptions').insert({
    child_id: maya.id, reward_item_id: movieItem.id, status: 'pending', price_cents: 400,
  })
  console.log('Maya store request:', redErr ? `FAILED ${redErr.message}` : 'ok')
} else {
  console.log('movie reward item not found; skipping store request')
}

console.log('SEED COMPLETE')
