/**
 * Unit tests for the calendar feed generator. Run with `npm run test:unit`.
 *
 * Besides the pieces (escaping, folding, dates, zones), every generated feed
 * goes through `validate`, a small RFC 5545 checker: CRLF only, no physical
 * line over 75 octets, folds that never split a UTF-8 character, balanced
 * BEGIN/END, the required properties per component, a VTIMEZONE for every
 * TZID used, UNTIL in the form 3.3.10 demands, and DTSTART on a BYDAY day.
 */
import assert from 'node:assert/strict'
import {
  CRLF,
  addDays,
  buildFeedCalendar,
  buildPremiumNeededCalendar,
  buildVTimezone,
  byDay,
  civilDateIn,
  escapeText,
  eventTitle,
  feedUrls,
  FEED_TOKEN_PATTERN,
  firstOnOrAfter,
  foldLine,
  formatUtcOffset,
  icsUtc,
  octetLength,
  resolveFeedTimeZone,
  routineMinutes,
  tzOffsetMinutes,
  vacationDates,
  weekdayOf,
  zonedToUtc,
  zoneTransitions,
  type FeedInput,
} from './ics'

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
    console.log(err)
  }
}

// ---------------------------------------------------------------------------
// A small RFC 5545 parser + checker
// ---------------------------------------------------------------------------

interface Prop {
  name: string
  params: Record<string, string>
  value: string
}
interface Component {
  name: string
  props: Prop[]
  children: Component[]
}

/** Split one unfolded content line into name, params, value (quote-aware). */
function parseContentLine(line: string): Prop {
  let i = 0
  let inQuote = false
  let colon = -1
  for (; i < line.length; i++) {
    const c = line[i]
    if (c === '"') inQuote = !inQuote
    else if (c === ':' && !inQuote) {
      colon = i
      break
    }
  }
  assert.ok(colon > 0, `no ":" in content line: ${line}`)
  const head = line.slice(0, colon)
  const value = line.slice(colon + 1)
  const segs: string[] = []
  let cur = ''
  inQuote = false
  for (const c of head) {
    if (c === '"') inQuote = !inQuote
    if (c === ';' && !inQuote) {
      segs.push(cur)
      cur = ''
    } else cur += c
  }
  segs.push(cur)
  const [name, ...rest] = segs
  assert.match(name, /^[A-Z][A-Z0-9-]*$/, `bad property name ${name}`)
  const params: Record<string, string> = {}
  for (const p of rest) {
    const eq = p.indexOf('=')
    assert.ok(eq > 0, `bad parameter ${p}`)
    params[p.slice(0, eq)] = p.slice(eq + 1).replace(/^"|"$/g, '')
  }
  return { name, params, value }
}

function parse(ics: string): Component {
  // Line endings: every line ends in CRLF, and there is no bare CR or LF.
  assert.ok(ics.endsWith(CRLF), 'stream must end with CRLF')
  assert.equal(ics.replace(/\r\n/g, '').match(/[\r\n]/), null, 'bare CR or LF found')

  const physical = ics.slice(0, -2).split(CRLF)
  for (const l of physical) {
    assert.ok(octetLength(l) <= 75, `line over 75 octets (${octetLength(l)}): ${l}`)
    assert.ok(!l.includes('�'), 'replacement character: a fold split a UTF-8 sequence')
  }
  // Folding never splits a UTF-8 sequence: each physical line is valid UTF-8 on its own.
  for (const l of physical) {
    const bytes = Buffer.from(l, 'utf8')
    assert.equal(new TextDecoder('utf-8', { fatal: true }).decode(bytes), l)
  }

  const logical: string[] = []
  for (const l of physical) {
    if (l.startsWith(' ') || l.startsWith('\t')) {
      assert.ok(logical.length > 0, 'continuation line first')
      logical[logical.length - 1] += l.slice(1)
    } else logical.push(l)
  }

  const root: Component = { name: '#root', props: [], children: [] }
  const stack: Component[] = [root]
  for (const line of logical) {
    const p = parseContentLine(line)
    if (p.name === 'BEGIN') {
      const c: Component = { name: p.value, props: [], children: [] }
      stack[stack.length - 1].children.push(c)
      stack.push(c)
    } else if (p.name === 'END') {
      const top = stack.pop()
      assert.equal(top?.name, p.value, `END:${p.value} does not close BEGIN:${top?.name}`)
    } else {
      stack[stack.length - 1].props.push(p)
    }
  }
  assert.equal(stack.length, 1, 'unclosed component')
  assert.equal(root.children.length, 1)
  return root.children[0]
}

