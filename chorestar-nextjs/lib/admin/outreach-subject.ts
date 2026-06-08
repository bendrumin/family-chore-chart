import type { PowerUserStat } from '@/lib/admin/power-users'
import type { OutreachCampaign } from '@/lib/admin/outreach-campaigns'

/** Internal campaign slugs — must never appear in recipient-facing subject lines. */
const INTERNAL_SLUGS = [
  'win-back',
  'routine-case-study',
  'summer-blog',
  'schools-out-blog',
  'champion',
  'week2',
  'week3',
]

/** Strip accidental internal prefixes/tags from a subject before send. */
export function sanitizeRecipientSubject(subject: string, campaignId?: string): string {
  let cleaned = subject.trim()
  const slugs = campaignId ? [campaignId, ...INTERNAL_SLUGS] : INTERNAL_SLUGS

  for (const slug of slugs) {
    const escaped = slug.replace(/-/g, '[\\s-]*')
    cleaned = cleaned.replace(new RegExp(`^${escaped}\\s*[—–:-]+\\s*`, 'i'), '')
    cleaned = cleaned.replace(
      new RegExp(`\\s*[\\[\\(]${escaped}[\\]\\)]\\s*`, 'gi'),
      ' '
    )
  }

  return cleaned.replace(/\s+/g, ' ').trim() || subject.trim()
}

export function getRecipientSubject(
  campaignId: string,
  campaign: OutreachCampaign,
  user: PowerUserStat
): string {
  return sanitizeRecipientSubject(campaign.subject(user), campaignId)
}
