/**
 * One-off emails from the founder hub's Compose tab: pick a family, write a
 * note, send it from hi@chorestar.app through Resend. Plain text, like the
 * outreach campaigns, so it reads as a personal note rather than a newsletter.
 *
 * Sends are logged in outreach_sent_log (migration 004) under a "direct · …"
 * campaign, so they show in Send History beside the campaigns.
 */

export interface ComposeFamily {
  userId: string
  email: string
  familyName: string
  subscription: string
  kidNames: string[]
  /** The last direct note to this family, if any. */
  lastDirectSentAt: string | null
}

export interface ComposeVars {
  family: string
  kids: string
}

/** Placeholders a note can use; shown under the editor. */
export const COMPOSE_PLACEHOLDERS: { token: string; meaning: string }[] = [
  { token: '{family}', meaning: 'family name' },
  { token: '{kids}', meaning: "kids' names, e.g. Maya and Leo" },
]

export const SUBJECT_MAX = 150
export const BODY_MAX = 10_000
/** Sending again within this many days asks for a second click. */
export const RECENT_DAYS = 3

export function joinNames(names: string[]): string {
  const n = names.map((s) => s.trim()).filter(Boolean)
  if (n.length <= 1) return n[0] ?? 'your kids'
  return `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`
}

export function varsFor(family: Pick<ComposeFamily, 'familyName' | 'kidNames'>): ComposeVars {
  return { family: family.familyName.trim() || 'there', kids: joinNames(family.kidNames) }
}

export function fillTemplate(text: string, vars: ComposeVars): string {
  return text.replace(/\{(family|kids)\}/g, (_, k: keyof ComposeVars) => vars[k])
}

export function validateCompose(input: { subject: string; body: string }): string | null {
  const subject = input.subject.trim()
  const body = input.body.trim()
  if (!subject) return 'Add a subject.'
  if (subject.length > SUBJECT_MAX) return `Keep the subject under ${SUBJECT_MAX} characters.`
  if (/[\r\n]/.test(subject)) return 'The subject has to be one line.'
  if (!body) return 'Write a message.'
  if (body.length > BODY_MAX) return `Keep the message under ${BODY_MAX.toLocaleString()} characters.`
  const unknown = body.concat(subject).match(/\{(?!family\}|kids\})[a-z]+\}/i)
  if (unknown) return `${unknown[0]} isn't a placeholder. Use {family} or {kids}.`
  return null
}

/** Whether the family heard from us directly within RECENT_DAYS. */
export function sentRecently(lastSentAt: string | null, now = new Date()): boolean {
  if (!lastSentAt) return false
  return now.getTime() - new Date(lastSentAt).getTime() < RECENT_DAYS * 86_400_000
}

export const DIRECT_PREFIX = 'direct · '

/**
 * The outreach_sent_log campaign for a direct note. The table is unique on
 * (campaign, email), so the minute is part of it: the same subject can go to
 * the same family twice.
 */
export function directCampaign(subject: string, now = new Date()): string {
  return `${DIRECT_PREFIX}${now.toISOString().slice(0, 16).replace('T', ' ')} · ${subject.trim().slice(0, 80)}`
}