const one = (c: Component, name: string) => c.props.filter(p => p.name === name)
const get = (c: Component, name: string) => one(c, name)[0]

/** Undo escapeText: what a calendar app shows. */
function unescape(v: string): string {
  return v.replace(/\\([\\;,nN])/g, (_, c) => (c === 'n' || c === 'N' ? '\n' : c))
}

const DATE = /^\d{8}$/
const DATETIME_LOCAL = /^\d{8}T\d{6}$/
const DATETIME_UTC = /^\d{8}T\d{6}Z$/

function weekdayOfIcs(v: string): number {
  return new Date(Date.UTC(+v.slice(0, 4), +v.slice(4, 6) - 1, +v.slice(6, 8))).getUTCDay()
}

function validate(ics: string): Component {
  const cal = parse(ics)
  assert.equal(cal.name, 'VCALENDAR')
  assert.equal(get(cal, 'VERSION')?.value, '2.0')
  assert.ok(get(cal, 'PRODID'), 'PRODID required')
  assert.ok(get(cal, 'X-WR-CALNAME'), 'X-WR-CALNAME')

  // Required-once properties appear at most once.
  for (const name of ['VERSION', 'PRODID', 'CALSCALE', 'METHOD']) assert.ok(one(cal, name).length <= 1, `${name} repeated`)

  // Unescaped TEXT special characters never appear in TEXT values.
  const textProps = ['SUMMARY', 'DESCRIPTION', 'X-WR-CALNAME', 'NAME', 'X-WR-CALDESC']
  const checkText = (p: Prop) => {
    if (!textProps.includes(p.name)) return
    assert.equal(p.value.replace(/\\[\\;,nN]/g, '').match(/[;,\\]/), null, `unescaped TEXT in ${p.name}: ${p.value}`)
  }
  cal.props.forEach(checkText)

  const tzids = new Set(cal.children.filter(c => c.name === 'VTIMEZONE').map(c => get(c, 'TZID').value))
  for (const tz of cal.children.filter(c => c.name === 'VTIMEZONE')) {
    const obs = tz.children
    assert.ok(obs.length > 0, 'VTIMEZONE needs STANDARD or DAYLIGHT')
    for (const o of obs) {
      assert.ok(o.name === 'STANDARD' || o.name === 'DAYLIGHT')
      assert.match(get(o, 'DTSTART').value, DATETIME_LOCAL)
      assert.match(get(o, 'TZOFFSETFROM').value, /^[+-]\d{4}$/)
      assert.match(get(o, 'TZOFFSETTO').value, /^[+-]\d{4}$/)
    }
  }

  const uids = new Set<string>()
  for (const ev of cal.children.filter(c => c.name === 'VEVENT')) {
    ev.props.forEach(checkText)
    for (const name of ['UID', 'DTSTAMP', 'DTSTART']) assert.equal(one(ev, name).length, 1, `VEVENT needs exactly one ${name}`)
    const uid = get(ev, 'UID').value
    assert.ok(!uids.has(uid), `duplicate UID ${uid}`)
    uids.add(uid)
    assert.match(get(ev, 'DTSTAMP').value, DATETIME_UTC)
    assert.ok(!(get(ev, 'DTEND') && get(ev, 'DURATION')), 'DTEND and DURATION are exclusive')

    const start = get(ev, 'DTSTART')
    const allDay = start.params.VALUE === 'DATE'
    if (allDay) {
      assert.match(start.value, DATE)
      const end = get(ev, 'DTEND')
      if (end) {
        assert.equal(end.params.VALUE, 'DATE')
        assert.ok(end.value > start.value, 'DTEND after DTSTART')
      }
    } else {
      assert.ok(DATETIME_LOCAL.test(start.value) || DATETIME_UTC.test(start.value), start.value)
      if (start.params.TZID) {
        assert.ok(tzids.has(start.params.TZID), `TZID ${start.params.TZID} has no VTIMEZONE`)
        assert.match(start.value, DATETIME_LOCAL)
      }
      if (get(ev, 'DURATION')) assert.match(get(ev, 'DURATION').value, /^PT\d+M$/)
    }

    const rrule = get(ev, 'RRULE')
    if (rrule) {
      const parts = Object.fromEntries(rrule.value.split(';').map(kv => kv.split('=')))
      assert.ok(['DAILY', 'WEEKLY'].includes(parts.FREQ), `FREQ ${parts.FREQ}`)
      if (parts.BYDAY) {
        const days = parts.BYDAY.split(',')
        for (const d of days) assert.ok(['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].includes(d))
        // DTSTART SHOULD be synchronized with the rule (3.8.5.3).
        const dow = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][weekdayOfIcs(start.value)]
        assert.ok(days.includes(dow), `DTSTART ${start.value} (${dow}) not in BYDAY ${parts.BYDAY}`)
      }
      if (parts.UNTIL) {
        // 3.3.10: same value type as DTSTART; UTC when DTSTART has a TZID.
        if (allDay) assert.match(parts.UNTIL, DATE)
        else if (start.params.TZID) assert.match(parts.UNTIL, DATETIME_UTC)
        else assert.match(parts.UNTIL, DATETIME_LOCAL)
      }
    }

    for (const ex of one(ev, 'EXDATE')) {
      const values = ex.value.split(',')
      for (const v of values) {
        if (allDay) {
          assert.equal(ex.params.VALUE, 'DATE')
          assert.match(v, DATE)
        } else {
          assert.match(v, DATETIME_LOCAL)
          assert.equal(ex.params.TZID, start.params.TZID, 'EXDATE zone matches DTSTART')
          assert.equal(v.slice(8), start.value.slice(8), 'EXDATE time matches DTSTART')
        }
      }
    }
  }
  return cal
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

t('escapeText escapes backslash, semicolon, comma, newline', () => {
  assert.equal(escapeText('a\\b;c,d\ne'), 'a\\\\b\\;c\\,d\\ne')
  assert.equal(escapeText('one\r\ntwo\rthree'), 'one\\ntwo\\nthree')
})

t('escapeText drops control characters but keeps tabs and emoji', () => {
  assert.equal(escapeText('a\u0000b\u0007c\td 🧹'), 'abc\td 🧹')
})

t('escapeText leaves colons and quotes alone (legal in TEXT)', () => {
  assert.equal(escapeText('Maya: "Dishes"'), 'Maya: "Dishes"')
})

t('foldLine leaves a 75-octet line alone', () => {
  const l = 'X'.repeat(75)
  assert.equal(foldLine(l), l)
})

t('foldLine folds at 75 octets with a leading space on continuations', () => {
  const l = 'A'.repeat(200)
  const parts = foldLine(l).split(CRLF)
  assert.equal(parts[0].length, 75)
  for (const p of parts.slice(1)) {
    assert.ok(p.startsWith(' '))
    assert.ok(octetLength(p) <= 75)
  }
  assert.equal(parts.map((p, i) => (i === 0 ? p : p.slice(1))).join(''), l)
})

t('foldLine never splits a multi-octet character', () => {
  const l = 'SUMMARY:' + '🧹é漢'.repeat(40)
  const folded = foldLine(l)
  for (const p of folded.split(CRLF)) {
    assert.ok(octetLength(p) <= 75)
    assert.equal(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(p, 'utf8')), p)
  }
  assert.equal(folded.split(CRLF).map((p, i) => (i === 0 ? p : p.slice(1))).join(''), l)
})

t('octetLength counts UTF-8 bytes', () => {
  assert.equal(octetLength('a'), 1)
  assert.equal(octetLength('é'), 2)
  assert.equal(octetLength('€'), 3)
  assert.equal(octetLength('🧹'), 4)
})

t('date helpers: addDays, weekdayOf, firstOnOrAfter', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(addDays('2026-03-01', -1), '2026-02-28')
  assert.equal(weekdayOf('2026-10-18'), 0) // Sunday
  assert.equal(firstOnOrAfter('2026-10-18', [2, 4]), '2026-10-20')
  assert.equal(firstOnOrAfter('2026-10-20', [2]), '2026-10-20')
})

