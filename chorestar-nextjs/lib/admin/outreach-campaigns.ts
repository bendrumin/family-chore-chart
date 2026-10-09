import type { PowerUserReport, PowerUserStat } from '@/lib/admin/power-users'
import { getAdminEmails } from '@/lib/admin/is-admin'

const FOUNDER_EXCLUDE = [...getAdminEmails(), 'bsiegel13+2@gmail.com', 'hi@chorestar.app']

export interface OutreachCampaign {
  id: string
  /** Admin-only label — never included in recipient email subjects */
  label: string
  description: string
  selectRecipients: (report: PowerUserReport) => PowerUserStat[]
  subject: (user: PowerUserStat) => string
  text: (user: PowerUserStat) => string
}

export interface OutreachPreset {
  id: string
  label: string
  description: string
  steps: { campaign: string; emails?: string[] }[]
}

function getFirstName(user: PowerUserStat): string | null {
  const local = (user.email || '').split('@')[0] || ''
  const known: Record<string, string | null> = {
    nicholemckenzie3: 'Nichole',
    yeliufiorella: 'Fiorella',
    claresse: 'Claresse',
    greer: null,
  }

  if (local.includes('.')) {
    const [a, b] = local.split('.')
    const cap = (s: string) => s && s.charAt(0).toUpperCase() + s.slice(1).replace(/\d+/g, '')
    if (a.length >= 6 && b.length >= 4) return cap(a)
    if (a.length >= 4 && b.length <= a.length + 1) return cap(a)
    if (a.length <= 6 && b.length > a.length + 1) return cap(b)
    const fallback = cap(b)
    if (fallback && fallback.length > 2) return fallback
  }

  if (known[local.toLowerCase()]) return known[local.toLowerCase()]
  return null
}

function greeting(user: PowerUserStat) {
  const name = getFirstName(user)
  return name ? `Hi ${name},` : 'Hi there,'
}

function excludeFounder(users: PowerUserStat[]) {
  return users.filter((u) => !FOUNDER_EXCLUDE.includes((u.email || '').toLowerCase()))
}

/** Whole days since the account was created; null signup sorts to the end. */
function daysSinceSignup(user: PowerUserStat): number {
  if (!user.signedUpAt) return Number.MAX_SAFE_INTEGER
  return Math.floor((Date.now() - new Date(user.signedUpAt).getTime()) / 86400000)
}

export const OUTREACH_PRESETS: Record<string, OutreachPreset> = {
  week2: {
    id: 'week2',
    label: 'Week 2',
    description: 'Routine feedback (Wootten) + inactive check-in (GOATS, Chaos Clan)',
    steps: [
      { campaign: 'routine-case-study' },
      { campaign: 'win-back', emails: ['yeliufiorella@gmail.com', 'madtail.79@gmail.com'] },
    ],
  },
}

