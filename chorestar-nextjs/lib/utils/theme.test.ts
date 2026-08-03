/**
 * Theme resolution, accent contrast, and holiday sticker tests.
 * Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  THEME_COLORS,
  SEASONAL_THEMES_DATA,
  ACCENT_THEMES,
  getCurrentSeasonalTheme,
  seasonalWindowLength,
  isWithinSeasonalWindow,
} from '@/lib/constants/seasonal-themes'
import { resolveActiveTheme, themeCssVars, colorsFromAccent, THEME_CSS_VAR_NAMES } from './resolve-theme'
import {
  contrastRatio,
  ensureReadable,
  bestForeground,
  relativeLuminance,
  isValidHex,
  normalizeHex,
  SURFACE_LIGHT,
  SURFACE_DARK,
  AA_NORMAL,
} from './contrast'
import { getHolidayDecoration } from './holiday-stickers'
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
const at = (iso: string) => new Date(iso)

const HALLOWEEN = at('2026-10-31T18:30:00')
const CHRISTMAS = at('2026-12-25T10:00:00')
const NEW_YEAR_EVE = at('2026-12-30T22:00:00')
const AUGUST = at('2026-08-02T18:30:00')

group('a theme never touches a full-bleed surface')

t('themeCssVars sets no gradient or header property', () => {
  const vars = themeCssVars(SEASONAL_THEMES_DATA.summer.colors, false)
  for (const banned of ['--gradient-primary', '--gradient-foreground', '--seasonal-gradient', '--header-gradient']) {
    assert.equal(vars[banned], undefined, `${banned} must not be themed`)
  }
})

t('summer no longer produces a school-bus-yellow surface anywhere', () => {
  const vars = themeCssVars(SEASONAL_THEMES_DATA.summer.colors, false)
  // The raw accent may appear as a small fill, but never as a surface token,
  // and never as a text color (it is invisible on white at 1.44:1).
  assert.notEqual(vars['--primary'], '#ffd700')
  assert.ok(contrastRatio(vars['--primary'], SURFACE_LIGHT) >= AA_NORMAL)
})

t('only accent-sized tokens are exposed', () => {
  assert.deepEqual(new Set(THEME_CSS_VAR_NAMES), new Set([
    '--primary', '--secondary',
    '--primary-fill', '--secondary-fill',
    '--primary-foreground', '--secondary-foreground',
    '--seasonal-accent', '--seasonal-secondary',
  ]))
})

group('precedence')

t('an explicit pick beats auto-seasonal', () => {
  const ct: CustomTheme = { seasonalTheme: 'ocean', autoSeasonal: true }
  const r = resolveActiveTheme(ct, HALLOWEEN)
  assert.equal(r?.id, 'ocean')
  assert.equal(r?.source, 'manual')
})

t('auto-seasonal resolves when nothing is picked', () => {
  const r = resolveActiveTheme({ autoSeasonal: true }, HALLOWEEN)
  assert.equal(r?.id, 'halloween')
  assert.equal(r?.source, 'auto-seasonal')
})

t('nothing enabled means the brand palette', () => {
  assert.equal(resolveActiveTheme({}, HALLOWEEN), null)
  assert.equal(resolveActiveTheme(null, HALLOWEEN), null)
})

t('an unknown stored id falls through to auto', () => {
  const r = resolveActiveTheme({ seasonalTheme: 'deleted-theme', autoSeasonal: true }, HALLOWEEN)
  assert.equal(r?.source, 'auto-seasonal')
})

group('every pickable theme actually applies a color')

t('all 17 ids resolve to a valid color pair', () => {
  const ids = [
    ...Object.values(SEASONAL_THEMES_DATA).map(x => x.id),
    ...Object.values(ACCENT_THEMES).map(x => x.id),
  ]
  assert.equal(ids.length, 17)
  for (const id of ids) {
    const colors = THEME_COLORS[id]
    assert.ok(colors, `${id} has no colors`)
    for (const mode of ['light', 'dark'] as const) {
      assert.match(colors[mode].primary, /^#[0-9a-f]{6}$/i, `${id}.${mode}.primary`)
      assert.match(colors[mode].secondary, /^#[0-9a-f]{6}$/i, `${id}.${mode}.secondary`)
    }
  }
})

t('forest, aurora, coral and lavender resolve — they used to apply nothing', () => {
  for (const id of ['forest', 'aurora', 'coral', 'lavender']) {
    assert.ok(resolveActiveTheme({ seasonalTheme: id }, AUGUST), `${id} did not resolve`)
  }
})

t('the two renamed ids match what the app persists', () => {
  assert.ok(THEME_COLORS.valentine, 'valentine missing')
  assert.ok(THEME_COLORS.stPatricks, 'stPatricks missing')
  assert.equal(THEME_COLORS.valentines, undefined)
  assert.equal(THEME_COLORS.stpatricks, undefined)
})

group('seasonal windows — narrowest wins')

t('Christmas beats Fall, which contains it', () => {
  assert.equal(getCurrentSeasonalTheme(CHRISTMAS)?.id, 'christmas')
})

t('New Year is reachable — it used to be shadowed entirely', () => {
  assert.equal(getCurrentSeasonalTheme(NEW_YEAR_EVE)?.id, 'newYear')
})

t('a plain August day resolves to Summer', () => {
  assert.equal(getCurrentSeasonalTheme(AUGUST)?.id, 'summer')
})

t('window length handles the year-boundary wrap', () => {
  assert.equal(seasonalWindowLength('12-28', '01-05'), 9)
  assert.equal(seasonalWindowLength('10-01', '10-31'), 31)
})

t('membership handles the wrap both ways', () => {
  assert.equal(isWithinSeasonalWindow('01-02', '12-21', '03-19'), true)
  assert.equal(isWithinSeasonalWindow('06-01', '12-21', '03-19'), false)
})

t('Feb 29 still resolves', () => {
  assert.ok(getCurrentSeasonalTheme(at('2028-02-29T12:00:00')) !== null)
})

group('accent contrast')

t('known WCAG reference ratios are right', () => {
  assert.equal(Math.round(contrastRatio('#ffffff', '#000000')), 21)
  assert.ok(Math.abs(contrastRatio('#767676', '#ffffff') - 4.54) < 0.05)
})

t('ensureReadable darkens a pale accent on white and keeps its hue', () => {
  const fixed = ensureReadable('#ffd700', SURFACE_LIGHT)
  assert.ok(contrastRatio(fixed, SURFACE_LIGHT) >= AA_NORMAL)
  assert.ok(relativeLuminance(fixed) < relativeLuminance('#ffd700'))
})

t('bestForeground picks ink for pale fills, white for deep ones', () => {
  assert.equal(bestForeground('#ffd700'), '#111827')
  assert.equal(bestForeground('#165b33'), '#ffffff')
})

for (const mode of ['light', 'dark'] as const) {
  const surface = mode === 'dark' ? SURFACE_DARK : SURFACE_LIGHT
  t(`${mode}: accent text clears AA on the page for every theme`, () => {
    const bad: string[] = []
    for (const [id, colors] of Object.entries(THEME_COLORS)) {
      const vars = themeCssVars(colors, mode === 'dark')
      for (const token of ['--primary', '--secondary'] as const) {
        const r = contrastRatio(vars[token], surface)
        if (r < AA_NORMAL) bad.push(`${id}${token}=${vars[token]} ${r.toFixed(2)}`)
      }
    }
    assert.deepEqual(bad, [], bad.join(', '))
  })

  t(`${mode}: ink clears AA on every accent fill`, () => {
    const bad: string[] = []
    for (const [id, colors] of Object.entries(THEME_COLORS)) {
      const vars = themeCssVars(colors, mode === 'dark')
      for (const [fill, fg] of [
        ['--primary-fill', '--primary-foreground'],
        ['--secondary-fill', '--secondary-foreground'],
      ] as const) {
        const r = contrastRatio(vars[fill], vars[fg])
        if (r < AA_NORMAL) bad.push(`${id}${fill}=${vars[fill]} vs ${vars[fg]} ${r.toFixed(2)}`)
      }
    }
    assert.deepEqual(bad, [], bad.join(', '))
  })
}

group('holiday stickers')

t('holidays get a cluster', () => {
  const d = getHolidayDecoration('halloween', HALLOWEEN)
  assert.equal(d?.holiday.id, 'halloween')
  assert.equal(d?.stickers.length, 3)
})

t('broad seasons get no art', () => {
  assert.equal(getHolidayDecoration('summer', AUGUST), null)
  assert.equal(getHolidayDecoration('fall', at('2026-09-30T10:00:00')), null)
})

t('no active theme means no art', () => {
  assert.equal(getHolidayDecoration(null, HALLOWEEN), null)
  assert.equal(getHolidayDecoration(undefined, HALLOWEEN), null)
})

t('a non-seasonal accent theme gets no art', () => {
  assert.equal(getHolidayDecoration('ocean', HALLOWEEN), null)
})

t('a hand-picked holiday decorates out of season, matching its accents', () => {
  // Picking Halloween in August should show pumpkins, not orange with no art.
  const d = getHolidayDecoration('halloween', AUGUST)
  assert.equal(d?.holiday.id, 'halloween')
  assert.equal(d?.stickers.length, 3)
})

t('exactly the 7 dated holidays are flagged', () => {
  const holidays = Object.values(SEASONAL_THEMES_DATA).filter(x => x.isHoliday).map(x => x.id)
  assert.deepEqual(new Set(holidays), new Set([
    'christmas', 'thanksgiving', 'halloween', 'easter', 'valentine', 'stPatricks', 'newYear',
  ]))
})

t('the cluster is stable within a day', () => {
  const a = getHolidayDecoration('halloween', at('2026-10-31T09:00:00'))
  const b = getHolidayDecoration('halloween', at('2026-10-31T23:00:00'))
  assert.deepEqual(a?.stickers.map(s => s.emoji), b?.stickers.map(s => s.emoji))
})

t('the cluster varies across the holiday run', () => {
  const days = ['10-05', '10-11', '10-17', '10-23', '10-29'].map(
    d => getHolidayDecoration('halloween', at(`2026-${d}T12:00:00`))!.stickers.map(s => s.emoji).join(',')
  )
  assert.ok(new Set(days).size > 1, `never varied: ${days[0]}`)
})

t('a cluster never repeats an emoji', () => {
  const cases: Array<[string, string]> = [
    ['halloween', '2026-10-31'], ['christmas', '2026-12-25'], ['valentine', '2026-02-12'],
    ['stPatricks', '2027-03-16'], ['thanksgiving', '2026-11-25'], ['easter', '2026-04-05'],
    ['newYear', '2026-12-30'],
  ]
  for (const [id, iso] of cases) {
    const d = getHolidayDecoration(id, at(`${iso}T12:00:00`))
    assert.ok(d, `${id} produced no decoration`)
    const emoji = d!.stickers.map(s => s.emoji)
    assert.equal(new Set(emoji).size, emoji.length, `${id} repeated: ${emoji.join(',')}`)
  }
})

t('stickers stay in the right-hand strip and stay faint', () => {
  const d = getHolidayDecoration('christmas', CHRISTMAS)!
  for (const s of d.stickers) {
    assert.ok(s.right >= 0 && s.right <= 40, `right ${s.right}% escapes the strip`)
    assert.ok(s.top >= 0 && s.top <= 100, `top ${s.top}% out of bounds`)
    assert.ok(s.opacity > 0 && s.opacity <= 0.25, `opacity ${s.opacity} too strong`)
  }
})

t('every holiday sticker emoji has bundled artwork', async () => {
  // Checked here rather than at runtime: a missing file renders a broken image.
  const { choreIconFile } = await import('@/lib/constants/chore-icon-manifest')
  const missing: string[] = []
  for (const theme of Object.values(SEASONAL_THEMES_DATA).filter(x => x.isHoliday)) {
    for (const e of theme.decorativeIcons ?? [theme.icon]) {
      if (!choreIconFile(e)) missing.push(`${theme.id}:${e}`)
    }
  }
  assert.deepEqual(missing, [], `no artwork for: ${missing.join(', ')}`)
})

t('every holiday declares at least 3 decorations, so all slots fill', () => {
  for (const theme of Object.values(SEASONAL_THEMES_DATA).filter(x => x.isHoliday)) {
    const n = new Set(theme.decorativeIcons ?? []).size
    assert.ok(n >= 3, `${theme.id} declares only ${n}`)
  }
})

t('seasons declare no decorations', () => {
  for (const theme of Object.values(SEASONAL_THEMES_DATA).filter(x => !x.isHoliday)) {
    assert.equal(theme.decorativeIcons, undefined, `${theme.id} should have none`)
  }
})

group('the accent fill pair is wired up and readable')

t('the globals.css defaults clear AA, and match what is committed', () => {
  // Read from the stylesheet so this fails if the defaults are edited to
  // something unreadable, rather than trusting a copy of them here.
  const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8')
  const pairs = [...css.matchAll(/--primary-fill:\s*(#[0-9a-f]{6});[\s\S]{0,120}?--primary-foreground:\s*(#[0-9a-f]{6});/gi)]
  assert.equal(pairs.length, 2, `expected a light and a dark default, found ${pairs.length}`)
  for (const [, fill, fg] of pairs) {
    const r = contrastRatio(fill, fg)
    assert.ok(r >= AA_NORMAL, `default ${fill} on ${fg} is only ${r.toFixed(2)}`)
  }
})

t('the accent utility classes exist for the components that use them', () => {
  const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8')
  for (const cls of ['.badge-accent', '.accent-fill']) {
    assert.ok(css.includes(cls), `${cls} missing from globals.css`)
  }
  // Both must set the pair together — a fill with no ink is the original bug.
  for (const block of ['.badge-accent {', '.accent-fill {']) {
    const start = css.indexOf(block)
    const body = css.slice(start, css.indexOf('}', start))
    assert.ok(body.includes('var(--primary-fill)'), `${block} missing the fill`)
    assert.ok(body.includes('var(--primary-foreground)'), `${block} missing the ink`)
  }
})

t('components consuming the pair actually reference it', () => {
  const files = [
    '../../components/ui/badge.tsx',
    '../../components/ui/checkbox.tsx',
    '../../components/dashboard/dashboard-client.tsx',
  ]
  for (const f of files) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8')
    assert.ok(
      /badge-accent|accent-fill|--primary-fill/.test(src),
      `${f} no longer consumes the accent pair`
    )
  }
})

group('custom accent color')

t('a custom accent outranks a named theme and auto-seasonal', () => {
  const r = resolveActiveTheme(
    { accentColor: '#0ea5e9', seasonalTheme: 'halloween', autoSeasonal: true },
    HALLOWEEN
  )
  assert.equal(r?.source, 'custom')
  assert.equal(r?.id, '#0ea5e9')
})

t('hex is normalized — shorthand and missing hash both work', () => {
  assert.equal(normalizeHex('#ABC'), '#aabbcc')
  assert.equal(normalizeHex('0ea5e9'), '#0ea5e9')
  assert.equal(normalizeHex('  #0EA5E9  '), '#0ea5e9')
})

t('a malformed stored accent is ignored rather than breaking the theme', () => {
  for (const bad of ['', 'red', '#12', '#12345', 'rgb(1,2,3)', null, undefined, 42]) {
    assert.equal(isValidHex(bad), false, `${String(bad)} should be invalid`)
    const r = resolveActiveTheme({ accentColor: bad as never, seasonalTheme: 'ocean' }, AUGUST)
    assert.equal(r?.id, 'ocean', `${String(bad)} should fall through to the named theme`)
  }
})

t('any picked color comes out readable in both modes', () => {
  // Includes deliberately awful picks: near-white, near-black, neon.
  const picks = ['#ffffff', '#000000', '#ffff00', '#00ff00', '#fefefe', '#0a0a0a', '#ff00ff', '#6366f1']
  for (const hex of picks) {
    for (const isDark of [false, true]) {
      const vars = themeCssVars(colorsFromAccent(hex), isDark)
      const surface = isDark ? SURFACE_DARK : SURFACE_LIGHT
      const textRatio = contrastRatio(vars['--primary'], surface)
      const fillRatio = contrastRatio(vars['--primary-fill'], vars['--primary-foreground'])
      assert.ok(textRatio >= AA_NORMAL, `${hex} ${isDark ? 'dark' : 'light'}: text ${textRatio.toFixed(2)}`)
      assert.ok(fillRatio >= AA_NORMAL, `${hex} ${isDark ? 'dark' : 'light'}: fill ${fillRatio.toFixed(2)}`)
    }
  }
})

t('white and black picks are pushed into a usable range, not left as-is', () => {
  const white = themeCssVars(colorsFromAccent('#ffffff'), false)
  assert.notEqual(white['--primary'], '#ffffff')
  const black = themeCssVars(colorsFromAccent('#000000'), true)
  assert.notEqual(black['--primary'], '#000000')
})

group('"None" clears every source of a theme')

t('no accent, no pick, no auto resolves to null', () => {
  const cleared = { seasonalTheme: null, accentColor: null, autoSeasonal: false }
  assert.equal(resolveActiveTheme(cleared, HALLOWEEN), null)
  assert.equal(resolveActiveTheme(cleared, AUGUST), null)
})

t('clearing only the named pick is NOT enough while auto is on', () => {
  // This was the bug: None cleared seasonalTheme, then auto-seasonal
  // immediately re-resolved the current season, so nothing appeared to change.
  const halfCleared = { seasonalTheme: null, autoSeasonal: true }
  assert.notEqual(resolveActiveTheme(halfCleared, AUGUST), null)
  assert.equal(resolveActiveTheme(halfCleared, AUGUST)?.id, 'summer')
})

console.log(`\n${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