t('byDay is Sunday-first and sorted', () => {
  assert.equal(byDay([5, 1, 3]), 'MO,WE,FR')
  assert.equal(byDay([0, 6]), 'SU,SA')
})

t('icsUtc formats DATE-TIME in UTC', () => {
  assert.equal(icsUtc(new Date('2026-10-19T08:05:09.999Z')), '20261019T080509Z')
})

t('formatUtcOffset', () => {
  assert.equal(formatUtcOffset(-300), '-0500')
  assert.equal(formatUtcOffset(330), '+0530')
  assert.equal(formatUtcOffset(0), '+0000')
  assert.equal(formatUtcOffset(-570), '-0930')
})

t('resolveFeedTimeZone: a real zone wins, UTC and junk mean floating', () => {
  assert.equal(resolveFeedTimeZone('America/Chicago', 'Europe/London'), 'America/Chicago')
  assert.equal(resolveFeedTimeZone('UTC', 'Europe/London'), 'Europe/London')
  assert.equal(resolveFeedTimeZone('Etc/UTC', null), null)
  assert.equal(resolveFeedTimeZone(null, undefined), null)
  assert.equal(resolveFeedTimeZone('Not/AZone', 'GMT'), null)
})

t('tzOffsetMinutes knows DST', () => {
  assert.equal(tzOffsetMinutes('America/New_York', Date.UTC(2026, 0, 15)), -300)
  assert.equal(tzOffsetMinutes('America/New_York', Date.UTC(2026, 6, 15)), -240)
  assert.equal(tzOffsetMinutes('Asia/Kolkata', Date.UTC(2026, 6, 15)), 330)
  assert.equal(tzOffsetMinutes('Australia/Sydney', Date.UTC(2026, 0, 15)), 660)
})

