/**
 * Contrast tests for every theme. Run with `npm run test:unit`.
 *
 * Theme accents are picked for character, not legibility: 67 of the 84 raw
 * accent colors fail 4.5:1 against white text. These tests assert that what the
 * app actually renders — the derived tokens, not the raw accents — is readable.
 */
import assert from 'node:assert/strict'
import {
  contrastRatio,
  ensureReadable,
  bestForeground,
  relativeLuminance,
  SURFACE_LIGHT,
  SURFACE_DARK,
  AA_NORMAL,
} from './contrast'
import { themeCssVars } from './resolve-theme'
import { THEME_COLORS } from '@/lib/constants/seasonal-themes'
import { TIME_THEMES } from '@/lib/constants/time-themes'

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

const ALL_THEMES = {
  ...THEME_COLORS,
  ...Object.fromEntries(Object.entries(TIME_THEMES).map(([k, v]) => [`time-${k}`, v.colors])),
}

group('the contrast maths')

t('known WCAG ratios come out right', () => {
  assert.equal(Math.round(contrastRatio('#ffffff', '#000000')), 21)
  assert.equal(Math.round(contrastRatio('#ffffff', '#ffffff')), 1)
  // #767676 on white is the canonical 4.54:1 boundary case.
  assert.ok(Math.abs(contrastRatio('#767676', '#ffffff') - 4.54) < 0.05)
})

t('ratio is symmetric', () => {
  assert.equal(contrastRatio('#ff6600', '#ffffff'), contrastRatio('#ffffff', '#ff6600'))
})

t('shorthand hex parses', () => {
  assert.equal(relativeLuminance('#fff'), relativeLuminance('#ffffff'))
})

t('ensureReadable leaves an already-passing color alone', () => {
  assert.equal(ensureReadable('#165b33', SURFACE_LIGHT), '#165b33')
})

t('ensureReadable darkens a pale color on a light surface', () => {
  const fixed = ensureReadable('#ffd700', SURFACE_LIGHT) // summer gold, 1.44:1 raw
  assert.ok(contrastRatio(fixed, SURFACE_LIGHT) >= AA_NORMAL, `got ${contrastRatio(fixed, SURFACE_LIGHT)}`)
  assert.ok(relativeLuminance(fixed) < relativeLuminance('#ffd700'))
})

t('ensureReadable lightens a dark color on a dark surface', () => {
  const fixed = ensureReadable('#1a1a1a', SURFACE_DARK) // halloween black on gray-800
  assert.ok(contrastRatio(fixed, SURFACE_DARK) >= AA_NORMAL, `got ${contrastRatio(fixed, SURFACE_DARK)}`)
  assert.ok(relativeLuminance(fixed) > relativeLuminance('#1a1a1a'))
})

t('bestForeground picks ink for pale fills and white for deep ones', () => {
  assert.equal(bestForeground('#ffd700'), '#111827')
  assert.equal(bestForeground('#165b33'), '#ffffff')
})

group('every theme renders readable text (--primary on the page surface)')

for (const mode of ['light', 'dark'] as const) {
  const surface = mode === 'dark' ? SURFACE_DARK : SURFACE_LIGHT
  t(`${mode} mode: --primary and --secondary clear AA on the page for all ${Object.keys(ALL_THEMES).length} themes`, () => {
    const failures: string[] = []
    for (const [id, colors] of Object.entries(ALL_THEMES)) {
      const vars = themeCssVars(colors, mode === 'dark')
      for (const token of ['--primary', '--secondary'] as const) {
        const ratio = contrastRatio(vars[token], surface)
        if (ratio < AA_NORMAL) failures.push(`${id}${token} ${vars[token]} ${ratio.toFixed(2)}`)
      }
    }
    assert.deepEqual(failures, [], `failing: ${failures.join(', ')}`)
  })
}

group('every theme renders readable ink on its fills')

