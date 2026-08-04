/**
 * Theme resolution, accent contrast, and holiday sticker tests.
 * Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import {
  THEME_COLORS,
  SEASONAL_THEMES_DATA,
  ACCENT_THEMES,
  getCurrentSeasonalTheme,
  seasonalWindowLength,
  isWithinSeasonalWindow,
} from '@/lib/constants/seasonal-themes'
import {
  resolveActiveTheme,
  themeCssVars,
  themeVarsFor,
  colorsFromAccent,
  resolveHeaderInk,
  THEME_CSS_VAR_NAMES,
  THEME_PALETTE_VAR_NAMES,
} from './resolve-theme'
import {
  accentScale,
  accentScaleCssVars,
  hexToRgbTriplet,
  ACCENT_STEPS,
  ACCENT_SCALE_VAR_NAMES,
  DEFAULT_ACCENT,
} from './accent-scale'
import {
  contrastRatio,
  ensureReadable,
  bestForeground,
  accessiblePair,
  hoverFill,
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

t('the exposed tokens are accents and the ramp — never a surface', () => {
  assert.deepEqual(new Set(THEME_CSS_VAR_NAMES), new Set([
    '--primary', '--secondary',
    '--primary-fill', '--secondary-fill',
    '--primary-foreground', '--secondary-foreground',
    '--seasonal-accent', '--seasonal-secondary',
    '--primary-fill-hover',
    ...THEME_PALETTE_VAR_NAMES,
    ...ACCENT_SCALE_VAR_NAMES,
  ]))
  // The palette roles must be in the clear list even though themeCssVars only
  // emits them for themes that declare one. Leaving them out would strand a
  // previous theme's tint on the backdrop after switching to an untinted theme.
  for (const name of THEME_PALETTE_VAR_NAMES) {
    assert.ok(THEME_CSS_VAR_NAMES.includes(name), `${name} would never be cleared`)
  }
  // The ramp reaches compiled utility classes, but no full-bleed surface
  // property is ever themed directly.
  for (const banned of ['--gradient-primary', '--header-gradient', '--gradient-bg', '--seasonal-gradient']) {
    assert.ok(!THEME_CSS_VAR_NAMES.includes(banned), `${banned} must not be themed`)
  }
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

t('every theme id resolves to a valid color pair', () => {
  const ids = [
    ...Object.values(SEASONAL_THEMES_DATA).map(x => x.id),
    ...Object.values(ACCENT_THEMES).map(x => x.id),
  ]
  // Count is asserted so a theme added to one table but not THEME_COLORS is
  // caught; bump it deliberately when adding themes.
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
  const pairs = [...css.matchAll(/--primary-fill:\s*(#[0-9a-f]{6});[\s\S]{0,400}?--primary-foreground:\s*(#[0-9a-f]{6});/gi)]
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

group('accent ramp')

t('the ramp covers every Tailwind step, monotonically light to dark', () => {
  const scale = accentScale('#0ea5e9')
  assert.equal(Object.keys(scale).length, 10)
  let prev = Infinity
  for (const step of ACCENT_STEPS) {
    const lum = relativeLuminance(scale[step])
    assert.ok(lum < prev, `step ${step} is not darker than the previous`)
    prev = lum
  }
})

t('500 is exactly the picked color', () => {
  assert.equal(accentScale('#0ea5e9')[500], '#0ea5e9')
  assert.equal(accentScale('#ff6600')[500], '#ff6600')
})

t('the default ramp is close to real Tailwind indigo', () => {
  // Not identical — globals.css ships Tailwind's exact values as the default so
  // an unthemed app is pixel-identical. This just guards against drift.
  const gen = accentScale(DEFAULT_ACCENT)
  const dist = (a: string, b: string) => {
    const px = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
    const [x, y] = [px(a), px(b)]
    return Math.sqrt(x.reduce((sum, v, i) => sum + (v - y[i]) ** 2, 0))
  }
  assert.ok(dist(gen[500], '#6366f1') === 0)
  assert.ok(dist(gen[400], '#818cf8') < 45, 'ramp shape drifted from indigo')
  assert.ok(dist(gen[700], '#4338ca') < 45, 'ramp shape drifted from indigo')
})

t('a malformed accent falls back to the default ramp', () => {
  for (const bad of ['', 'nope', '#12345']) {
    assert.equal(accentScale(bad)[500], DEFAULT_ACCENT)
  }
})

t('css vars are RGB triplets, as Tailwind alpha syntax needs', () => {
  assert.equal(hexToRgbTriplet('#6366f1'), '99 102 241')
  const vars = accentScaleCssVars('#0ea5e9')
  assert.deepEqual(Object.keys(vars).sort(), [...ACCENT_SCALE_VAR_NAMES].sort())
  for (const [name, value] of Object.entries(vars)) {
    assert.match(value, /^\d{1,3} \d{1,3} \d{1,3}$/, `${name} is not an RGB triplet`)
  }
})

t('the tailwind config points both palettes at the ramp', () => {
  const cfg = readFileSync(new URL('../../tailwind.config.ts', import.meta.url), 'utf8')
  for (const palette of ['indigo:', 'purple:']) {
    assert.ok(cfg.includes(palette), `${palette} not remapped`)
  }
  for (const step of ACCENT_STEPS) {
    assert.ok(
      cfg.includes(`rgb(var(--accent-${step}) / <alpha-value>)`),
      `step ${step} missing from the config`
    )
  }
})

t('globals.css defines a default for every ramp step', () => {
  const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8')
  for (const step of ACCENT_STEPS) {
    assert.match(
      css,
      new RegExp(`--accent-${step}:\\s*\\d{1,3} \\d{1,3} \\d{1,3};`),
      `--accent-${step} has no default, so the class would render nothing`
    )
  }
})

group('reach: a picked theme repaints, an automatic one does not')

t('a custom accent and a named pick are full reach', () => {
  assert.equal(resolveActiveTheme({ accentColor: '#0ea5e9' }, AUGUST)?.fullReach, true)
  assert.equal(resolveActiveTheme({ seasonalTheme: 'halloween' }, AUGUST)?.fullReach, true)
})

t('auto-seasonal is NOT full reach — this is the yellow-August guard', () => {
  const auto = resolveActiveTheme({ autoSeasonal: true }, AUGUST)
  assert.equal(auto?.id, 'summer')
  assert.equal(auto?.fullReach, false)
})

t('only a full-reach theme writes the accent ramp', () => {
  const picked = resolveActiveTheme({ accentColor: '#0ea5e9' }, AUGUST)!
  const auto = resolveActiveTheme({ autoSeasonal: true }, AUGUST)!
  const pickedVars = themeVarsFor(picked, false)
  const autoVars = themeVarsFor(auto, false)
  for (const name of ACCENT_SCALE_VAR_NAMES) {
    assert.ok(pickedVars[name], `picked theme should set ${name}`)
    assert.equal(autoVars[name], undefined, `auto theme must not set ${name}`)
  }
})

t('clearing covers the ramp too, so switching reach leaves nothing behind', () => {
  for (const name of ACCENT_SCALE_VAR_NAMES) {
    assert.ok(THEME_CSS_VAR_NAMES.includes(name), `${name} would be left stranded`)
  }
})

group('header ink')

t('light mode uses the accent foreground, never hardcoded white', () => {
  const ink = resolveHeaderInk({ accentColor: '#ffd700' }, false)
  assert.equal(ink.color, 'var(--primary-foreground)')
  // Gold needs a dark logo; white would vanish.
  assert.equal(ink.logo, 'default')
})

t('a deep accent keeps the white logo', () => {
  assert.equal(resolveHeaderInk({ accentColor: '#312e81' }, false).logo, 'white')
})

t('dark mode keeps a neutral header with accent text', () => {
  const ink = resolveHeaderInk({ accentColor: '#ffd700' }, true)
  assert.equal(ink.color, 'var(--primary)')
  assert.equal(ink.logo, 'white')
})

t('an accent-only theme does not restyle the header', () => {
  const ink = resolveHeaderInk({ autoSeasonal: true }, false, AUGUST)
  assert.equal(ink.logo, 'white')
})

group('no gradients remain in the brand tokens')

t('brand.ts exposes solid colors, not gradients', () => {
  const src = readFileSync(new URL('../constants/brand.ts', import.meta.url), 'utf8')
  assert.ok(!/linear-gradient/.test(src), 'brand.ts still defines a gradient')
  assert.ok(src.includes("color: 'var(--primary)'"), 'GRADIENT_TEXT is not a solid color')
})

t('an accent surface always ships its ink alongside the fill', () => {
  const src = readFileSync(new URL('../constants/brand.ts', import.meta.url), 'utf8')
  const start = src.indexOf('ACCENT_SURFACE_STYLE = {')
  const body = src.slice(start, src.indexOf('}', start))
  assert.ok(body.includes('--primary-fill'))
  assert.ok(body.includes('--primary-foreground'))
})

t('the only linear-gradients left in globals.css are the functional ones', () => {
  const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8')
  const found = css.match(/linear-gradient\([^)]*/g) ?? []
  // shimmer sweep (90deg), checkerboard x2 (45deg), kid-mode background.
  assert.ok(found.length <= 4, `${found.length} gradients remain: ${found.join(' | ')}`)
  for (const g of found) {
    assert.ok(
      /90deg|45deg|#667eea/.test(g),
      `unexpected decorative gradient survived: ${g}`
    )
  }
})