t('zoneTransitions finds US DST to the minute (2026: Mar 8, Nov 1)', () => {
  const tr = zoneTransitions('America/New_York', 2026, 2026)
  assert.equal(tr.length, 2)
  assert.equal(new Date(tr[0].at).toISOString(), '2026-03-08T07:00:00.000Z') // 2am EST
  assert.deepEqual([tr[0].from, tr[0].to], [-300, -240])
  assert.equal(new Date(tr[1].at).toISOString(), '2026-11-01T06:00:00.000Z') // 2am EDT
})

t('zoneTransitions is empty for a zone without DST', () => {
  assert.equal(zoneTransitions('Asia/Tokyo', 2025, 2028).length, 0)
})

t('buildVTimezone: New York observances with wall-clock DTSTART', () => {
  const lines = buildVTimezone('America/New_York', 2026, 2026)
  const text = lines.join('\n')
  assert.ok(text.includes('BEGIN:DAYLIGHT\nDTSTART:20260308T020000\nTZOFFSETFROM:-0500\nTZOFFSETTO:-0400\nEND:DAYLIGHT'))
  assert.ok(text.includes('BEGIN:STANDARD\nDTSTART:20261101T020000\nTZOFFSETFROM:-0400\nTZOFFSETTO:-0500\nEND:STANDARD'))
  assert.ok(text.includes('BEGIN:STANDARD\nDTSTART:19700101T000000\nTZOFFSETFROM:-0500\nTZOFFSETTO:-0500'))
})

t('buildVTimezone: southern hemisphere picks the right standard time', () => {
  const text = buildVTimezone('Australia/Sydney', 2026, 2026).join('\n')
  // Sydney is on daylight time (+1100) in January; standard is +1000.
  assert.ok(text.includes('BEGIN:DAYLIGHT\nDTSTART:19700101T000000\nTZOFFSETFROM:+1100\nTZOFFSETTO:+1100'))
  assert.ok(text.includes('BEGIN:STANDARD\nDTSTART:20260405T030000\nTZOFFSETFROM:+1100\nTZOFFSETTO:+1000'))
})

t('zonedToUtc converts wall time through DST', () => {
  assert.equal(zonedToUtc('2026-01-10', '07:00', 'America/Chicago').toISOString(), '2026-01-10T13:00:00.000Z')
  assert.equal(zonedToUtc('2026-07-10', '07:00', 'America/Chicago').toISOString(), '2026-07-10T12:00:00.000Z')
})

t('civilDateIn reads the date in the zone', () => {
  const late = new Date('2026-10-19T03:00:00Z') // Sun 10pm in Chicago
  assert.equal(civilDateIn(late, 'America/Chicago'), '2026-10-18')
  assert.equal(civilDateIn(late, null), '2026-10-19')
})

t('routineMinutes: step timers rounded up, clamped, default 20', () => {
  assert.equal(routineMinutes([]), 20)
  assert.equal(routineMinutes([{ title: 'a' }, { title: 'b', durationSeconds: null }]), 20)
  assert.equal(routineMinutes([{ title: 'a', durationSeconds: 90 }, { title: 'b', durationSeconds: 100 }]), 5)
  assert.equal(routineMinutes([{ title: 'a', durationSeconds: 600 }, { title: 'b', durationSeconds: 61 }]), 12)
  assert.equal(routineMinutes([{ title: 'a', durationSeconds: 99_999 }]), 120)
})

