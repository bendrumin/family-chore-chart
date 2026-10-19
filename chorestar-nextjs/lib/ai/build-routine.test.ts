/**
 * Unit tests for "Build with AI" routines. The Anthropic API is never called:
 * the AI path gets a fake client. Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import {
  buildRoutineWithAI,
  buildRoutineFromTemplates,
  buildRoutinePrompt,
  sanitizeRoutineDraft,
  guessRoutineType,
  AIRoutineError,
  AI_MODEL,
  MAX_DRAFT_STEPS,
  type MessagesClient,
} from './build-routine'
import { ROUTINE_ICONS } from '../constants/routine-icons'

let passed = 0
let failed = 0
const pending: Array<Promise<void>> = []
function t(name: string, fn: () => void | Promise<void>) {
  const run = async () => {
    try {
      await fn()
      passed++
      console.log(`  ok    ${name}`)
    } catch (err) {
      failed++
      console.log(`  FAIL  ${name}`)
      console.log(`        ${(err as Error).message.split('\n')[0]}`)
    }
  }
  pending.push(run())
}

function fakeClient(payload: unknown, seen?: { params?: any }): MessagesClient {
  return {
    messages: {
      create: async (params: any) => {
        if (seen) seen.params = params
        if (payload instanceof Error) throw payload
        return { content: [{ type: 'text', text: typeof payload === 'string' ? payload : JSON.stringify(payload) }] }
      },
    },
  }
}

const GOOD = {
  name: 'School Morning',
  type: 'morning',
  icon: 'wake-up',
  tip: 'Teeth come right after breakfast so they are not forgotten.',
  steps: [
    { title: 'Get dressed', icon: 'get-dressed', minutes: 5 },
    { title: 'Eat breakfast', icon: 'eat-breakfast', minutes: 15 },
    { title: 'Brush teeth', icon: 'brush-teeth', minutes: 2 },
    { title: 'Shoes on', icon: 'put-on-shoes', minutes: 2 },
  ],
}

// --- AI path (mocked) -------------------------------------------------------

t('AI draft comes back cleaned, with seconds and a type color', async () => {
  const seen: { params?: any } = {}
  const draft = await buildRoutineWithAI({ goal: 'get ready for school, 7, forgets teeth', childAge: 7 }, fakeClient(GOOD, seen))
  assert.equal(draft.name, 'School Morning')
  assert.equal(draft.type, 'morning')
  assert.equal(draft.color, '#fbbf24')
  assert.equal(draft.steps.length, 4)
  assert.deepEqual(draft.steps[2], { title: 'Brush teeth', icon: 'brush-teeth', duration_seconds: 120 })
  assert.equal(seen.params.model, AI_MODEL)
  assert.equal(seen.params.output_config.format.type, 'json_schema')
})

t('the schema restricts icons to the app icon set', async () => {
  const seen: { params?: any } = {}
  await buildRoutineWithAI({ goal: 'bedtime' }, fakeClient(GOOD, seen))
  const stepIcon = seen.params.output_config.format.schema.properties.steps.items.properties.icon
  assert.deepEqual(new Set(stepIcon.enum), new Set(Object.keys(ROUTINE_ICONS)))
})

t('AI uses the model id shared with suggest-chores', () => assert.equal(AI_MODEL, 'claude-haiku-4-5'))

t('unknown icons, duplicates and blank titles are cleaned', async () => {
  const draft = await buildRoutineWithAI(
    { goal: 'x' },
    fakeClient({
      ...GOOD,
      steps: [
        { title: 'Brush teeth', icon: 'toothbrush-emoji', minutes: 2 },
        { title: 'brush TEETH', icon: 'brush-teeth', minutes: 2 },
        { title: '   ', icon: 'check', minutes: 1 },
        { title: 'Lights out', icon: 'lights-out', minutes: 999 },
      ],
    })
  )
  assert.equal(draft.steps.length, 2)
  assert.equal(draft.steps[0].icon, 'check')
  assert.equal(draft.steps[1].duration_seconds, 30 * 60)
})

t('missing API key throws AIRoutineError (no network)', async () => {
  const saved = process.env.ANTHROPIC_API_KEY
  delete process.env.ANTHROPIC_API_KEY
  try {
    await assert.rejects(buildRoutineWithAI({ goal: 'morning' }), AIRoutineError)
  } finally {
    if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved
  }
})

t('upstream failure becomes AIRoutineError', async () =>
  assert.rejects(buildRoutineWithAI({ goal: 'x' }, fakeClient(new Error('529 overloaded'))), AIRoutineError))

t('non-JSON output becomes AIRoutineError', async () =>
  assert.rejects(buildRoutineWithAI({ goal: 'x' }, fakeClient('Sure! Here is a routine:')), AIRoutineError))

t('wrong shape becomes AIRoutineError', async () =>
  assert.rejects(buildRoutineWithAI({ goal: 'x' }, fakeClient({ steps: 'none' })), AIRoutineError))

t('one usable step is not a routine', async () =>
  assert.rejects(
    buildRoutineWithAI({ goal: 'x' }, fakeClient({ ...GOOD, steps: [{ title: 'Wake up', icon: 'wake-up', minutes: 1 }] })),
    AIRoutineError
  ))

t('prompt carries the goal, age, and the ADHD-friendly rules', () => {
  const { system, user } = buildRoutinePrompt({ goal: 'get ready for school', childName: 'Maya', childAge: 7, routineType: 'morning' })
  assert.match(user, /get ready for school/)
  assert.match(user, /Age: 7/)
  assert.match(user, /Maya/)
  assert.match(system, /ADHD/)
  assert.match(system, /One concrete action per step/)
})

// --- rule-based fallback ----------------------------------------------------

t('type is guessed from the goal', () => {
  assert.equal(guessRoutineType('get ready for school'), 'morning')
  assert.equal(guessRoutineType('wind down before bed time'), 'bedtime')
  assert.equal(guessRoutineType('homework after school'), 'afterschool')
  assert.equal(guessRoutineType('saturday chores', 'custom'), 'custom')
})

t('fallback morning draft includes asked-for steps', () => {
  const d = buildRoutineFromTemplates({ goal: 'school morning, needs reminders to brush teeth and floss', childAge: 7 })
  assert.equal(d.type, 'morning')
  const icons = d.steps.map(s => s.icon)
  assert.ok(icons.includes('brush-teeth'))
  assert.ok(icons.includes('floss-teeth'))
  assert.ok(d.tip && /Floss/.test(d.tip))
})

t('fallback keeps lights out last at bedtime', () => {
  const d = buildRoutineFromTemplates({ goal: 'bedtime, wants water and a bathroom trip', childAge: 6 })
  assert.equal(d.type, 'bedtime')
  assert.equal(d.steps[d.steps.length - 1].icon, 'lights-out')
  assert.ok(d.steps.some(s => s.icon === 'drink-water'))
})

t('fallback trims to about six steps for little kids', () => {
  const d = buildRoutineFromTemplates({ goal: 'morning routine', childAge: 4 })
  assert.ok(d.steps.length <= 6, `got ${d.steps.length}`)
})

t('teens get the teen morning', () => {
  const d = buildRoutineFromTemplates({ goal: 'morning before school', childAge: 15 })
  assert.equal(d.name, 'Teen Morning')
})

t('little kids never get the teen morning', () => {
  const d = buildRoutineFromTemplates({ goal: 'teen morning shower', childAge: 6 })
  assert.notEqual(d.name, 'Teen Morning')
})

t('fallback always has valid icons and at most the step cap', () => {
  for (const goal of ['', 'pet care', 'clean my room', 'music practice', 'homework', 'bath and pjs']) {
    const d = buildRoutineFromTemplates({ goal, childAge: 8 })
    assert.ok(d.steps.length >= 1 && d.steps.length <= MAX_DRAFT_STEPS)
    for (const s of d.steps) assert.ok(s.icon in ROUTINE_ICONS, s.icon)
  }
})

t('sanitize returns null when no step survives', () =>
  assert.equal(sanitizeRoutineDraft({ name: 'x', type: 'morning', steps: [{ title: '' }] }), null))

t('sanitize names an unnamed draft after its type', () => {
  const d = sanitizeRoutineDraft({ type: 'afterschool', steps: [{ title: 'Snack', icon: 'have-snack' }] })
  assert.equal(d?.name, 'After School Routine')
  assert.equal(d?.icon, 'pack-backpack')
})

Promise.all(pending).then(() => {
  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
})