export const OUTREACH_CAMPAIGNS: Record<string, OutreachCampaign> = {
  champion: {
    id: 'champion',
    label: 'Champion thank-you',
    description: 'Top active families: testimonial or referral ask',
    selectRecipients(report) {
      return excludeFounder(
        (report.champions || report.topByActivity || []).filter(
          (u) => (u.tenureDays || 0) >= 30 && u.activityScore >= 30 && (u.daysSinceLastActivity ?? 999) <= 30
        )
      ).slice(0, 5)
    },
    subject(user) {
      return user.subscription === 'premium' || user.subscription === 'lifetime'
        ? "You're one of our most active ChoreStar families 🙌"
        : 'Quick thank-you from the ChoreStar founder'
    },
    text(user) {
      const hi = greeting(user)
      const completions = user.choreCompletions || 0
      const kids = user.childCount || 0
      const months = Math.max(1, Math.round((user.tenureDays || 30) / 30))

      if (user.subscription === 'premium' || user.subscription === 'lifetime') {
        return `${hi}

I'm Ben, the parent who built ChoreStar. I was looking at usage on our end and noticed the ${user.familyName} has been one of our most active families, with over ${completions >= 1000 ? '1,000' : completions}+ chore check-offs with your ${kids} kid${kids === 1 ? '' : 's'}. Honestly, that makes my week.

You're also on Premium, which means a lot. I'm a solo founder growing this without a marketing budget, mostly through word of mouth from families who actually use it.

Would you be open to one of these? Totally optional, no pressure either way:

1. A short testimonial (1–2 sentences) I could feature on chorestar.app
2. Sharing ChoreStar with one family you think would benefit

If you have feedback or feature ideas, I'd genuinely love to hear those too.

Thanks for being part of this,

Ben Siegel
Founder, ChoreStar
chorestar.app`
      }

      return `${hi}

I'm Ben. I built ChoreStar for my own family and somehow yours has become one of our most consistent users. ${kids} kid${kids === 1 ? '' : 's'}, ${completions}+ chore check-offs, and you're still going strong after ${months}+ month${months === 1 ? '' : 's'}. That's rare and I wanted to say thank you personally.

Would you be willing to share either a sentence or two about what's worked for the ${user.familyName}, or a referral to one family you know who's fighting the same chore battles?

No pressure at all. And if anything has been frustrating, I'd rather hear that too.

Thanks for sticking with us,

Ben
chorestar.app`
    },
  },

  'routine-case-study': {
    id: 'routine-case-study',
    label: 'Routine feedback',
    description: 'Families using routines + kid login: feature feedback',
    selectRecipients(report) {
      return excludeFounder((report.allUsers || []).filter((u) => u.usesRoutines && u.kidPinsSet > 0)).slice(0, 3)
    },
    subject() {
      return "You're one of only 2 families using routines — from ChoreStar"
    },
    text(user) {
      const hi = greeting(user)
      return `${hi}

I'm Ben, the founder of ChoreStar. I'm writing because your family did something almost nobody else has done yet.

You set up routines for your kids, turned on kid login (PIN) for ${user.kidPinsSet} child${user.kidPinsSet === 1 ? '' : 'ren'}, and logged ${user.routineCompletions} routine completion${user.routineCompletions === 1 ? '' : 's'}.

Out of 115+ families on ChoreStar, only two are actively using routines. You're one of them.

I'd love your honest feedback, and a reply here is perfect:

1. What made you try routines vs. just a chore list?
2. Are your kids running through them on their own with PIN login?
3. What's one thing that would make routines better?

As a thank-you, I'm happy to comp 3 months of Premium, no strings attached.

Thanks for giving ChoreStar a real shot,

Ben Siegel
Founder, ChoreStar
chorestar.app`
    },
  },

  'win-back': {
    id: 'win-back',
    label: 'Inactive family check-in',
    description: 'Heavy past usage, quiet 30+ days',
    selectRecipients(report) {
      return excludeFounder(
        (report.allUsers || []).filter(
          (u) => u.choreCompletions >= 100 && (u.daysSinceLastActivity ?? 0) > 30
        )
      )
        .sort((a, b) => b.choreCompletions - a.choreCompletions)
        .slice(0, 5)
    },
    subject() {
      return 'Everything OK with ChoreStar?'
    },
    text(user) {
      const hi = greeting(user)
      const kids = user.childCount || 0
      return `${hi}

I'm Ben from ChoreStar. The ${user.familyName} logged ${user.choreCompletions} chore check-offs. That's serious usage, and I wanted to say thank you for giving it a real try.

I noticed it's been quiet for a few weeks, and I wanted to check in personally:

- Did something stop working?
- Did the schedule change and it got hard to keep up?
- Or did life just get busy? (Totally fair.)

If you want to pick it back up, reply with the ages you're working with (${kids} kid${kids === 1 ? '' : 's'} in your account) and I'll help you reset the list.

And if ChoreStar wasn't the right fit, I'd genuinely appreciate knowing why.

Either way, thanks for being one of our early power users,

Ben
chorestar.app`
    },
  },

  'stalled-setup': {
    id: 'stalled-setup',
    label: 'Stalled setup nudge',
    description: 'Added a kid in the last month but never got to chores or a PIN',
    selectRecipients(report) {
      return excludeFounder(
        (report.allUsers || []).filter((u) => {
          const age = daysSinceSignup(u)
          if (u.childCount < 1) return false
          if (age < 3 || age > 30) return false
          // Never ask a working family whether they are stuck. One premium
          // family with 645 completions matched this on kidPinsSet alone.
          const activity = (u.choreCompletions || 0) + (u.routineCompletions || 0)
          if (activity >= 5) return false
          // The two drop-offs worth an email: no chores at all, or chores that
          // only the parent can reach.
          return u.activeChoreCount === 0 || u.kidPinsSet === 0
        })
      )
        .sort((a, b) => daysSinceSignup(a) - daysSinceSignup(b))
        .slice(0, 25)
    },
    subject() {
      return 'Stuck on ChoreStar setup?'
    },
    text(user) {
      const hi = greeting(user)
      const kids = user.childCount || 0
      const noChores = user.activeChoreCount === 0
      const middle = noChores
        ? `You added ${kids === 1 ? 'a kid' : `${kids} kids`} but no chores yet. Two or three is plenty to start: something they already do, so the first week feels like winning.`
        : `You have chores set up, but nobody has a PIN yet. That is the bit most families tell me changes things, because the kid signs in themselves on any device with your family code and a 4-digit PIN, and it stops being your list to nag about.`
      return `${hi}

I'm Ben, I build ChoreStar. I saw the ${user.familyName} got part way through setup and I wanted to offer a hand rather than let it sit.

${middle}

It takes about two minutes: chorestar.app/dashboard

If something got in the way, or it just was not what you expected, reply and tell me. I read every one of these myself and it is the most useful thing I get.

Ben
chorestar.app`
    },
  },

  'never-started': {
    id: 'never-started',
    label: 'Never activated: what stopped you?',
    description: 'Signed up 31+ days ago and never completed anything. One question, no pitch.',
    selectRecipients(report) {
      return excludeFounder(
        (report.allUsers || []).filter((u) => {
          // 31+ days, so this never doubles up with stalled-setup, which owns
          // the 3 to 30 day window.
          if (daysSinceSignup(u) < 31) return false
          // Paying families get paid-never-started. This copy says we are not
          // selling them anything, which lands badly on someone already paying.
          if (u.subscription !== 'free') return false
          const did = (u.choreCompletions || 0) + (u.routineCompletions || 0) + (u.kidLogins || 0)
          return did === 0
        })
      )
        .sort((a, b) => daysSinceSignup(a) - daysSinceSignup(b))
        .slice(0, 40)
    },
    subject() {
      return 'What stopped you? (one question) — from ChoreStar'
    },
    text(user) {
      const hi = greeting(user)
      return `${hi}

I'm Ben. I built ChoreStar on my own, and you signed up a while back and never really got going with it.

I'm not writing to sell you anything. I just want to know one thing, and you are the only person who can tell me:

What stopped you?

Too fiddly to set up, not what you expected, your kids were not interested, you found something better, or you simply forgot. Any of those is a genuinely useful answer, and "I forgot" is the most common one people are shy about saying.

Just hit reply. One line is plenty.

Thank you,
Ben
chorestar.app`
    },
  },

  'no-child': {
    id: 'no-child',
    label: 'No child yet',
    description: 'Signed up 3–30 days ago and never added a kid',
    selectRecipients(report) {
      return excludeFounder(
        (report.allUsers || []).filter((u) => {
          const age = daysSinceSignup(u)
          return u.childCount < 1 && age >= 3 && age <= 30
        })
      )
        .sort((a, b) => daysSinceSignup(a) - daysSinceSignup(b))
        .slice(0, 25)
    },
    subject() {
      return 'Stuck on the first step? — from ChoreStar'
    },
    text(user) {
      const hi = greeting(user)
      return `${hi}

I'm Ben, I build ChoreStar. You created an account and haven't added a kid yet. That's the step most people pause on.

From there it is about two minutes: one child, two or three chores they already do. chorestar.app/dashboard

If something got in the way, reply and tell me. I read every one of these.

Ben
chorestar.app`
    },
  },

  'kid-login': {
    id: 'kid-login',
    label: 'Kid login nudge',
    description: 'Checking off chores in the last 3 weeks, and no kid has a PIN',
    selectRecipients(report) {
      return excludeFounder(
        (report.allUsers || []).filter((u) => {
          if (u.kidPinsSet > 0) return false
          if (u.activeChoreCount < 1) return false
          if ((u.choreCompletions || 0) < 10) return false
          return (u.daysSinceLastActivity ?? 999) <= 21
        })
      )
        .sort((a, b) => b.choreCompletions - a.choreCompletions)
        .slice(0, 15)
    },
    subject() {
      return 'Your kids can check these off themselves — from ChoreStar'
    },
    text(user) {
      const hi = greeting(user)
      return `${hi}

I'm Ben, I build ChoreStar. The ${user.familyName} has ${user.choreCompletions} chore check-offs, and right now those are coming from the parent side.

The piece most families tell me changes things is kid login. Each kid gets a 4-digit PIN, signs in on any device with your family code, and checks off their own list. No email account for them.

You set it from the child's edit screen. It takes a couple of minutes, and the list stops being yours to nag about.

If you tried it and it didn't stick, tell me what got in the way.

Ben
chorestar.app`
    },
  },

  faded: {
    id: 'faded',
    label: 'Started, then quiet',
    description: '10–99 check-offs, quiet for 30+ days. Heavier families stay on the inactive check-in.',
    selectRecipients(report) {
      return excludeFounder(
        (report.allUsers || []).filter((u) => {
          const n = u.choreCompletions || 0
          if (n < 10 || n >= 100) return false
          return (u.daysSinceLastActivity ?? 0) > 30
        })
      )
        .sort((a, b) => b.choreCompletions - a.choreCompletions)
        .slice(0, 20)
    },
    subject() {
      return 'Did ChoreStar fall off the list?'
    },
    text(user) {
      const hi = greeting(user)
      const kids = user.childCount || 0
      return `${hi}

I'm Ben from ChoreStar. The ${user.familyName} logged ${user.choreCompletions} chore check-offs, so you gave it a real try, and then it went quiet.

I wanted to check in:

- Did something stop working?
- Did the schedule change?
- Or did life just get busy? (Totally fair.)

If you want to pick it back up, reply with the ages you're working with (${kids} kid${kids === 1 ? '' : 's'} in your account) and I'll help you reset the list. If it wasn't the right fit, I'd genuinely like to know why.

Ben
chorestar.app`
    },
  },

  'paid-never-started': {
    id: 'paid-never-started',
    label: 'Paid, never started',
    description: 'Premium or Lifetime, 31+ days, and nothing completed. Preview before you send.',
    selectRecipients(report) {
      return excludeFounder(
        (report.allUsers || []).filter((u) => {
          if (u.subscription !== 'premium' && u.subscription !== 'lifetime') return false
          if (daysSinceSignup(u) < 31) return false
          const did = (u.choreCompletions || 0) + (u.routineCompletions || 0) + (u.kidLogins || 0)
          return did === 0
        })
      )
        .sort((a, b) => daysSinceSignup(a) - daysSinceSignup(b))
        .slice(0, 15)
    },
    subject() {
      return 'Can I help you get ChoreStar going?'
    },
    text(user) {
      const hi = greeting(user)
      const plan = user.subscription === 'lifetime' ? 'Lifetime' : 'Premium'
      const kids = user.childCount || 0
      const middle =
        kids < 1
          ? `You haven't added a kid yet. One child and two or three chores they already do is enough to start: chorestar.app/dashboard`
          : user.activeChoreCount === 0
            ? `You added ${kids === 1 ? 'a kid' : `${kids} kids`} and no chores yet. Two or three they already do is plenty, so the first week feels like winning.`
            : user.kidPinsSet === 0
              ? `The chores are there, and nobody has a PIN yet. That is the part that lets each kid sign in on any device with your family code and check off their own list.`
              : `The account is set up and nothing has been checked off. If something got in the way, I would rather hear it than guess.`
      return `${hi}

I'm Ben, I build ChoreStar. You're on ${plan}, and the ${user.familyName} hasn't had a chance to really use it yet. I wanted to offer a hand.

${middle}

Reply if you want me to walk you through it, or if it turned out not to be what you expected. I read these myself.

Ben
chorestar.app`
    },
  },

  'app-review': {
    id: 'app-review',
    label: 'App Store review ask',
    description:
      'Engaged families with the iPhone app (signed up in it or pay through Apple): 10+ check-offs, active in the last 14 days, 7+ days in. Asks for an honest App Store review.',
    selectRecipients(report) {
      return excludeFounder(
        (report.allUsers || []).filter((u) => {
          if (!u.onIOS) return false
          if ((u.tenureDays ?? 0) < 7) return false
          if ((u.daysSinceLastActivity ?? 999) > 14) return false
          return (u.choreCompletions || 0) + (u.routineCompletions || 0) >= 10
        })
      )
        .sort((a, b) => b.activityScore - a.activityScore)
        .slice(0, 15)
    },
    subject() {
      return 'A small favor from the ChoreStar founder'
    },
    text(user) {
      const hi = greeting(user)
      const done = (user.choreCompletions || 0) + (user.routineCompletions || 0)
      // An honest review, never "5 stars" and never a reward: App Review
      // guideline 5.6.3 forbids manipulating ratings.
      return `${hi}

I'm Ben, the parent who builds ChoreStar. Your family has checked off ${done} chores and routines so far, which is exactly what I hoped the app would do for families, so I wanted to ask a small favor.

ChoreStar is still new on the App Store, and reviews are how other parents decide whether to give it a try. If it has been working for your family, a quick rating or a sentence about what has helped would mean a lot:

https://apps.apple.com/app/id6761279049?action=write-review

And if something isn't working, I would rather hear it from you first. Just reply to this email; I read every one myself.

Thanks for being one of our early families,

Ben
chorestar.app`
    },
  },
}

export function resolveCampaignRecipients(
  report: PowerUserReport,
  campaignId: string,
  sentEmails: Set<string>,
  options?: { stepEmails?: string[]; force?: boolean }
): PowerUserStat[] {
  const campaign = OUTREACH_CAMPAIGNS[campaignId]
  if (!campaign) return []

  let recipients = campaign.selectRecipients(report)

  if (options?.stepEmails?.length) {
    const allowed = new Set(options.stepEmails.map((e) => e.toLowerCase()))
    recipients = recipients.filter((u) => allowed.has(u.email.toLowerCase()))
    for (const email of options.stepEmails) {
      if (!recipients.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        const match = report.allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase())
        if (match) recipients.push(match)
      }
    }
  }

  if (!options?.force) {
    recipients = recipients.filter((u) => !sentEmails.has(`${campaignId}:${u.email.toLowerCase()}`))
  }

  return recipients
}