t('eventTitle: emoji, kid, chore, reward in the family currency', () => {
  assert.equal(eventTitle('🧹', 'Maya', 'Dishes', 50, 'USD'), '🧹 Maya: Dishes ($0.50)')
  assert.equal(eventTitle('🧹', 'Maya', 'Dishes', 50, 'GBP'), '🧹 Maya: Dishes (£0.50)')
  assert.equal(eventTitle('🧹', 'Maya', 'Dishes', 500, 'JPY'), '🧹 Maya: Dishes (¥5)')
  assert.equal(eventTitle('🧹', 'Maya', 'Dishes', 0, 'USD'), '🧹 Maya: Dishes')
  assert.equal(eventTitle('🧹', 'Maya', 'Dishes', 50, 'USD', false), '🧹 Maya: Dishes')
  assert.equal(eventTitle('🧹', null, 'Dishes', null), '🧹 Dishes')
})

t('vacationDates: only scheduled days inside the range, sorted and unique', () => {
  const windows = [
    { starts_on: '2026-10-20', ends_on: '2026-10-27' },
    { starts_on: '2026-10-26', ends_on: '2026-10-28' }, // overlaps
    { starts_on: 'bad', ends_on: '2026-10-28' },
    { starts_on: '2026-11-05', ends_on: '2026-11-01' }, // inverted
  ]
  assert.deepEqual(vacationDates(windows, [1, 3], '2026-10-01', '2026-12-31'), ['2026-10-21', '2026-10-26', '2026-10-28'])
  assert.deepEqual(vacationDates(windows, [1, 3], '2026-10-22', '2026-10-26'), ['2026-10-26'])
  assert.deepEqual(vacationDates(null, [1], '2026-10-01', '2026-12-31'), [])
})

t('feedUrls: https, webcal and Google subscribe links', () => {
  const token = 'a'.repeat(43)
  const u = feedUrls('https://chorestar.app/', token)
  assert.equal(u.https, `https://chorestar.app/api/calendar/${token}.ics`)
  assert.equal(u.webcal, `webcal://chorestar.app/api/calendar/${token}.ics`)
  assert.equal(u.google, `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(u.webcal)}`)
  assert.ok(u.google.includes('cid=webcal%3A%2F%2Fchorestar.app'))
  assert.equal(feedUrls('http://localhost:3000', token).webcal, `webcal://localhost:3000/api/calendar/${token}.ics`)
})

t('FEED_TOKEN_PATTERN accepts 43-char base64url only', () => {
  assert.ok(FEED_TOKEN_PATTERN.test('A'.repeat(40) + '-_9'))
  assert.ok(!FEED_TOKEN_PATTERN.test('A'.repeat(42)))
  assert.ok(!FEED_TOKEN_PATTERN.test('A'.repeat(42) + '='))
  assert.ok(!FEED_TOKEN_PATTERN.test('A'.repeat(42) + '/'))
})

// ---------------------------------------------------------------------------
// Whole feeds
// ---------------------------------------------------------------------------

const NOW = new Date('2026-10-19T15:00:00Z') // Monday

function family(overrides: Partial<FeedInput> = {}): FeedInput {
  return {
    calendarName: 'ChoreStar: Smith Family',
    timeZone: 'America/Chicago',
    now: NOW,
    currencyCode: 'USD',
    perChoreRewards: true,
    appUrl: 'https://chorestar.app',
    children: [
      { id: 'kid-maya', name: 'Maya' },
      { id: 'kid-sam', name: 'Sam' },
    ],
    chores: [
      { id: 'c1', childId: 'kid-maya', name: 'Dishes', icon: '🧹', rewardCents: 50, daysOfWeek: [1, 3, 5], createdAt: '2026-09-01T12:00:00Z', updatedAt: '2026-10-01T12:00:00Z' },
      { id: 'c2', childId: 'kid-sam', name: 'Feed the cat; brush, too', icon: null, rewardCents: 25, daysOfWeek: null, createdAt: '2020-01-01T00:00:00Z' },
      { id: 'c3', childId: 'kid-sam', name: 'Trash', icon: '🗑️', rewardCents: 100, daysOfWeek: [2], rotationMode: 'rotate', createdAt: '2026-01-01T00:00:00Z' },
      { id: 'c4', childId: 'kid-maya', name: 'Piano', icon: '🎹', rewardCents: 0, daysOfWeek: [2, 4], time: '16:30', createdAt: '2026-10-01T00:00:00Z' },
    ],
    routines: [
      {
        id: 'r1',
        childId: 'kid-maya',
        name: 'Morning',
        type: 'morning',
        rewardCents: 25,
        steps: [
          { title: 'Brush teeth', durationSeconds: 120 },
          { title: 'Get dressed', durationSeconds: 300 },
          { title: 'Make bed' },
        ],
        createdAt: '2026-08-01T00:00:00Z',
      },
      { id: 'r2', childId: 'kid-sam', name: 'Bedtime', type: 'bedtime', rewardCents: 0, steps: [], createdAt: '2026-08-01T00:00:00Z' },
    ],
    vacations: [{ starts_on: '2026-11-25', ends_on: '2026-11-29' }],
    ...overrides,
  }
}

