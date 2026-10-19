/**
 * Unit tests for Star Pets (migration 034): XP derivation, levels, stages,
 * the star form, moods, unlocks and monthly drops. Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import {
  FREE_MAX_LEVEL,
  FREE_SPECIES,
  MAX_LEVEL,
  PET_ITEMS,
  PET_SPECIES_IDS,
  STAGE_START_LEVEL,
  dropForMonth,
  getPetItem,
  isPetSpecies,
  levelItems,
} from './catalog'
import { PET_XP, computePetXp, dayRefOf, levelForXp, nextStage, petGrowth, replayStreak, stageForLevel, xpForLevel } from './progress'
import { hourIn, isSleepyHour, petMood } from './mood'
import {
  DROP_XP_GOAL,
  canEquip,
  cleanPetName,
  dropStatus,
  itemState,
  nextLevelUnlock,
  speciesAllowed,
  speciesOptions,
  unlockedBetween,
  visibleEquipped,
  wardrobe,
} from './unlocks'
import { buildPetState, type PetStateInputs } from './state'
import { SEASONAL_THEMES_DATA } from '../constants/seasonal-themes'

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

// Sunday 2026-10-18 .. Saturday 2026-10-24.
const SUN = '2026-10-18'

function tick(chore_id: string, week_start: string, day_of_week: number, status: string | null = 'approved') {
  return { chore_id, week_start, day_of_week, status }
}

console.log('pets: catalog')

t('six species, unique ids, pup is the free one', () => {
  assert.equal(PET_SPECIES_IDS.length, 6)
  assert.equal(new Set(PET_SPECIES_IDS).size, 6)
  assert.equal(FREE_SPECIES, 'pup')
  assert.ok(isPetSpecies('dino'))
  assert.ok(!isPetSpecies('dragon'))
})

t('item ids are unique and fit the database column (<= 40 chars)', () => {
  const ids = PET_ITEMS.map(i => i.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const id of ids) assert.ok(id.length <= 40 && /^[a-z_]+$/.test(id), id)
})

t('exactly one evergreen drop per calendar month, each tied to a real seasonal theme', () => {
  for (let m = 1; m <= 12; m++) {
    const drops = PET_ITEMS.filter(i => i.unlock.kind === 'drop' && i.unlock.month === m)
    assert.equal(drops.length, 1, `month ${m}`)
    const unlock = drops[0].unlock as { season: string }
    assert.ok(SEASONAL_THEMES_DATA[unlock.season], `season ${unlock.season}`)
  }
})

t('dropForMonth picks the month, rejects junk', () => {
  assert.equal(dropForMonth('2026-10')?.id, 'witch_hat')
  assert.equal(dropForMonth('2027-12')?.id, 'santa_hat')
  assert.equal(dropForMonth('2026-1'), null)
  assert.equal(dropForMonth('nope'), null)
})

t('level items are sorted and all reachable', () => {
  const items = levelItems()
  for (let i = 1; i < items.length; i++) assert.ok(items[i].unlock.level >= items[i - 1].unlock.level)
  for (const item of items) assert.ok(item.unlock.level >= 2 && item.unlock.level <= MAX_LEVEL)
  // Every slot gets something early.
  for (const slot of ['hat', 'accessory', 'habitat'] as const) {
    assert.ok(items.some(i => i.slot === slot && i.unlock.level <= 5), slot)
  }
})

console.log('pets: levels and stages')

t('xp curve: 0, 50, 150, 500 at 5', () => {
  assert.equal(xpForLevel(1), 0)
  assert.equal(xpForLevel(2), 50)
  assert.equal(xpForLevel(3), 150)
  assert.equal(xpForLevel(5), 500)
})

t('levelForXp is the inverse at the edges, capped at MAX_LEVEL', () => {
  assert.equal(levelForXp(0), 1)
  assert.equal(levelForXp(49), 1)
  assert.equal(levelForXp(50), 2)
  assert.equal(levelForXp(499), 4)
  assert.equal(levelForXp(500), 5)
  assert.equal(levelForXp(-10), 1)
  assert.equal(levelForXp(10_000_000), MAX_LEVEL)
})

t('stages: baby 1-4, kid 5-9, teen 10-17, adult 18+', () => {
  assert.equal(stageForLevel(1), 'baby')
  assert.equal(stageForLevel(4), 'baby')
  assert.equal(stageForLevel(5), 'kid')
  assert.equal(stageForLevel(9), 'kid')
  assert.equal(stageForLevel(10), 'teen')
  assert.equal(stageForLevel(17), 'teen')
  assert.equal(stageForLevel(18), 'adult')
  assert.equal(stageForLevel(MAX_LEVEL), 'adult')
  assert.deepEqual(nextStage(3), { stage: 'kid', level: 5 })
  assert.equal(nextStage(18), null)
})

t('free pets grow to the end of kid stage and wait, XP saved', () => {
  const xp = xpForLevel(12) + 10
  const free = petGrowth(xp, { premium: false, bestStreak: 0 })
  assert.equal(free.trueLevel, 12)
  assert.equal(free.level, FREE_MAX_LEVEL)
  assert.equal(free.stage, 'kid')
  assert.equal(free.heldBack, true)
  assert.equal(free.nextLevelXp, null)
  assert.equal(free.levelPercent, 100)
  const paid = petGrowth(xp, { premium: true, bestStreak: 0 })
  assert.equal(paid.level, 12)
  assert.equal(paid.stage, 'teen')
  assert.equal(paid.heldBack, false)
})

t('a free pet just below the cap still shows progress', () => {
  const g = petGrowth(xpForLevel(FREE_MAX_LEVEL) + 10, { premium: false, bestStreak: 0 })
  assert.equal(g.level, FREE_MAX_LEVEL)
  assert.equal(g.heldBack, false)
  assert.equal(g.nextLevelXp, xpForLevel(FREE_MAX_LEVEL + 1))
  assert.ok(g.levelPercent < 100)
})

t('star form: Premium adult with a 30-day run since adopting', () => {
  const adultXp = xpForLevel(STAGE_START_LEVEL.adult)
  assert.equal(petGrowth(adultXp, { premium: true, bestStreak: 30 }).star, true)
  assert.equal(petGrowth(adultXp, { premium: true, bestStreak: 29 }).star, false)
  assert.equal(petGrowth(adultXp - 1, { premium: true, bestStreak: 99 }).star, false)
  assert.equal(petGrowth(adultXp, { premium: false, bestStreak: 99 }).star, false)
})

t('levelPercent is within the level', () => {
  const g = petGrowth(75, { premium: true, bestStreak: 0 })
  assert.equal(g.level, 2)
  assert.equal(g.levelStartXp, 50)
  assert.equal(g.nextLevelXp, 150)
  assert.equal(g.levelPercent, 25)
})

console.log('pets: XP derivation')

const dishes = { id: 'c1', days_of_week: [0, 1, 2, 3, 4, 5, 6], is_active: true }
const bed = { id: 'c2', days_of_week: [1, 2, 3, 4, 5], is_active: true }

t('approved ticks earn once per chore per day; pending/rejected earn nothing', () => {
  const xp = computePetXp({
    from: SUN,
    today: '2026-10-20',
    chores: [dishes],
    choreCompletions: [
      tick('c1', SUN, 0),
      tick('c1', SUN, 0), // duplicate row
      tick('c1', SUN, 1, null), // legacy approved
      tick('c1', SUN, 2, 'pending'),
      tick('c1', SUN, 2, 'rejected'),
    ],
    routineCompletions: [],
  })
  assert.equal(xp.choreCount, 2)
  assert.equal(xp.chores, 2 * PET_XP.chore)
})

t('only from the adoption day, and not after today', () => {
  const xp = computePetXp({
    from: '2026-10-20',
    today: '2026-10-21',
    chores: [dishes],
    choreCompletions: [tick('c1', SUN, 1), tick('c1', SUN, 2), tick('c1', SUN, 3), tick('c1', SUN, 4)],
    routineCompletions: [],
  })
  assert.equal(xp.choreCount, 2)
})

t('ticks on another kid\'s chore never count', () => {
  const xp = computePetXp({
    from: SUN,
    today: '2026-10-24',
    chores: [dishes],
    choreCompletions: [tick('someone-else', SUN, 1)],
    routineCompletions: [],
  })
  assert.equal(xp.total, 0)
})

t('routines: one per routine per family-local day', () => {
  const xp = computePetXp({
    from: SUN,
    today: '2026-10-24',
    chores: [],
    choreCompletions: [],
    routineCompletions: [
      { routine_id: 'r1', child_id: 'k', completed_at: '2026-10-19T12:00:00Z' },
      { routine_id: 'r1', child_id: 'k', completed_at: '2026-10-19T13:00:00Z' },
      { routine_id: 'r2', child_id: 'k', completed_at: '2026-10-19T13:00:00Z' },
      // 02:00 UTC on the 18th is the 17th in New York: before adoption.
      { routine_id: 'r1', child_id: 'k', completed_at: '2026-10-18T02:00:00Z' },
    ],
    timeZone: 'America/New_York',
  })
  assert.equal(xp.routineCount, 2)
  assert.equal(xp.routines, 2 * PET_XP.routine)
})

t('challenge wins count once, from adoption on', () => {
  const xp = computePetXp({
    from: SUN,
    today: '2026-10-24',
    chores: [],
    choreCompletions: [],
    routineCompletions: [],
    challengeWins: [
      { id: 'w1', delivered_at: '2026-10-20T18:00:00Z' },
      { id: 'w1', delivered_at: '2026-10-20T18:00:00Z' },
      { id: 'w0', delivered_at: '2026-10-01T18:00:00Z' },
      { id: 'w2', delivered_at: null },
    ],
  })
  assert.equal(xp.challengeCount, 1)
  assert.equal(xp.challenges, PET_XP.challengeWin)
})

t('perfect days and the 7-day milestone come from the streak rule', () => {
  // Dishes every day, 7 days in a row Sun..Sat.
  const ticks = [0, 1, 2, 3, 4, 5, 6].map(d => tick('c1', SUN, d))
  const xp = computePetXp({ from: SUN, today: '2026-10-24', chores: [dishes], choreCompletions: ticks, routineCompletions: [] })
  assert.equal(xp.perfectDayCount, 7)
  assert.equal(xp.perfectDays, 7 * PET_XP.perfectDay)
  assert.equal(xp.streakBonus, PET_XP.streakWeek)
  assert.equal(xp.bestStreak, 7)
  assert.equal(xp.currentStreak, 7)
  assert.equal(xp.total, 7 * PET_XP.chore + 7 * PET_XP.perfectDay + PET_XP.streakWeek)
})

t('a missed day resets the run; an unfinished today does not', () => {
  // Sun, Mon done; Tue missed; Wed done; today Thu not yet.
  const ticks = [tick('c1', SUN, 0), tick('c1', SUN, 1), tick('c1', SUN, 3)]
  const r = replayStreak([dishes], ticks, SUN, '2026-10-22')
  assert.equal(r.perfectDays, 3)
  assert.equal(r.best, 2)
  assert.equal(r.current, 1)
})

t('days with nothing due and vacation days neither count nor break', () => {
  // Weekdays-only chore; Fri done, weekend nothing due, Mon done.
  const ticks = [tick('c2', SUN, 5), tick('c2', '2026-10-25', 1)]
  const r = replayStreak([bed], ticks, '2026-10-23', '2026-10-26')
  assert.equal(r.current, 2)
  // A vacation over Tue..Wed with dishes: no break.
  const v = replayStreak(
    [dishes],
    [tick('c1', SUN, 0), tick('c1', SUN, 1), tick('c1', SUN, 4)],
    SUN,
    '2026-10-22',
    [{ starts_on: '2026-10-20', ends_on: '2026-10-21' }]
  )
  assert.equal(v.current, 3)
})

t('archived chores still earn for past ticks but never make a day due', () => {
  const archived = { id: 'c9', days_of_week: [0, 1, 2, 3, 4, 5, 6], is_active: false }
  const xp = computePetXp({
    from: SUN,
    today: '2026-10-20',
    chores: [archived],
    choreCompletions: [tick('c9', SUN, 0)],
    routineCompletions: [],
  })
  assert.equal(xp.chores, PET_XP.chore)
  assert.equal(xp.perfectDayCount, 0)
})

t('dayRefOf matches chore_completions coordinates', () => {
  assert.deepEqual(dayRefOf('2026-10-21'), { weekStart: SUN, dayOfWeek: 3 })
  assert.deepEqual(dayRefOf(SUN), { weekStart: SUN, dayOfWeek: 0 })
})

console.log('pets: mood (never sad)')

t('relaxed when nothing to do', () => {
  assert.equal(petMood({ choresDue: 0, choresDone: 0, routinesActive: 0, routinesDoneToday: 0, hour: 10 }), 'relaxed')
})

t('happy when chores done and a routine done', () => {
  assert.equal(petMood({ choresDue: 3, choresDone: 3, routinesActive: 2, routinesDoneToday: 1, hour: 10 }), 'happy')
  assert.equal(petMood({ choresDue: 2, choresDone: 2, routinesActive: 0, routinesDoneToday: 0, hour: 22 }), 'happy')
  assert.equal(petMood({ choresDue: 0, choresDone: 0, routinesActive: 1, routinesDoneToday: 1, hour: 8 }), 'happy')
})

t('playful once anything is done', () => {
  assert.equal(petMood({ choresDue: 3, choresDone: 1, routinesActive: 0, routinesDoneToday: 0, hour: 10 }), 'playful')
  assert.equal(petMood({ choresDue: 3, choresDone: 0, routinesActive: 1, routinesDoneToday: 1, hour: 21 }), 'playful')
})

t('nothing yet: hungry by day, sleepy late and early', () => {
  const none = { choresDue: 2, choresDone: 0, routinesActive: 1, routinesDoneToday: 0 }
  assert.equal(petMood({ ...none, hour: 7 }), 'hungry')
  assert.equal(petMood({ ...none, hour: 18 }), 'hungry')
  assert.equal(petMood({ ...none, hour: 19 }), 'sleepy')
  assert.equal(petMood({ ...none, hour: 5 }), 'sleepy')
  assert.ok(isSleepyHour(23) && !isSleepyHour(12))
})

t('hourIn reads the family zone, falls back to UTC', () => {
  const now = new Date('2026-10-19T03:30:00Z')
  assert.equal(hourIn('UTC', now), 3)
  assert.equal(hourIn('America/New_York', now), 23)
  assert.equal(hourIn('Not/AZone', now), 3)
  assert.equal(hourIn(null, now), 3)
})

console.log('pets: unlocks and the free teaser')

t('free can adopt only the pup; Premium every species', () => {
  assert.ok(speciesAllowed('pup', false))
  assert.ok(!speciesAllowed('dino', false))
  assert.ok(speciesAllowed('dino', true))
  assert.equal(speciesOptions(false).filter(s => !s.locked).length, 1)
  assert.equal(speciesOptions(true).filter(s => s.locked).length, 0)
})

t('free plan: every cosmetic is Premium, nothing equips, nothing draws', () => {
  const a = { premium: false, level: 40, owned: new Set(['witch_hat']) }
  assert.equal(itemState(getPetItem('cap')!, a), 'premium')
  assert.equal(itemState(getPetItem('witch_hat')!, a), 'premium')
  assert.ok(!canEquip('cap', 'hat', a))
  assert.deepEqual(visibleEquipped({ hat: 'cap', accessory: 'bowtie', habitat: 'meadow' }, a), {
    hat: null,
    accessory: null,
    habitat: null,
  })
})

t('Premium: level items by true level, drops only when owned, slot must match', () => {
  const a = { premium: true, level: 7, owned: new Set(['witch_hat']) }
  assert.ok(canEquip('beanie', 'hat', a))
  assert.ok(!canEquip('wizard_hat', 'hat', a))
  assert.ok(canEquip('witch_hat', 'hat', a))
  assert.ok(!canEquip('santa_hat', 'hat', a))
  assert.ok(!canEquip('beanie', 'accessory', a))
  assert.ok(!canEquip('no_such_thing', 'hat', a))
})

t('visibleEquipped drops what is no longer wearable', () => {
  const a = { premium: true, level: 3, owned: new Set<string>() }
  assert.deepEqual(visibleEquipped({ hat: 'crown', accessory: 'bowtie', habitat: 'cap' }, a), {
    hat: null,
    accessory: 'bowtie',
    habitat: null,
  })
})

t('wardrobe lists level items plus owned drops only', () => {
  const a = { premium: true, level: 5, owned: new Set(['witch_hat']) }
  const w = wardrobe(a, { hat: 'witch_hat', accessory: null, habitat: null })
  assert.ok(w.some(e => e.id === 'witch_hat' && e.equipped && e.state === 'unlocked'))
  assert.ok(!w.some(e => e.id === 'santa_hat'))
  assert.equal(w.find(e => e.id === 'crown')?.state, 'level')
  assert.equal(w.find(e => e.id === 'cap')?.state, 'unlocked')
})

t('next unlock and unlocks between levels', () => {
  assert.deepEqual(nextLevelUnlock(1), { id: 'bowtie', level: 2 })
  assert.deepEqual(nextLevelUnlock(7), { id: 'bedroom', level: 9 })
  assert.equal(nextLevelUnlock(MAX_LEVEL), null)
  assert.deepEqual(unlockedBetween(2, 4), ['cap', 'meadow'])
  assert.deepEqual(unlockedBetween(4, 4), [])
})

t('monthly drop: collectible on Premium once this month\'s XP hits the goal', () => {
  const base = { today: '2026-10-19', owned: new Set<string>() }
  const short = dropStatus({ ...base, premium: true, xpThisMonth: DROP_XP_GOAL - 1 })!
  assert.equal(short.itemId, 'witch_hat')
  assert.equal(short.season, 'halloween')
  assert.equal(short.collectible, false)
  assert.equal(dropStatus({ ...base, premium: true, xpThisMonth: DROP_XP_GOAL })!.collectible, true)
  const free = dropStatus({ ...base, premium: false, xpThisMonth: 999 })!
  assert.equal(free.collectible, false)
  assert.equal(free.locked, true)
  const owned = dropStatus({ ...base, owned: new Set(['witch_hat']), premium: true, xpThisMonth: 999 })!
  assert.equal(owned.owned, true)
  assert.equal(owned.collectible, false)
})

t('pet names: trimmed, 1-20 characters, no control characters', () => {
  assert.equal(cleanPetName('  Biscuit  '), 'Biscuit')
  assert.equal(cleanPetName('Sir   Fluff'), 'Sir Fluff')
  assert.equal(cleanPetName('A\u0007B'), 'AB')
  assert.equal(cleanPetName('   '), null)
  assert.equal(cleanPetName('x'.repeat(21)), null)
  assert.equal(cleanPetName('🐶'.repeat(20)), '🐶'.repeat(20))
  assert.equal(cleanPetName(42), null)
})

console.log('pets: buildPetState')

function inputs(over: Partial<PetStateInputs> = {}): PetStateInputs {
  return {
    row: { child_id: 'k', species: 'dino', name: 'Rex', adopted_on: SUN, hat: 'cap', accessory: null, habitat: 'meadow', enabled: true },
    premium: true,
    today: '2026-10-24',
    owned: new Set<string>(),
    chores: [dishes],
    choreCompletions: [0, 1, 2, 3, 4, 5, 6].map(d => tick('c1', SUN, d)),
    routineCompletions: [],
    challengeWins: [],
    timeZone: 'UTC',
    todayCounts: { choresDue: 1, choresDone: 1, routinesActive: 0, routinesDoneToday: 0 },
    hour: 12,
    ...over,
  }
}

t('an adopted Premium pet: XP, level, mood, equipped and the drop', () => {
  const s = buildPetState(inputs())
  assert.equal(s.adopted, true)
  assert.equal(s.xp, 7 * 10 + 7 * 5 + 50)
  assert.equal(s.level, levelForXp(s.xp))
  assert.equal(s.mood, 'happy')
  assert.equal(s.level, 3)
  assert.equal(s.equipped.hat, 'cap', 'cap unlocks at level 3')
  assert.equal(s.equipped.habitat, null, 'meadow needs level 4')
  assert.equal(s.drop?.itemId, 'witch_hat')
  assert.equal(s.drop?.collectible, true)
})

t('lapsed family keeps its dino, draws no cosmetics, remembers the choice', () => {
  const s = buildPetState(inputs({ premium: false }))
  assert.equal(s.species, 'dino')
  assert.deepEqual(s.equipped, { hat: null, accessory: null, habitat: null })
  assert.equal(s.chosen.habitat, 'meadow')
  assert.equal(s.drop?.locked, true)
})

t('not adopted yet: nothing to grow, species options say what is locked', () => {
  const s = buildPetState(inputs({ row: null, premium: false }))
  assert.equal(s.adopted, false)
  assert.equal(s.enabled, true)
  assert.equal(s.xp, 0)
  assert.equal(s.speciesOptions.find(o => o.id === 'pup')?.locked, false)
  assert.equal(s.speciesOptions.find(o => o.id === 'owl')?.locked, true)
})

t('parent switched pets off', () => {
  const s = buildPetState(inputs({ row: { child_id: 'k', species: null, name: null, adopted_on: null, hat: null, accessory: null, habitat: null, enabled: false } }))
  assert.equal(s.enabled, false)
  assert.equal(s.adopted, false)
})

t('drop XP counts only this month (and only since adoption)', () => {
  // Adopted Sep 28; all ticks in September: October drop XP is 0.
  const sepSun = '2026-09-27'
  const s = buildPetState(
    inputs({
      row: { child_id: 'k', species: 'pup', name: 'Bo', adopted_on: '2026-09-28', hat: null, accessory: null, habitat: null, enabled: true },
      today: '2026-10-02',
      choreCompletions: [1, 2].map(d => tick('c1', sepSun, d)),
    })
  )
  assert.ok(s.xp > 0)
  assert.equal(s.drop?.xpThisMonth, 0)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
