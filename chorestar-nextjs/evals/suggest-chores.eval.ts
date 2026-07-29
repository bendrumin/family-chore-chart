/**
 * Eval harness for the AI chore-suggestion feature.
 *
 * Runs a set of representative child profiles through the real Claude Haiku 4.5
 * path (`lib/ai/suggest-chores`) and asserts the model's output is safe to ship
 * to the UI and database:
 *
 *   • correct count and shape (name / category / icon / rewardCents / reason)
 *   • only known categories
 *   • no duplicates against the child's existing chores
 *   • no duplicates within a single response
 *   • reward within a sane cents range
 *   • non-empty reason
 *
 * Shape/category are also enforced by the Zod schema inside the lib; re-checking
 * here is deliberate — this file is the contract the model must satisfy, and it
 * doubles as a quick way to eyeball age-appropriateness (it prints every set).
 *
 * Run:   npm run eval:ai      (needs ANTHROPIC_API_KEY in .env.local)
 * It exits 0 and skips cleanly when no key is set, so it never hard-fails CI.
 */
import { config } from 'dotenv'
import { AI_CATEGORIES, suggestChoresWithAI } from '../lib/ai/suggest-chores'
import type { SuggestionRequest } from '../lib/utils/chore-suggestions'

// Load .env.local first (where the app's secrets live), then .env as a fallback.
config({ path: '.env.local' })
config()

interface EvalCase {
  label: string
  req: SuggestionRequest
}

const CASES: EvalCase[] = [
  {
    label: 'Young child, no existing chores',
    req: { childName: 'Emma', childAge: 4, existingChoreNames: [], completionRate: 0 },
  },
  {
    label: 'Tween with a full plate, high completion',
    req: {
      childName: 'Liam',
      childAge: 10,
      existingChoreNames: ['Make bed', 'Feed the pet', 'Do homework'],
      completionRate: 88,
    },
  },
  {
    label: 'Teen, near-perfect completion',
    req: { childName: 'Ava', childAge: 15, existingChoreNames: ['Take out trash'], completionRate: 96 },
  },
  {
    label: 'Unknown age, middling completion',
    req: { childName: 'Max', childAge: null, existingChoreNames: [], completionRate: 45 },
  },
]

const CATEGORY_SET = new Set<string>(AI_CATEGORIES)
const EXPECTED_COUNT = 5

function checkCase(req: SuggestionRequest, suggestions: Awaited<ReturnType<typeof suggestChoresWithAI>>): string[] {
  const failures: string[] = []
  const existing = new Set(req.existingChoreNames.map((n) => n.toLowerCase().trim()))
  const seen = new Set<string>()

  if (suggestions.length === 0 || suggestions.length > EXPECTED_COUNT) {
    failures.push(`expected 1-${EXPECTED_COUNT} suggestions, got ${suggestions.length}`)
  }

  for (const s of suggestions) {
    if (!s.name?.trim()) failures.push('empty name')
    if (!CATEGORY_SET.has(s.category)) failures.push(`unknown category "${s.category}" for "${s.name}"`)
    if (!s.icon?.trim()) failures.push(`missing icon for "${s.name}"`)
    if (!s.reason?.trim()) failures.push(`empty reason for "${s.name}"`)
    if (!Number.isFinite(s.rewardCents) || s.rewardCents < 1 || s.rewardCents > 500) {
      failures.push(`reward out of range (${s.rewardCents}) for "${s.name}"`)
    }
    const key = s.name?.toLowerCase().trim()
    if (key && existing.has(key)) failures.push(`suggested a chore the child already has: "${s.name}"`)
    if (key && seen.has(key)) failures.push(`duplicate suggestion within the set: "${s.name}"`)
    if (key) seen.add(key)
  }

  return failures
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    console.log('⏭  ANTHROPIC_API_KEY not set — skipping AI evals (this is not a failure).')
    process.exit(0)
  }

  console.log(`Running ${CASES.length} eval case(s) against Claude Haiku 4.5...\n`)
  let failed = 0

  for (const { label, req } of CASES) {
    try {
      const suggestions = await suggestChoresWithAI(req)
      const failures = checkCase(req, suggestions)
      const status = failures.length === 0 ? '✅ PASS' : '❌ FAIL'
      console.log(`${status}  ${label}`)
      for (const s of suggestions) {
        console.log(`        • ${s.icon} ${s.name}  [${s.category}, ${s.rewardCents}¢]  — ${s.reason}`)
      }
      for (const f of failures) console.log(`        ↳ ${f}`)
      if (failures.length > 0) failed++
    } catch (err) {
      console.log(`❌ FAIL  ${label}`)
      console.log(`        ↳ threw: ${err instanceof Error ? err.message : String(err)}`)
      failed++
    }
    console.log('')
  }

  if (failed > 0) {
    console.log(`${failed}/${CASES.length} case(s) failed.`)
    process.exit(1)
  }
  console.log(`All ${CASES.length} case(s) passed.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Eval runner crashed:', err)
  process.exit(1)
})