function events(cal: Component) {
  const byUid = new Map<string, Component>()
  for (const e of cal.children.filter(c => c.name === 'VEVENT')) byUid.set(get(e, 'UID').value, e)
  return byUid
}

t('family feed is valid RFC 5545', () => {
  validate(buildFeedCalendar(family()))
})

t('calendar properties: name, zone, refresh hints', () => {
  const cal = validate(buildFeedCalendar(family()))
  assert.equal(get(cal, 'X-WR-CALNAME').value, 'ChoreStar: Smith Family')
  assert.equal(get(cal, 'X-WR-TIMEZONE').value, 'America/Chicago')
  assert.equal(get(cal, 'METHOD').value, 'PUBLISH')
  assert.equal(get(cal, 'REFRESH-INTERVAL').value, 'PT1H')
  assert.equal(cal.children.filter(c => c.name === 'VTIMEZONE').length, 1)
})

t('one event per chore and routine, with stable UIDs', () => {
  const a = buildFeedCalendar(family())
  const b = buildFeedCalendar(family({ now: new Date('2026-10-20T15:00:00Z') }))
  const uidsA = [...events(validate(a)).keys()].sort()
  const uidsB = [...events(validate(b)).keys()].sort()
  assert.deepEqual(uidsA, [
    'chore-c1@chorestar.app', 'chore-c2@chorestar.app', 'chore-c3@chorestar.app', 'chore-c4@chorestar.app',
    'routine-r1@chorestar.app', 'routine-r2@chorestar.app',
  ])
  assert.deepEqual(uidsA, uidsB)
})

t('DTSTART is stable between polls (only DTSTAMP moves)', () => {
  const a = events(validate(buildFeedCalendar(family())))
  const b = events(validate(buildFeedCalendar(family({ now: new Date('2026-10-23T15:00:00Z') }))))
  for (const uid of ['chore-c1@chorestar.app', 'chore-c2@chorestar.app', 'routine-r1@chorestar.app']) {
    assert.equal(get(a.get(uid)!, 'DTSTART').value, get(b.get(uid)!, 'DTSTART').value)
  }
})

t('scheduled chore: all-day weekly on its days, title with reward', () => {
  const e = events(validate(buildFeedCalendar(family()))).get('chore-c1@chorestar.app')!
  assert.equal(unescape(get(e, 'SUMMARY').value), '🧹 Maya: Dishes ($0.50)')
  assert.equal(get(e, 'DTSTART').params.VALUE, 'DATE')
  assert.equal(get(e, 'DTSTART').value, '20260902') // created Tue Sep 1 -> first Wed
  assert.equal(get(e, 'DTEND').value, '20260903')
  assert.equal(get(e, 'RRULE').value, 'FREQ=WEEKLY;BYDAY=MO,WE,FR')
  assert.equal(get(e, 'TRANSP').value, 'TRANSPARENT')
  assert.equal(get(e, 'LAST-MODIFIED').value, '20261001T120000Z')
  assert.ok(unescape(get(e, 'DESCRIPTION').value).startsWith('Mon, Wed, Fri\nEarns $0.50 each time.'))
})

t('every-day chore uses FREQ=DAILY, default emoji, escaped title, old anchor floored', () => {
  const e = events(validate(buildFeedCalendar(family()))).get('chore-c2@chorestar.app')!
  assert.equal(get(e, 'RRULE').value, 'FREQ=DAILY')
  assert.equal(get(e, 'SUMMARY').value, '✅ Sam: Feed the cat\\; brush\\, too ($0.25)')
  assert.equal(get(e, 'DTSTART').value, '20250101') // created 2020, floored to Jan 1 of last year
})

t('flat reward mode leaves amounts off chore titles', () => {
  const e = events(validate(buildFeedCalendar(family({ perChoreRewards: false })))).get('chore-c1@chorestar.app')!
  assert.equal(unescape(get(e, 'SUMMARY').value), '🧹 Maya: Dishes')
  assert.ok(!unescape(get(e, 'DESCRIPTION').value).includes('Earns'))
})