group('accent fills derive their ink, so any palette color is usable')

t('no hardcoded white sits on an accent fill', () => {
  // This replaces an older rule that every accent must be dark enough for white
  // text. That rule was only necessary because elements hardcoded `text-white`
  // on bg-indigo-500 — a literal class no downstream correction can reach — and
  // it forced every photo-derived palette color to be darkened away from what
  // the designer picked. The classes are gone, so the constraint is gone with
  // them. Guard it here, since one careless `text-white bg-indigo-500` would
  // silently reintroduce the whole problem.
  const roots = ['../../app', '../../components']
  const offenders: string[] = []
  // Excludes an opacity modifier: bg-indigo-900/20 is a subtle wash behind
  // page-colored text, not a fill the text sits on.
  const ACCENT_BG = /bg-(indigo|purple)-(400|500|600|700|800|900)(?![\d/])/
  const walk = (dir: URL) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, dir)
      if (entry.isDirectory()) { walk(child); continue }
      if (!/\.tsx?$/.test(entry.name)) continue
      const src = readFileSync(child, 'utf8')
      src.split('\n').forEach((line, i) => {
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) return
        if (ACCENT_BG.test(line) && /text-white/.test(line)) {
          offenders.push(`${entry.name}:${i + 1}`)
        }
      })
    }
  }
  for (const r of roots) walk(new URL(r + '/', import.meta.url))
  assert.deepEqual(offenders, [],
    `hardcoded white on an accent fill — use .accent-fill so the ink is derived: ${offenders.join(', ')}`)
})

