/**
 * Regenerates lib/constants/chore-icon-manifest.ts from whatever SVGs are
 * actually in public/icons/chores-color/.
 *
 * The manifest is the lookup ChoreIcon uses to decide between bundled artwork
 * and a native-emoji fallback, so a hand-edited list can silently drift from
 * the files on disk — an entry with no file renders a broken image, a file with
 * no entry never gets used. Run this after adding or removing icons:
 *
 *   npm run icons:manifest
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const ICON_DIR = path.join(ROOT, 'public/icons/chores-color')
const MANIFEST = path.join(ROOT, 'lib/constants/chore-icon-manifest.ts')

const codepoints = fs
  .readdirSync(ICON_DIR)
  .filter(f => f.endsWith('.svg'))
  .map(f => f.replace(/\.svg$/, ''))
  .sort()

const invalid = codepoints.filter(c => !/^[0-9A-F]+(-[0-9A-F]+)*$/.test(c))
if (invalid.length) {
  console.error(`Filenames are not uppercase hex codepoints: ${invalid.join(', ')}`)
  process.exit(1)
}

// FE0F is stripped when looking up, so a file named for it could never be found.
const unreachable = codepoints.filter(c => c.split('-').includes('FE0F'))
if (unreachable.length) {
  console.error(
    `These filenames contain FE0F, which choreIconFile() strips, so they are ` +
      `unreachable — rename them without it: ${unreachable.join(', ')}`
  )
  process.exit(1)
}

const body = codepoints.map(c => `  '${c}',`).join('\n')

const out = `// Generated from OpenMoji 15.1.0 (CC BY-SA 4.0) — https://openmoji.org
// GENERATED FILE — do not edit by hand. Run \`npm run icons:manifest\`.
// Filenames of the bundled full-color chore icons under public/icons/chores-color/.
const CHORE_ICON_FILES = new Set<string>([
${body}
])

/**
 * Maps an emoji to its bundled OpenMoji filename (without extension),
 * or null when we have no artwork for it (caller falls back to native emoji).
 */
export function choreIconFile(emoji: string | null | undefined): string | null {
  if (!emoji) return null
  const codepoints: string[] = []
  for (const ch of emoji) {
    const cp = ch.codePointAt(0)
    if (cp === undefined || cp === 0xfe0f) continue
    codepoints.push(cp.toString(16).toUpperCase())
  }
  const file = codepoints.join('-')
  return CHORE_ICON_FILES.has(file) ? file : null
}
`

const previous = fs.existsSync(MANIFEST) ? fs.readFileSync(MANIFEST, 'utf8') : ''
fs.writeFileSync(MANIFEST, out)

const before = (previous.match(/^\s*'[0-9A-F-]+',$/gm) || []).length
console.log(
  `chore-icon-manifest.ts: ${codepoints.length} icons (was ${before})` +
    (out === previous ? ' — unchanged' : '')
)