t('the family currency is honored', () => {
  const e = events(validate(buildFeedCalendar(family({ currencyCode: 'EUR' })))).get('chore-c1@chorestar.app')!
  assert.equal(unescape(get(e, 'SUMMARY').value), '🧹 Maya: Dishes (€0.50)')
})

t('rotating chore: this week only, UNTIL Saturday', () => {
  const e = events(validate(buildFeedCalendar(family()))).get('chore-c3@chorestar.app')!
  assert.equal(get(e, 'DTSTART').value, '20261020') // Tue of the week of Sun Oct 18
  assert.equal(get(e, 'RRULE').value, 'FREQ=WEEKLY;BYDAY=TU;UNTIL=20261024')
  assert.ok(unescape(get(e, 'DESCRIPTION').value).includes('Sam has it this week'))
})

t('timed chore: TZID start, 15 minutes, no DTEND', () => {
  const e = events(validate(buildFeedCalendar(family()))).get('chore-c4@chorestar.app')!
  const s = get(e, 'DTSTART')
  assert.equal(s.params.TZID, 'America/Chicago')
  assert.equal(s.value, '20261001T163000') // created Thu Oct 1
  assert.equal(get(e, 'DURATION').value, 'PT15M')
  assert.equal(get(e, 'DTEND'), undefined)
  assert.equal(unescape(get(e, 'SUMMARY').value), '🎹 Maya: Piano')
})

t('routines: daily at the type default in the family zone, duration from timers', () => {
  const evs = events(validate(buildFeedCalendar(family())))
  const morning = evs.get('routine-r1@chorestar.app')!
  assert.equal(unescape(get(morning, 'SUMMARY').value), '🌅 Maya: Morning ($0.25)')
  assert.equal(get(morning, 'DTSTART').params.TZID, 'America/Chicago')
  assert.equal(get(morning, 'DTSTART').value.slice(8), 'T070000')
  assert.equal(get(morning, 'DURATION').value, 'PT7M')
  assert.equal(get(morning, 'RRULE').value, 'FREQ=DAILY')
  const desc = unescape(get(morning, 'DESCRIPTION').value)
  assert.ok(desc.includes('1. Brush teeth (2 min)\n2. Get dressed (5 min)\n3. Make bed'))

  const bed = evs.get('routine-r2@chorestar.app')!
  assert.equal(unescape(get(bed, 'SUMMARY').value), '🌙 Sam: Bedtime')
  assert.equal(get(bed, 'DTSTART').value.slice(8), 'T193000')
  assert.equal(get(bed, 'DURATION').value, 'PT20M')
})

t('routine type defaults: after school 15:30, custom and unknown 17:00', () => {
  const evs = events(validate(buildFeedCalendar(family({
    routines: [
      { id: 'a', childId: 'kid-sam', name: 'Homework', type: 'afterschool' },
      { id: 'b', childId: 'kid-sam', name: 'Practice', type: 'custom' },
      { id: 'c', childId: 'kid-sam', name: 'Mystery', type: 'brunch' },
      { id: 'd', childId: 'kid-sam', name: 'Early', type: 'morning', time: '06:15' },
    ],
  }))))
  assert.equal(get(evs.get('routine-a@chorestar.app')!, 'DTSTART').value.slice(8), 'T153000')
  assert.equal(get(evs.get('routine-b@chorestar.app')!, 'DTSTART').value.slice(8), 'T170000')
  assert.equal(get(evs.get('routine-c@chorestar.app')!, 'DTSTART').value.slice(8), 'T170000')
  assert.equal(get(evs.get('routine-d@chorestar.app')!, 'DTSTART').value.slice(8), 'T061500')
})

t('vacation days are excluded with EXDATE in the event\'s own form', () => {
  const evs = events(validate(buildFeedCalendar(family())))
  // Nov 25-29 2026: Wed..Sun. Dishes is M/W/F -> Wed 25, Fri 27.
  const dishes = get(evs.get('chore-c1@chorestar.app')!, 'EXDATE')
  assert.equal(dishes.params.VALUE, 'DATE')
  assert.equal(dishes.value, '20261125,20261127')
  // Piano is Tue/Thu at 16:30 -> Thu 26.
  const piano = get(evs.get('chore-c4@chorestar.app')!, 'EXDATE')
  assert.equal(piano.params.TZID, 'America/Chicago')
  assert.equal(piano.value, '20261126T163000')
  // Daily routine -> all five days.
  assert.equal(get(evs.get('routine-r1@chorestar.app')!, 'EXDATE').value.split(',').length, 5)
  // The rotating chore ends this week: the November trip doesn't touch it.
  assert.equal(get(evs.get('chore-c3@chorestar.app')!, 'EXDATE'), undefined)
})

