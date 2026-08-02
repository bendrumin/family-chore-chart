/**
 * Unit tests for theme resolution. Run with `npm run test:unit`.
 *
 * The rules that matter: exactly one theme is ever in effect, a season fully
 * replaces the time-of-day palette rather than blending with it, and whatever
 * wins drives the brand colors — not just the --seasonal-* ones.
 */
import assert from 'node:assert/strict'
import { resolveActiveTheme, themeCssVars, THEME_CSS_VAR_NAMES } from './resolve-theme'
import {
  THEME_COLORS,
  SEASONAL_THEMES_DATA,
  ACCENT_THEMES,
  getCurrentSeasonalTheme,
  seasonalWindowLength,
  isWithinSeasonalWindow,
} from '@/lib/constants/seasonal-themes'
import { TIME_THEMES, getCurrentTimeTheme, isWithinTimeWindow, msUntilNextTimeTheme } from '@/lib/constants/time-themes'
import type { CustomTheme } from '@/lib/supabase/database.types'

let passed = 0
let failed = 0
function t(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ok    ${name}`)
  } catch (err) {
    failed++
    console.log(`  FAIL  ${name}`)
    console.log(`        ${(err as Error).message.split('\n')[0]}`)
  }
}
const group = (n: string) => console.log(`\n${n}`)

// 2026: Halloween, a plain day in Sept (fall), Christmas Day, New Year's Eve.
const at = (iso: string) => new Date(iso)
const HALLOWEEN = at('2026-10-31T18:30:00')
const PLAIN_FALL = at('2026-09-30T10:00:00')
const CHRISTMAS = at('2026-12-25T10:00:00')
const NEW_YEAR_EVE = at('2026-12-30T22:00:00')
const AUGUST_EVENING = at('2026-08-02T18:30:00')

group('precedence — exactly one theme wins')

t('an explicit pick beats both auto modes', () => {
  const ct: CustomTheme = { seasonalTheme: 'ocean', autoSeasonal: true, autoTimeOfDay: true }
  const r = resolveActiveTheme(ct, HALLOWEEN)
  assert.equal(r?.id, 'ocean')
  assert.equal(r?.source, 'manual')
})

t('auto-seasonal beats time of day', () => {
  const ct: CustomTheme = { autoSeasonal: true, autoTimeOfDay: true }
  const r = resolveActiveTheme(ct, HALLOWEEN)
  assert.equal(r?.id, 'halloween')
  assert.equal(r?.source, 'auto-seasonal')
})

t('a season replaces the time palette outright — no blending', () => {
  const ct: CustomTheme = { autoSeasonal: true, autoTimeOfDay: true }
  const r = resolveActiveTheme(ct, HALLOWEEN)!
  const halloween = SEASONAL_THEMES_DATA.halloween.colors
  // Halloween orange, and specifically NOT the dusk palette's purple secondary.
  assert.deepEqual(r.colors, halloween)
  assert.notEqual(r.colors.light.secondary, TIME_THEMES.dusk.colors.light.secondary)
})

t('time of day applies when auto-seasonal finds no active season', () => {
  const ct: CustomTheme = { autoSeasonal: true, autoTimeOfDay: true }
  // Early August evening: summer is active, so seasonal still wins...
  assert.equal(resolveActiveTheme(ct, AUGUST_EVENING)?.source, 'auto-seasonal')
  // ...but with auto-seasonal off, dusk takes over.
  const r = resolveActiveTheme({ autoTimeOfDay: true }, AUGUST_EVENING)
  assert.equal(r?.source, 'auto-time')
  assert.equal(r?.id, 'time-dusk')
})

t('nothing enabled resolves to null (brand palette)', () => {
  assert.equal(resolveActiveTheme({}, HALLOWEEN), null)
  assert.equal(resolveActiveTheme(null, HALLOWEEN), null)
})

t('an unknown stored id falls through to auto instead of blanking out', () => {
  const ct: CustomTheme = { seasonalTheme: 'a-theme-we-removed', autoTimeOfDay: true }
  const r = resolveActiveTheme(ct, AUGUST_EVENING)
  assert.equal(r?.source, 'auto-time')
})

group('every pickable theme has colors')

t('all seasonal + accent ids resolve to a color pair', () => {
  const ids = [
    ...Object.values(SEASONAL_THEMES_DATA).map(t => t.id),
    ...Object.values(ACCENT_THEMES).map(t => t.id),
  ]
  for (const id of ids) {
    const colors = THEME_COLORS[id]
    assert.ok(colors, `${id} has no colors`)
    for (const mode of ['light', 'dark'] as const) {
      assert.match(colors[mode].primary, /^#[0-9a-f]{6}$/i, `${id}.${mode}.primary`)
      assert.match(colors[mode].secondary, /^#[0-9a-f]{6}$/i, `${id}.${mode}.secondary`)
    }
  }
})

t('a manual pick of every id resolves', () => {
  for (const id of Object.keys(THEME_COLORS)) {
    const r = resolveActiveTheme({ seasonalTheme: id }, HALLOWEEN)
    assert.equal(r?.id, id, `${id} did not resolve`)
  }
})

group('seasonal windows — narrowest wins')

t('Christmas beats Fall, whose window contains it', () => {
  assert.equal(getCurrentSeasonalTheme(CHRISTMAS)?.id, 'christmas')
})

t('New Year is reachable — it used to be shadowed entirely', () => {
  // 12-28→01-05 sits inside Christmas (12-01→12-31) and Winter (12-21→03-19).
  // First-match-in-order meant it could never win.
  assert.equal(getCurrentSeasonalTheme(NEW_YEAR_EVE)?.id, 'newYear')
})

t('a plain autumn day still resolves to Fall', () => {
  assert.equal(getCurrentSeasonalTheme(PLAIN_FALL)?.id, 'fall')
})

t('window lengths handle the year-boundary wrap', () => {
  assert.equal(seasonalWindowLength('12-28', '01-05'), 9)
  assert.equal(seasonalWindowLength('10-01', '10-31'), 31)
  assert.ok(seasonalWindowLength('12-21', '03-19') > 80)
})

t('membership handles the wrap in both directions', () => {
  assert.equal(isWithinSeasonalWindow('01-02', '12-21', '03-19'), true)
  assert.equal(isWithinSeasonalWindow('12-25', '12-21', '03-19'), true)
  assert.equal(isWithinSeasonalWindow('06-01', '12-21', '03-19'), false)
})

t('Feb 29 does not fall through every window', () => {
  assert.ok(getCurrentSeasonalTheme(at('2028-02-29T12:00:00')) !== null)
})

group('time windows tile the whole day')

t('every hour resolves to exactly one slot', () => {
  for (let h = 0; h < 24; h++) {
    const matches = Object.values(TIME_THEMES).filter(s =>
      isWithinTimeWindow(h, s.startHour, s.endHour)
    )
    assert.equal(matches.length, 1, `hour ${h} matched ${matches.length} slots`)
  }
})

t('the boundaries land where expected', () => {
  const idAt = (h: number) => getCurrentTimeTheme(at(`2026-08-02T${String(h).padStart(2, '0')}:00:00`)).id
  assert.equal(idAt(4), 'night')
  assert.equal(idAt(5), 'dawn')
  assert.equal(idAt(9), 'day')
  assert.equal(idAt(17), 'dusk')
  assert.equal(idAt(21), 'night')
  assert.equal(idAt(23), 'night')
})

t('the next-boundary delay is positive and within a day', () => {
  for (let h = 0; h < 24; h++) {
    const ms = msUntilNextTimeTheme(at(`2026-08-02T${String(h).padStart(2, '0')}:30:00`))
    assert.ok(ms > 0 && ms <= 24 * 60 * 60 * 1000, `hour ${h} -> ${ms}ms`)
  }
})

group('css variables')

t('a theme drives the brand variables, not just --seasonal-*', () => {
  const vars = themeCssVars(SEASONAL_THEMES_DATA.halloween.colors, false)
  // Halloween orange is 2.94:1 on white, so --primary is the corrected value
  // rather than the raw accent — assert the contract, not a literal.
  for (const token of ['--primary', '--secondary', '--primary-fill', '--gradient-primary', '--seasonal-accent']) {
    assert.ok(vars[token], `${token} not set`)
  }
  assert.ok(vars['--gradient-primary'].includes(vars['--primary-fill']))
  assert.equal(vars['--seasonal-accent'], vars['--primary'])
})

t('the corrected accent keeps its hue — halloween stays orange', () => {
  const vars = themeCssVars(SEASONAL_THEMES_DATA.halloween.colors, false)
  const [r, g, b] = [1, 3, 5].map(i => parseInt(vars['--primary'].slice(i, i + 2), 16))
  assert.ok(r > g && g > b, `expected red>green>blue, got ${vars['--primary']}`)
})

t('dark mode uses the dark pair as its basis', () => {
  const light = themeCssVars(SEASONAL_THEMES_DATA.halloween.colors, false)
  const dark = themeCssVars(SEASONAL_THEMES_DATA.halloween.colors, true)
  assert.notEqual(light['--primary'], dark['--primary'])
  assert.equal(dark['--primary-fill'], '#ff8c42')
})

t('the clear list covers everything the setter sets', () => {
  const set = Object.keys(themeCssVars(ACCENT_THEMES.ocean.colors, false))
  assert.deepEqual(new Set(set), new Set(THEME_CSS_VAR_NAMES))
})

console.log(`\n${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
