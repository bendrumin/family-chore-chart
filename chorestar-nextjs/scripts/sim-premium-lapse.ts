/**
 * Drives the demo family (The Star Family, a throwaway account) through
 * Premium -> lapse -> resubscribe for the iOS simulator check
 * (ChoreStar-iOS/scripts/premium-lapse-sim.sh). Calls the same
 * applyFreeLimits / liftFreeLimits the store webhooks call.
 *
 *   npx tsx scripts/sim-premium-lapse.ts setup|lapse|resume|restore|state [saveFile]
 *
 * setup saves the family's plan, theme and signup date to saveFile, moves the
 * signup date past the 2026-09-19 cutoff (the demo is otherwise grandfathered
 * into themes), picks Ocean and goes over the free limits with kids and chores
 * named e2e-sim. restore puts all of it back and deletes what it added.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { applyFreeLimits, liftFreeLimits } from '../lib/billing/plan-limits'
import { writeFileSync, readFileSync, existsSync } from 'fs'
config({ path: '.env.local' })
const DEMO = 'bsiegel13+uitest-preview@gmail.com'
const TAG = 'e2e-sim'
const SAVE = process.argv[3] ?? '.sim-premium-lapse.json'
const key = (process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim().replace(/\\n$/, '')
const admin: any = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), key, { auth: { persistSession: false } })

async function main() {
  const cmd = process.argv[2]
  const { data: p } = await admin.from('profiles').select('id, subscription_type, created_at').eq('email', DEMO).single()
  const id = p.id
  const { data: fs } = await admin.from('family_settings').select('custom_theme').eq('user_id', id).maybeSingle()
  if (cmd === 'setup') {
    if (!existsSync(SAVE)) writeFileSync(SAVE, JSON.stringify({ plan: p.subscription_type, theme: fs?.custom_theme ?? null, created: p.created_at }))
    // Past the 2026-09-19 cutoff, so the demo isn't grandfathered into themes.
    await admin.from('profiles').update({ subscription_type: 'premium', created_at: '2026-10-01T00:00:00Z' }).eq('id', id)
    await admin.from('family_settings').update({ custom_theme: { ...(fs?.custom_theme ?? {}), seasonalTheme: 'ocean', autoSeasonal: false } }).eq('user_id', id)
    const { data: kids } = await admin.from('children').select('id, name').eq('user_id', id).order('created_at')
    const real = kids.filter((k: any) => !k.name.startsWith(TAG))
    for (let i = kids.length; i < 4; i++) await admin.from('children').insert({ user_id: id, name: `${TAG} Kid ${i}`, age: 7 })
    const { count } = await admin.from('chores').select('id', { count: 'exact', head: true }).in('child_id', kids.map((k: any) => k.id)).eq('is_active', true)
    for (let i = count ?? 0; i < 23; i++) await admin.from('chores').insert({ child_id: real[0].id, name: `${TAG} chore ${i}`, icon: '🧪', reward_cents: 0, days_of_week: [0,1,2,3,4,5,6], is_active: true, category: 'household_chores' })
  } else if (cmd === 'lapse') {
    await admin.from('profiles').update({ subscription_type: 'free' }).eq('id', id)
    console.log('paused', await applyFreeLimits(admin, id))
  } else if (cmd === 'resume') {
    await admin.from('profiles').update({ subscription_type: 'premium' }).eq('id', id)
    await liftFreeLimits(admin, id)
  } else if (cmd === 'restore') {
    const orig = JSON.parse(readFileSync(SAVE, 'utf8'))
    await admin.from('profiles').update({ subscription_type: 'premium' }).eq('id', id)
    await liftFreeLimits(admin, id)
    const { data: kids } = await admin.from('children').select('id, name').eq('user_id', id)
    const ours = kids.filter((k: any) => k.name.startsWith(TAG)).map((k: any) => k.id)
    await admin.from('chores').delete().like('name', `${TAG}%`).in('child_id', kids.map((k: any) => k.id))
    if (ours.length) await admin.from('children').delete().in('id', ours)
    await admin.from('profiles').update({ subscription_type: orig.plan, created_at: orig.created }).eq('id', id)
    await admin.from('family_settings').update({ custom_theme: orig.theme }).eq('user_id', id)
  }
  const { data: p2 } = await admin.from('profiles').select('subscription_type, created_at').eq('id', id).single()
  const { data: f2 } = await admin.from('family_settings').select('custom_theme').eq('user_id', id).maybeSingle()
  const { data: k2 } = await admin.from('children').select('name, paused_by_plan').eq('user_id', id).order('created_at')
  const { data: c2 } = await admin.from('chores').select('is_active, paused_by_plan').in('child_id', (await admin.from('children').select('id').eq('user_id', id)).data.map((k: any) => k.id))
  console.log(JSON.stringify({ plan: p2.subscription_type, created: p2.created_at, theme: f2?.custom_theme?.seasonalTheme ?? null, kids: k2, activeChores: c2.filter((c: any) => c.is_active).length, pausedChores: c2.filter((c: any) => c.paused_by_plan).length }))
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1) })