t('no vacations, no EXDATE', () => {
  const cal = validate(buildFeedCalendar(family({ vacations: [] })))
  for (const e of cal.children.filter(c => c.name === 'VEVENT')) assert.equal(get(e, 'EXDATE'), undefined)
})

t('floating times when the family has no real zone (no VTIMEZONE, no TZID)', () => {
  const ics = buildFeedCalendar(family({ timeZone: null }))
  const cal = validate(ics)
  assert.equal(cal.children.filter(c => c.name === 'VTIMEZONE').length, 0)
  assert.equal(get(cal, 'X-WR-TIMEZONE'), undefined)
  const evs = events(cal)
  const morning = get(evs.get('routine-r1@chorestar.app')!, 'DTSTART')
  assert.equal(morning.params.TZID, undefined)
  assert.match(morning.value, /^\d{8}T070000$/)
  assert.ok(!ics.includes('TZID'))
})

t('floating rotating timed chore gets a floating UNTIL; zoned one a UTC UNTIL', () => {
  const chores = [{ id: 'x', childId: 'kid-sam', name: 'Walk dog', daysOfWeek: [3], time: '17:00', rotationMode: 'rotate' as const }]
  const floating = events(validate(buildFeedCalendar(family({ timeZone: null, chores, routines: [] })))).get('chore-x@chorestar.app')!
  assert.equal(get(floating, 'RRULE').value, 'FREQ=WEEKLY;BYDAY=WE;UNTIL=20261024T235900')
  const zoned = events(validate(buildFeedCalendar(family({ chores, routines: [] })))).get('chore-x@chorestar.app')!
  assert.equal(get(zoned, 'RRULE').value, 'FREQ=WEEKLY;BYDAY=WE;UNTIL=20261025T045900Z') // 23:59 CDT
})

t('long names and descriptions fold correctly and round-trip', () => {
  const long = 'Clean the ' + 'really '.repeat(30) + 'messy room, then vacuum; ✨🧽 done'
  const ics = buildFeedCalendar(family({ chores: [{ id: 'l', childId: 'kid-maya', name: long, icon: '🧽', rewardCents: 199, notes: 'Line one\nLine two, with comma; and semicolon \\ backslash' }], routines: [] }))
  const e = events(validate(ics)).get('chore-l@chorestar.app')!
  assert.equal(unescape(get(e, 'SUMMARY').value), `🧽 Maya: ${long} ($1.99)`)
  assert.ok(unescape(get(e, 'DESCRIPTION').value).includes('Line one\nLine two, with comma; and semicolon \\ backslash'))
})

t('a chore for a kid not in the feed has no name prefix (defensive)', () => {
  const e = events(validate(buildFeedCalendar(family({ children: [], routines: [] })))).get('chore-c1@chorestar.app')!
  assert.equal(unescape(get(e, 'SUMMARY').value), '🧹 Dishes ($0.50)')
})

t('an empty family is still a valid calendar', () => {
  const cal = validate(buildFeedCalendar(family({ chores: [], routines: [], children: [] })))
  assert.equal(cal.children.filter(c => c.name === 'VEVENT').length, 0)
})

t('a feed in a zone without DST and one in the southern hemisphere both validate', () => {
  validate(buildFeedCalendar(family({ timeZone: 'Asia/Kolkata' })))
  validate(buildFeedCalendar(family({ timeZone: 'Australia/Sydney' })))
})

t('lapsed family: empty calendar with one Premium note', () => {
  const cal = validate(buildPremiumNeededCalendar({ calendarName: 'ChoreStar: Smith Family', now: NOW, appUrl: 'https://chorestar.app' }))
  const evs = cal.children.filter(c => c.name === 'VEVENT')
  assert.equal(evs.length, 1)
  assert.equal(unescape(get(evs[0], 'SUMMARY').value), '⭐ Your ChoreStar calendar feed needs Premium')
  assert.equal(get(evs[0], 'DTSTART').value, '20261019')
  assert.ok(unescape(get(evs[0], 'DESCRIPTION').value).includes('https://chorestar.app/dashboard?settings=billing'))
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
