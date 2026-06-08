import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { analyzePowerUsers, type PowerUserReport, type PowerUserStat } from '@/lib/admin/power-users'
import {
  OUTREACH_CAMPAIGNS,
  OUTREACH_PRESETS,
  resolveCampaignRecipients,
} from '@/lib/admin/outreach-campaigns'
import { getRecipientSubject } from '@/lib/admin/outreach-subject'
import { getManualSendLogBatch } from '@/lib/admin/manual-send-logs'

const FROM = 'Ben Siegel <hi@chorestar.app>'
const REPLY_TO = 'hi@chorestar.app'

export interface OutreachPreviewItem {
  campaign: string
  email: string
  familyName: string
  subject: string
  text: string
}

export interface OutreachSendResult {
  campaign: string
  email: string
  familyName: string
  success: boolean
  resendId?: string
  error?: string
}

export async function loadSentEmailKeys(admin: SupabaseClient<Database>): Promise<Set<string>> {
  const { data, error } = await (admin as SupabaseClient)
    .from('outreach_sent_log' as 'profiles')
    .select('campaign, email')

  if (error) {
    if (error.message.includes('does not exist') || error.code === '42P01') {
      throw new Error('OUTREACH_TABLE_MISSING')
    }
    throw error
  }

  const keys = new Set<string>()
  for (const row of data || []) {
    const r = row as { campaign: string; email: string }
    keys.add(`${r.campaign}:${r.email.toLowerCase()}`)
  }
  return keys
}

export async function logOutreachSend(
  admin: SupabaseClient<Database>,
  entry: { campaign: string; email: string; familyName: string; resendId: string }
) {
  const { error } = await (admin as SupabaseClient)
    .from('outreach_sent_log' as 'profiles')
    .insert({
      campaign: entry.campaign,
      email: entry.email,
      family_name: entry.familyName,
      resend_id: entry.resendId,
    } as never)

  if (error) throw error
}

export async function logManualSendBatch(
  admin: SupabaseClient<Database>,
  batchId: string
): Promise<{ added: number; skipped: number; total: number; empty?: boolean; hint?: string }> {
  const batch = getManualSendLogBatch(batchId)
  if (!batch) throw new Error(`Unknown batch: ${batchId}`)

  if (!batch.entries.length) {
    return {
      added: 0,
      skipped: 0,
      total: 0,
      empty: true,
      hint: batch.hint,
    }
  }

  let sentKeys: Set<string>
  try {
    sentKeys = await loadSentEmailKeys(admin)
  } catch (err) {
    if (err instanceof Error && err.message === 'OUTREACH_TABLE_MISSING') throw err
    sentKeys = new Set()
  }

  let added = 0
  let skipped = 0

  for (const entry of batch.entries) {
    const key = `${entry.campaign}:${entry.email.toLowerCase()}`
    if (sentKeys.has(key)) {
      skipped++
      continue
    }
    await logOutreachSend(admin, {
      campaign: entry.campaign,
      email: entry.email,
      familyName: entry.familyName,
      resendId: 'manual',
    })
    sentKeys.add(key)
    added++
  }

  return { added, skipped, total: batch.entries.length }
}

export async function getOutreachSentHistory(admin: SupabaseClient<Database>) {
  const { data, error } = await (admin as SupabaseClient)
    .from('outreach_sent_log' as 'profiles')
    .select('id, campaign, email, family_name, resend_id, sent_at')
    .order('sent_at', { ascending: false })
    .limit(100)

  if (error) {
    if (error.message.includes('does not exist') || error.code === '42P01') {
      return { rows: [], tableMissing: true }
    }
    throw error
  }

  return { rows: data || [], tableMissing: false }
}

function buildPreviews(
  report: PowerUserReport,
  campaignId: string,
  sentKeys: Set<string>,
  stepEmails?: string[],
  force?: boolean
): OutreachPreviewItem[] {
  const campaign = OUTREACH_CAMPAIGNS[campaignId]
  if (!campaign) return []

  return resolveCampaignRecipients(report, campaignId, sentKeys, { stepEmails, force }).map((user) => ({
    campaign: campaignId,
    email: user.email,
    familyName: user.familyName,
    subject: getRecipientSubject(campaignId, campaign, user),
    text: campaign.text(user),
  }))
}

export async function previewOutreach(
  admin: SupabaseClient<Database>,
  options: { campaign?: string; preset?: string; force?: boolean }
): Promise<{ report: PowerUserReport; previews: OutreachPreviewItem[]; tableMissing?: boolean }> {
  const report = await analyzePowerUsers(admin)
  let sentKeys = new Set<string>()
  let tableMissing = false
  try {
    sentKeys = await loadSentEmailKeys(admin)
  } catch (e) {
    if (e instanceof Error && e.message === 'OUTREACH_TABLE_MISSING') {
      tableMissing = true
    } else {
      throw e
    }
  }

  const previews: OutreachPreviewItem[] = []

  if (options.preset) {
    const preset = OUTREACH_PRESETS[options.preset]
    if (!preset) throw new Error(`Unknown preset: ${options.preset}`)
    for (const step of preset.steps) {
      previews.push(...buildPreviews(report, step.campaign, sentKeys, step.emails, options.force))
    }
  } else if (options.campaign) {
    previews.push(...buildPreviews(report, options.campaign, sentKeys, undefined, options.force))
  }

  return { report, previews, tableMissing }
}

async function sendOne(resend: Resend, user: PowerUserStat, campaignId: string) {
  const campaign = OUTREACH_CAMPAIGNS[campaignId]
  const result = await resend.emails.send({
    from: FROM,
    to: user.email,
    replyTo: REPLY_TO,
    subject: getRecipientSubject(campaignId, campaign, user),
    text: campaign.text(user),
  })
  return result.data?.id || 'ok'
}

export async function sendOutreach(
  admin: SupabaseClient<Database>,
  options: { campaign?: string; preset?: string; force?: boolean }
): Promise<{
  results: OutreachSendResult[]
  tableMissing?: boolean
}> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

  const { report, previews, tableMissing } = await previewOutreach(admin, options)
  if (tableMissing) {
    return { results: [], tableMissing: true }
  }

  if (!previews.length) {
    return { results: [] }
  }

  const resend = new Resend(apiKey)
  const results: OutreachSendResult[] = []

  for (const preview of previews) {
    const user = report.allUsers.find((u) => u.email === preview.email)
    if (!user) continue

    try {
      const resendId = await sendOne(resend, user, preview.campaign)
      await logOutreachSend(admin, {
        campaign: preview.campaign,
        email: preview.email,
        familyName: preview.familyName,
        resendId,
      })
      results.push({
        campaign: preview.campaign,
        email: preview.email,
        familyName: preview.familyName,
        success: true,
        resendId,
      })
      await new Promise((r) => setTimeout(r, 500))
    } catch (err) {
      results.push({
        campaign: preview.campaign,
        email: preview.email,
        familyName: preview.familyName,
        success: false,
        error: err instanceof Error ? err.message : 'Send failed',
      })
    }
  }

  return { results }
}
