/** Outreach campaign templates — personal founder emails, not bulk newsletters */

const FOUNDER_EXCLUDE = ['bsiegel13@gmail.com', 'bsiegel13+2@gmail.com']

export function getFirstName(user) {
  const local = (user.email || '').split('@')[0] || ''
  const known = {
    nicholemckenzie3: 'Nichole',
    yeliufiorella: 'Fiorella',
    claresse: 'Claresse',
    greer: null, // use Abigail from second part
  }

  if (local.includes('.')) {
    const [a, b] = local.split('.')
    const cap = (s) => s && s.charAt(0).toUpperCase() + s.slice(1).replace(/\d+/g, '')
    // firstname.lastname@ — claresse.sheppard
    if (a.length >= 6 && b.length >= 4) return cap(a)
    // shortname.surname@ — rumur.stamps (second part only slightly longer)
    if (a.length >= 4 && b.length <= a.length + 1) return cap(a)
    // initial.firstname@ — greer.abigail
    if (a.length <= 6 && b.length > a.length + 1) return cap(b)
    const fallback = cap(b)
    if (fallback && fallback.length > 2) return fallback
  }

  const alpha = local.replace(/\d+/g, '')
  if (known[local.toLowerCase()]) return known[local.toLowerCase()]
  if (alpha.length >= 4 && /^[a-z]+$/i.test(alpha) && known[alpha.toLowerCase()]) {
    return known[alpha.toLowerCase()]
  }
  return null
}

function greeting(user) {
  const name = getFirstName(user)
  return name ? `Hi ${name},` : 'Hi there,'
}

function excludeFounder(users) {
  return users.filter((u) => !FOUNDER_EXCLUDE.includes((u.email || '').toLowerCase()))
}

const INTERNAL_SLUGS = ['win-back', 'routine-case-study', 'summer-blog', 'schools-out-blog', 'champion', 'week2', 'week3']

/** Strip internal campaign slugs from recipient-facing subject lines. */
export function sanitizeRecipientSubject(subject, campaignId) {
  let cleaned = subject.trim()
  const slugs = campaignId ? [campaignId, ...INTERNAL_SLUGS] : INTERNAL_SLUGS
  for (const slug of slugs) {
    const escaped = slug.replace(/-/g, '[\\s-]*')
    cleaned = cleaned.replace(new RegExp(`^${escaped}\\s*[—–:-]+\\s*`, 'i'), '')
    cleaned = cleaned.replace(new RegExp(`\\s*[\\[\\(]${escaped}[\\]\\)]\\s*`, 'gi'), ' ')
  }
  return cleaned.replace(/\s+/g, ' ').trim() || subject.trim()
}

export function getRecipientSubject(campaignId, campaign, user) {
  return sanitizeRecipientSubject(campaign.subject(user), campaignId)
}

/** Multi-step outreach sequences */
export const PRESETS = {
  week2: {
    id: 'week2',
    description: 'Week 2: Routine feedback (Wootten) + inactive check-in (GOATS, Chaos Clan)',
    steps: [
      { campaign: 'routine-case-study' },
      {
        campaign: 'win-back',
        // Week 2 win-back targets only (not the full win-back segment)
        emails: ['yeliufiorella@gmail.com', 'madtail.79@gmail.com'],
      },
    ],
  },
  week3: {
    id: 'week3',
    description: "School's out guide → recently active families",
    steps: [{ campaign: 'schools-out-blog' }],
  },
}

