#!/usr/bin/env node
// Is production actually running the schema this repo assumes?
//
//   node --env-file=.env.local scripts/check-migrations.mjs
//
// Migrations here are hand-pasted into the Supabase SQL editor, and nothing in
// CI can see whether that happened: the unit tests are pure logic and never
// open a connection. Migration 022 sat unapplied for weeks with every test
// green, until /api/google/verify started returning 502 in production because
// the column it writes did not exist. This is the check that would have caught
// it in seconds.
//
// Two questions per object:
//   1. does it exist?            asked with the service-role key
//   2. can a stranger read it?   asked with the ANON key, which is the view an
//                                attacker has from a browser console
//
// An anon read returning rows from a table holding family data means RLS is
// off or a policy is too loose. Returning none while the service role sees
// rows proves RLS is filtering. If the table is empty, neither is proven and
// the script says so rather than implying safety it has not established.
import { createClient } from '@supabase/supabase-js'

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
// The anon key in .env.local carries a literal \n; unterminated it 401s.
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim().replace(/\\n/g, '')
const serviceKey = (process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim().replace(/\\n$/, '')
if (!url || !anonKey || !serviceKey) {
  console.error('need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_KEY')
  process.exit(1)
}
const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
const anon = createClient(url, anonKey, { auth: { persistSession: false } })

// migration -> what it should have created. Columns are listed where the
// migration only adds columns, since a table existing says nothing about them.
const CHECKS = [
  ['018 apple billing', 'apple_notifications', []],
  ['018 apple billing', 'profiles', ['apple_original_transaction_id']],
  ['022 play billing', 'google_notifications', []],
  ['022 play billing', 'profiles', ['google_purchase_token']],
  ['023 sign in with apple', 'apple_sign_in_tokens', []],
  ['025 chore rotation', 'chores', ['rotation_group_id', 'rotation_mode', 'rotation_order', 'rotation_start_week']],
  ['026 weekly report', 'family_settings', ['weekly_report_email', 'weekly_report_last_sent', 'weekly_report_token']],
  ['027 paywall events', 'paywall_events', []],
  ['028 secure family joining', 'family_join_attempts', []],
  ['030 money jars', 'child_money_settings', []],
  ['030 money jars', 'money_jar_splits', []],
  ['030 money jars', 'money_recurring_deductions', []],
  ['030 money jars', 'money_ledger', []],
  ['031 family challenges', 'family_challenges', []],
  ['031 family challenges', 'family_challenge_rewards', []],
  ['032 routine upgrades', 'routine_progress', []],
  ['033 calendar feed', 'calendar_feeds', []],
  ['034 pets', 'child_pets', []],
  ['034 pets', 'child_pet_cosmetics', []],
  ['037 lapse nudge', 'family_settings', ['lapse_nudged_at']],
  // Core tables, included because an RLS regression on these is the worst case
  // this script could catch. child_pins holds PIN hashes, kid_sessions holds
  // live session tokens.
  ['core', 'profiles', []],
  ['core', 'children', []],
  ['core', 'chores', []],
  ['core', 'chore_completions', []],
  ['core', 'child_pins', []],
  ['core', 'kid_sessions', []],
  ['core', 'routines', []],
  ['core', 'family_settings', []],
  ['core', 'outreach_sent_log', []],
]

const rows = []
for (const [migration, table, columns] of CHECKS) {
  const select = columns.length ? columns.join(', ') : '*'
  const { error: adminErr, count: adminCount } = await admin
    .from(table).select(select, { count: 'exact', head: true })
  if (adminErr) {
    rows.push({ migration, table, columns, verdict: 'MISSING', detail: adminErr.message.slice(0, 70) })
    continue
  }
  const { error: anonErr, count: anonCount } = await anon
    .from(table).select('*', { count: 'exact', head: true })
  const seen = anonErr ? 0 : (anonCount ?? 0)
  let verdict, detail
  if (!anonErr && seen > 0) {
    verdict = 'EXPOSED'
    detail = `anon can read ${seen} row(s)`
  } else if ((adminCount ?? 0) > 0) {
    verdict = 'ok'
    detail = `${adminCount} row(s), anon sees none`
  } else {
    verdict = 'empty'
    detail = 'table is empty, so RLS is untested here'
  }
  rows.push({ migration, table, columns, verdict, detail })
}

let lastMigration = null
for (const r of rows) {
  if (r.migration !== lastMigration) { console.log(`\n${r.migration}`); lastMigration = r.migration }
  const what = r.columns.length ? `${r.table}.{${r.columns.join(', ')}}` : r.table
  const tag = r.verdict === 'MISSING' ? 'MISSING' : r.verdict === 'EXPOSED' ? 'EXPOSED' : r.verdict === 'empty' ? 'empty  ' : 'ok     '
  console.log(`  ${tag} ${what.padEnd(46)} ${r.detail}`)
}

const missing = rows.filter((r) => r.verdict === 'MISSING')
const exposed = rows.filter((r) => r.verdict === 'EXPOSED')
const untested = rows.filter((r) => r.verdict === 'empty')
console.log(`\n${rows.length} checks | ok ${rows.filter((r) => r.verdict === 'ok').length} | empty ${untested.length} | MISSING ${missing.length} | EXPOSED ${exposed.length}`)
if (missing.length) console.log('\nRun these migrations in the Supabase SQL editor:\n' + [...new Set(missing.map((r) => r.migration))].map((m) => `  ${m}`).join('\n'))
if (exposed.length) console.log('\nRLS problem, anonymous users can read family data:\n' + exposed.map((r) => `  ${r.table}: ${r.detail}`).join('\n'))
console.log('\nScope: existence and anonymous readability only. It does not verify')
console.log('policy wording, indexes, constraints, or whether one signed-in family')
console.log('can reach another\'s rows.')
process.exit(missing.length || exposed.length ? 1 : 0)