t('every ramp step ships an ink that passes, whatever the accent', () => {
  // The real invariant now: not "white works" but "SOMETHING works". Every step
  // of every theme's ramp must have a readable pair available.
  const failures: string[] = []
  for (const [id, colors] of Object.entries(THEME_COLORS)) {
    const ramp = accentScale(colors.light.primary)
    for (const step of ACCENT_STEPS) {
      const pair = accessiblePair(ramp[step])
      const r = contrastRatio(pair.fill, pair.foreground)
      if (r < AA_NORMAL) failures.push(`${id}@${step} ${r.toFixed(2)}`)
    }
  }
  assert.deepEqual(failures, [], `no readable ink for: ${failures.join(', ')}`)
})

t('the true palette colors survive undarkened, because the ink is derived', () => {
  // The point of the whole change: #3a9aa3 is 3.32:1 on white — it would have
  // been rejected before — but 5.35:1 with the ink actually used.
  for (const [id, expected] of [['summer', '#3a9aa3'], ['spring', '#ee3c6b']] as const) {
    assert.equal(THEME_COLORS[id].light.primary, expected,
      `${id} anchor was altered away from the designer's color`)
    const pair = accessiblePair(expected)
    assert.ok(contrastRatio(pair.fill, pair.foreground) >= AA_NORMAL)
    assert.ok(contrastRatio(expected, '#ffffff') < AA_NORMAL,
      `${id} would have passed the old white-text rule, so it proves nothing`)
  }
})

t('a hover fill moves away from its ink, so contrast never drops', () => {
  for (const base of ['#5e61e5', '#f1c8c1', '#3a9aa3', '#ffd700', '#1a22b0']) {
    const pair = accessiblePair(base)
    const hover = hoverFill(pair.fill, pair.foreground)
    const atRest = contrastRatio(pair.fill, pair.foreground)
    const onHover = contrastRatio(hover, pair.foreground)
    assert.ok(onHover >= atRest - 0.01, `${base}: hover ${onHover.toFixed(2)} < rest ${atRest.toFixed(2)}`)
    assert.ok(onHover >= AA_NORMAL, `${base}: hover only ${onHover.toFixed(2)}:1`)
    assert.notEqual(hover.toLowerCase(), pair.fill.toLowerCase(), `${base}: hover is not visually distinct`)
  }
})