for (const mode of ['light', 'dark'] as const) {
  t(`${mode} mode: --primary-foreground clears AA on --primary-fill everywhere`, () => {
    const failures: string[] = []
    for (const [id, colors] of Object.entries(ALL_THEMES)) {
      const vars = themeCssVars(colors, mode === 'dark')
      for (const [fill, fg] of [
        ['--primary-fill', '--primary-foreground'],
        ['--secondary-fill', '--secondary-foreground'],
      ] as const) {
        const ratio = contrastRatio(vars[fill], vars[fg])
        if (ratio < AA_NORMAL) failures.push(`${id}${fill} ${vars[fill]} vs ${vars[fg]} = ${ratio.toFixed(2)}`)
      }
    }
    assert.deepEqual(failures, [], `failing: ${failures.join(', ')}`)
  })
}

group('gradients — one ink across two stops')

const GRADIENT_STOPS = /#[0-9a-f]{6}/gi

for (const mode of ['light', 'dark'] as const) {
  t(`${mode} mode: --gradient-foreground clears full AA (4.5:1) on every stop`, () => {
    const failures: string[] = []
    for (const [id, colors] of Object.entries(ALL_THEMES)) {
      const vars = themeCssVars(colors, mode === 'dark')
      const stops = vars['--gradient-primary'].match(GRADIENT_STOPS) ?? []
      assert.ok(stops.length >= 2, `${id} gradient had no parseable stops`)
      for (const stop of stops) {
        const ratio = contrastRatio(stop, vars['--gradient-foreground'])
        if (ratio < AA_NORMAL) failures.push(`${id} ${stop} vs ${vars['--gradient-foreground']} = ${ratio.toFixed(2)}`)
      }
    }
    assert.deepEqual(failures, [], `failing: ${failures.join(', ')}`)
  })

  t(`${mode} mode: the themed gradient is single-hue, not two clashing accents`, () => {
    for (const [id, colors] of Object.entries(ALL_THEMES)) {
      const vars = themeCssVars(colors, mode === 'dark')
      const stops = vars['--gradient-primary'].match(GRADIENT_STOPS) ?? []
      // Both stops must be near-identical in luminance-independent hue: the
      // second is derived from the first, so their channel ordering matches.
      const [a, b] = stops as [string, string]
      const rank = (h: string) => {
        const [r, g, bl] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
        return [r > g, g > bl, r > bl].join(',')
      }
      assert.equal(rank(a), rank(b), `${id} gradient stops have different hue ordering: ${a} -> ${b}`)
    }
  })
}

// Reported, not asserted: this is the structural argument for solid fills.
group('report: can a two-stop gradient ever reach AA for normal text?')

const gradientVerdicts: string[] = []
for (const mode of ['light', 'dark'] as const) {
  let solvable = 0
  const unsolvable: string[] = []
  for (const [id, colors] of Object.entries(ALL_THEMES)) {
    const { primary, secondary } = mode === 'dark' ? colors.dark : colors.light
    const works = ['#ffffff', '#111827'].some(
      ink => contrastRatio(primary, ink) >= AA_NORMAL && contrastRatio(secondary, ink) >= AA_NORMAL
    )
    if (works) solvable++
    else unsolvable.push(id)
  }
  const total = Object.keys(ALL_THEMES).length
  gradientVerdicts.push(
    `  ${mode}: ${solvable}/${total} gradients can reach 4.5:1 with a single ink; ${unsolvable.length} cannot`
  )
  if (unsolvable.length) gradientVerdicts.push(`    unsolvable: ${unsolvable.join(', ')}`)

  // A solid fill is always solvable, by construction.
  let solidSolvable = 0
  for (const colors of Object.values(ALL_THEMES)) {
    const { primary } = mode === 'dark' ? colors.dark : colors.light
    if (contrastRatio(primary, bestForeground(primary)) >= AA_NORMAL) solidSolvable++
  }
  gradientVerdicts.push(`  ${mode}: ${solidSolvable}/${total} SOLID fills reach 4.5:1`)
}
console.log(gradientVerdicts.join('\n'))

console.log(`\n${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