export const CAMPAIGNS = {
  champion: {
    id: 'champion',
    label: 'Champion thank-you',
    description: 'Top active families — testimonial or referral ask',
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

I'm Ben — the parent who built ChoreStar. I was looking at usage on our end and noticed the ${user.familyName} has been one of our most active families — over ${completions >= 1000 ? '1,000' : completions}+ chore check-offs with your ${kids} kid${kids === 1 ? '' : 's'}. Honestly, that makes my week.

You're also on Premium, which means a lot. I'm a solo founder growing this without a marketing budget, mostly through word of mouth from families who actually use it.

Would you be open to one of these? Totally optional — no pressure either way:

1. A short testimonial (1–2 sentences) I could feature on chorestar.app
2. Sharing ChoreStar with one family you think would benefit

If you have feedback or feature ideas, I'd genuinely love to hear those too.

Thanks for being part of this,

Ben Siegel
Founder, ChoreStar
chorestar.app`
      }

      return `${hi}

I'm Ben — I built ChoreStar for my own family and somehow yours has become one of our most consistent users. ${kids} kid${kids === 1 ? '' : 's'}, ${completions}+ chore check-offs, and you're still going strong after ${months}+ month${months === 1 ? '' : 's'}. That's rare and I wanted to say thank you personally.

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
    description: 'Families using routines + kid login — feature feedback',
    selectRecipients(report) {
      return excludeFounder((report.allUsers || []).filter((u) => u.usesRoutines && u.kidPinsSet > 0)).slice(0, 3)
    },
    subject() {
      return "You're one of only 2 families using routines — quick question?"
    },
    text(user) {
      const hi = greeting(user)
      return `${hi}

I'm Ben, the founder of ChoreStar. I had to reach out because your family did something almost nobody else has done yet.

You set up routines for your kids, turned on kid login (PIN) for ${user.kidPinsSet} child${user.kidPinsSet === 1 ? '' : 'ren'}, and logged ${user.routineCompletions} routine completion${user.routineCompletions === 1 ? '' : 's'}.

Out of 115+ families on ChoreStar, only two are actively using routines. You're one of them.

I'd love your honest feedback — reply here is perfect:

1. What made you try routines vs. just a chore list?
2. Are your kids running through them on their own with PIN login?
3. What's one thing that would make routines better?

As a thank-you, I'm happy to comp 3 months of Premium — no strings attached.

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
      const quietWeeks = Math.round((user.daysSinceLastActivity || 30) / 7)
      return `${hi}

I'm Ben from ChoreStar. The ${user.familyName} logged ${user.choreCompletions} chore check-offs — that's serious usage, and I wanted to say thank you for giving it a real try.

I noticed it's been quiet for a few weeks, and I wanted to check in personally:

- Did something stop working?
- Did summer schedules make it hard to keep up?
- Or did life just get busy? (Totally fair.)

If you want to pick it back up, we added summer chore suggestions and a sunny seasonal theme this month. Happy to help you tweak your chore list if you reply with what ages you're working with (${kids} kid${kids === 1 ? '' : 's'} in your account).

And if ChoreStar wasn't the right fit, I'd genuinely appreciate knowing why.

Either way, thanks for being one of our early power users,

Ben
chorestar.app`
    },
  },

  'schools-out-blog': {
    id: 'schools-out-blog',
    label: "School's out guide",
    description: "Recently active users — share school's out summer plan post",
    selectRecipients(report) {
      return excludeFounder(
        (report.recentlyActive || []).filter((u) => (u.daysSinceLastActivity ?? 999) <= 14)
      ).slice(0, 10)
    },
    subject() {
      return "School's out — now what?"
    },
    text(user) {
      const hi = greeting(user)
      return `${hi}

I'm Ben from ChoreStar — quick share now that summer break is here.

We wrote a short guide for the first two weeks: sleep, screens, a light daily rhythm, and when to add chores (hint: not day one): https://chorestar.app/blog/schools-out-summer-plan

Your family already has ${user.choreCompletions}+ check-offs in ChoreStar, so you're ahead of the game if you want to layer in routines when you're ready.

No reply needed — just thought it might help.

Ben
chorestar.app`
    },
  },

  'summer-blog': {
    id: 'summer-blog',
    label: 'Summer chore list',
    description: 'Recently active users — share summer chores blog post',
    selectRecipients(report) {
      return excludeFounder(
        (report.recentlyActive || []).filter((u) => (u.daysSinceLastActivity ?? 999) <= 14)
      ).slice(0, 10)
    },
    subject() {
      return 'Summer chores without the daily nagging'
    },
    text(user) {
      const hi = greeting(user)
      return `${hi}

I'm Ben from ChoreStar — quick share that might help now that school's out.

We published a summer chore list by age (outdoor jobs, screen-time swaps, simple morning routine): https://chorestar.app/blog/summer-chores-for-kids

Your family already has ${user.choreCompletions}+ check-offs in ChoreStar, so you're ahead of the game. The summer suggestions in the app (Settings → add chores) might be a fun refresh if the kids need new tasks.

No reply needed — just thought it might be useful.

Ben
chorestar.app`
    },
  },
}