t('the globals.css hover defaults match hoverFill of each mode fill', () => {
  const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8')
  for (const [fill, expectedVar] of [['#5e61e5', 0], ['#4f46e5', 1]] as const) {
    const pair = accessiblePair(fill)
    const want = hoverFill(pair.fill, pair.foreground).toLowerCase()
    const found = [...css.matchAll(/--primary-fill-hover:\s*(#[0-9a-fA-F]{6})/g)].map(m => m[1].toLowerCase())
    assert.ok(found[expectedVar] === want,
      `--primary-fill-hover #${expectedVar} is ${found[expectedVar]}, expected ${want} for base ${fill}`)
  }
})

t('even a bright yellow accent gets a readable pair now', () => {
  // #ffd700 is the color that produced the white-on-yellow hero. It is still
  // 1.40:1 against white — but it no longer has to take white, and the derived
  // ink handles it. This is what makes the new rule strictly stronger than the
  // old "only allow deep accents" one.
  const ramp = accentScale('#ffd700')
  assert.ok(contrastRatio(ramp[500], '#ffffff') < AA_NORMAL, 'sanity: yellow still fails white')
  for (const step of ACCENT_STEPS) {
    const pair = accessiblePair(ramp[step])
    assert.ok(contrastRatio(pair.fill, pair.foreground) >= AA_NORMAL, `yellow@${step} has no readable ink`)
  }
})

t('every FILL role is a single hue — light and dark slots share the accent ramp', () => {
  // Themes may now declare a decorative second hue, but nothing that carries
  // text is allowed off the accent's own ramp. That was the invariant broken by
  // Halloween orange sitting next to brand purple.
  for (const [id, colors] of Object.entries(THEME_COLORS)) {
    const ramp = accentScale(colors.light.primary)
    assert.equal(colors.light.secondary, ramp[700], `${id} light secondary is off-ramp`)
    assert.equal(colors.dark.primary, ramp[400], `${id} dark primary is off-ramp`)
    assert.equal(colors.dark.secondary, ramp[300], `${id} dark secondary is off-ramp`)
  }
})

t('a declared tint never becomes a fill, and always ships readable ink', () => {
  const tinted = Object.entries(THEME_COLORS).filter(([, c]) => c.tint || c.highlight)
  assert.ok(tinted.length > 0, 'no theme declares a palette role — this test is vacuous')

  for (const [id, colors] of tinted) {
    for (const isDark of [false, true]) {
      // Via themeVarsFor with fullReach — the roles are deliberately absent from
      // themeCssVars, see paletteRoleVars.
      const vars = themeVarsFor(
        { id, name: id, source: 'manual', colors, fullReach: true }, isDark)
      const fills = [vars['--primary-fill'], vars['--secondary-fill'], vars['--primary'], vars['--secondary']]

      for (const role of ['tint', 'highlight'] as const) {
        const hex = colors[role]
        if (!hex) continue
        assert.ok(normalizeHex(hex), `${id} ${role} is not a valid hex: ${hex}`)
        // The whole point of the role: decoration only.
        for (const fill of fills) {
          assert.notEqual(fill?.toLowerCase(), hex.toLowerCase(),
            `${id} ${role} leaked into a fill role — palette colors are too pale to carry text`)
        }
        // Emitted as a space-separated RGB triplet so `rgb(var(...) / 0.4)` works.
        const triplet = vars[`--accent-${role}`]
        assert.match(triplet, /^\d{1,3} \d{1,3} \d{1,3}$/, `${id} --accent-${role} is not an RGB triplet: ${triplet}`)
        // Fill and ink travel together, same rule as .accent-fill. Compare the
        // EMITTED fill, not the declared hex — accessiblePair may have darkened
        // a borderline color to make the pair pass.
        const ink = vars[`--accent-${role}-ink`]
        const [r, g, b] = triplet.split(' ').map(Number)
        const emitted = `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
        assert.ok(contrastRatio(emitted, ink) >= AA_NORMAL,
          `${id} ${role} pair only reaches ${contrastRatio(emitted, ink).toFixed(2)}:1`)
      }
    }
  }
})

t('auto-seasonal emits NO second hue, so the backdrop cannot go half-themed', () => {
  // An accent-only theme leaves the Tailwind ramp on brand indigo. Emitting a
  // tint there would paint one blush blob beside two indigo ones — the exact
  // "themed next to unthemed" mismatch, arriving unannounced on the first day of
  // a season. That silent-on-a-date failure mode is how the yellow dashboard
  // happened, so the second hue is reserved for a theme the user picked.
  const summer = THEME_COLORS['summer']
  assert.ok(summer.tint, 'summer should declare a tint for this test to mean anything')

  for (const isDark of [false, true]) {
    const auto = themeVarsFor(
      { id: 'summer', name: 'Summer', source: 'auto-seasonal', colors: summer, fullReach: false }, isDark)
    for (const name of THEME_PALETTE_VAR_NAMES) {
      assert.ok(!(name in auto), `auto-seasonal leaked ${name}`)
    }
    // And nothing rewrote the ramp either.
    for (const name of ACCENT_SCALE_VAR_NAMES) {
      assert.ok(!(name in auto), `auto-seasonal leaked ${name}`)
    }

    // Picked by hand, the same theme does bring its second hue.
    const picked = themeVarsFor(
      { id: 'summer', name: 'Summer', source: 'manual', colors: summer, fullReach: true }, isDark)
    assert.ok('--accent-tint' in picked, 'a hand-picked theme should carry its tint')
  }
})

t('an untinted theme emits no palette roles at all', () => {
  // Otherwise the clear-then-set cycle would paint a stale or default tint.
  const plain = THEME_COLORS['ocean']
  assert.ok(plain && !plain.tint, 'expected ocean to be untinted')
  for (const isDark of [false, true]) {
    const vars = themeVarsFor(
      { id: 'ocean', name: 'ocean', source: 'manual', colors: plain, fullReach: true }, isDark)
    for (const name of THEME_PALETTE_VAR_NAMES) {
      assert.ok(!(name in vars), `untinted theme still emitted ${name}`)
    }
  }
})

t('the tinted blob falls back to the ramp, so untinted themes keep their color', () => {
  const raw = readFileSync(new URL('../../components/ui/ambient-background.tsx', import.meta.url), 'utf8')
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const tintUse = src.match(/var\(--accent-tint[^)]*\)/g) ?? []
  assert.ok(tintUse.length > 0, 'no blob uses the tint')
  for (const use of tintUse) {
    // An undefined var() invalidates the declaration and drops the property
    // entirely — the blob would lose its background, not fall back to a default.
    assert.ok(use.includes(','), `--accent-tint used with no fallback: ${use}`)
  }
})

t('the ambient backdrop draws every blob from the ramp', () => {
  const raw = readFileSync(new URL('../../components/ui/ambient-background.tsx', import.meta.url), 'utf8')
  // Strip comments — the file documents the old bug by name.
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  assert.ok(!/var\(--primary-light\)|var\(--primary-dark\)/.test(src),
    'a blob still uses an unthemed variable, which is what mixed yellow with indigo')
  const blobs = src.match(/background: '[^']*'/g) ?? []
  assert.ok(blobs.length >= 3, 'expected three blobs')
  for (const b of blobs) {
    assert.ok(b.includes('var(--accent-'), `blob not on the ramp: ${b}`)
  }
})

t('the hero derives its ink instead of hardcoding white', () => {
  const src = readFileSync(new URL('../../components/dashboard/dashboard-hero.tsx', import.meta.url), 'utf8')
  const code = src.split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
  assert.ok(!/text-white|bg-white|stroke="#fff"/.test(code), 'hero still hardcodes white')
  assert.ok(code.includes("color: 'var(--primary-foreground)'"), 'hero ink is not derived')
})

t('a completed day cell follows the theme, with no hardcoded green or white', () => {
  const raw = readFileSync(new URL('../../components/chores/chore-card.tsx', import.meta.url), 'utf8')
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  assert.ok(!src.includes('gradient-success'), 'still uses the fixed green')
  assert.ok(!/text-white/.test(src), 'still hardcodes white on the completed cell')
  assert.ok(src.includes('accent-fill'), 'completed cell is not on the accent pair')
})

t('the retired success/warning vars are gone from globals.css', () => {
  const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8')
  for (const dead of ['--gradient-success:', '--gradient-warning:']) {
    assert.ok(!css.includes(dead), `${dead} is still defined but nothing reads it`)
  }
})

console.log(`\n${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
