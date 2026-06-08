#!/usr/bin/env node
/**
 * ChoreStar founder outreach sender (personal 1:1 emails via Resend)
 *
 * Usage:
 *   node scripts/send-outreach.mjs --list
 *   node scripts/send-outreach.mjs --campaign champion              # dry-run (default)
 *   node scripts/send-outreach.mjs --preset week2                   # preview week 2 sequence
 *   node scripts/send-outreach.mjs --preset week2 --send            # send week 2
 *   node scripts/send-outreach.mjs --campaign win-back --send
 *   node scripts/send-outreach.mjs --sent
 *   node scripts/send-outreach.mjs --campaign champion --email x@y.z --mark-sent
 *   node scripts/send-outreach.mjs --mark-week1                     # log manual week 1 sends
 *
 * Requires in .env.local: RESEND_API_KEY
 * Reads recipients from scripts/output/power-users-report.json (run analyze-power-users.mjs first)
 */

import { Resend } from 'resend'
import { config } from 'dotenv'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { CAMPAIGNS, PRESETS, getRecipientSubject } from './outreach/campaigns.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appRoot = join(__dirname, '..')

config({ path: join(appRoot, '.env.local') })

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = 'Ben Siegel <hi@chorestar.app>'
const REPLY_TO = 'hi@chorestar.app'
const REPORT_PATH = join(__dirname, 'output', 'power-users-report.json')
const SENT_LOG_PATH = join(__dirname, 'output', 'outreach-sent-log.json')
const DELAY_MS = 500
const DELAY_BETWEEN_CAMPAIGNS_MS = 2000

const WEEK1_CHAMPION_EMAILS = [
  'greer.abigail@gmail.com',
  'claresse.sheppard@gmail.com',
  'nicholemckenzie3@gmail.com',
]

function loadReport() {
  if (!existsSync(REPORT_PATH)) {
    console.error(`Missing ${REPORT_PATH}`)
    console.error('Run first: node scripts/analyze-power-users.mjs')
    process.exit(1)
  }
  return JSON.parse(readFileSync(REPORT_PATH, 'utf8'))
}

function loadSentLog() {
  if (!existsSync(SENT_LOG_PATH)) return { sends: [] }
  return JSON.parse(readFileSync(SENT_LOG_PATH, 'utf8'))
}

function saveSentLog(log) {
  mkdirSync(dirname(SENT_LOG_PATH), { recursive: true })
  writeFileSync(SENT_LOG_PATH, JSON.stringify(log, null, 2))
}

function alreadySent(log, campaignId, email) {
  const key = email.toLowerCase()
  return log.sends.some((s) => s.campaign === campaignId && s.email.toLowerCase() === key)
}

function parseArgs(argv) {
  const args = {
    dryRun: true,
    campaign: null,
    preset: null,
    email: null,
    force: false,
    list: false,
    sent: false,
    markSent: false,
    markWeek1: false,
  }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--send') args.dryRun = false
    else if (a === '--dry-run') args.dryRun = true
    else if (a === '--force') args.force = true
    else if (a === '--list') args.list = true
    else if (a === '--sent') args.sent = true
    else if (a === '--mark-sent') args.markSent = true
    else if (a === '--mark-week1') args.markWeek1 = true
    else if (a === '--campaign' && argv[i + 1]) args.campaign = argv[++i]
    else if (a === '--preset' && argv[i + 1]) args.preset = argv[++i]
    else if (a === '--email' && argv[i + 1]) args.email = argv[++i]
  }
  return args
}

async function sendEmail(resend, { to, subject, text }) {
  const result = await resend.emails.send({
    from: FROM,
    to,
    replyTo: REPLY_TO,
    subject,
    text,
  })
  return result.data?.id || 'ok'
}

function preview(user, campaign) {
  console.log('─'.repeat(60))
  console.log(`To:      ${user.email}`)
  console.log(`Family:  ${user.familyName}`)
  console.log(`Subject: ${getRecipientSubject(campaign.id, campaign, user)}`)
  console.log('─'.repeat(60))
  console.log(campaign.text(user))
  console.log('')
}

function resolveRecipients(report, campaign, sentLog, { stepEmails, singleEmail, force }) {
  let recipients = campaign.selectRecipients(report)

  if (stepEmails?.length) {
    const allowed = new Set(stepEmails.map((e) => e.toLowerCase()))
    recipients = recipients.filter((u) => allowed.has(u.email.toLowerCase()))
    // Include preset emails even if segment filter missed them
    for (const email of stepEmails) {
      if (!recipients.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        const match = (report.allUsers || []).find((u) => u.email?.toLowerCase() === email.toLowerCase())
        if (match) recipients.push(match)
      }
    }
  }

  if (singleEmail) {
    const match = (report.allUsers || []).find((u) => u.email?.toLowerCase() === singleEmail.toLowerCase())
    if (!match) throw new Error(`Email not found in report: ${singleEmail}`)
    recipients = [match]
  }

  if (!force) {
    recipients = recipients.filter((u) => !alreadySent(sentLog, campaign.id, u.email))
  }

  return recipients
}

async function runCampaign({
  campaignId,
  report,
  sentLog,
  dryRun,
  resend,
  force,
  singleEmail,
  stepEmails,
}) {
  const campaign = CAMPAIGNS[campaignId]
  if (!campaign) throw new Error(`Unknown campaign: ${campaignId}`)

  const recipients = resolveRecipients(report, campaign, sentLog, { stepEmails, singleEmail, force })

  if (!recipients.length) {
    console.log(`  ⏭  ${campaignId}: nothing to send (already sent or empty)\n`)
    return { sent: 0, failed: 0, skipped: true }
  }

  console.log(`▶ ${campaign.label || campaign.id} — ${campaign.description}`)
  console.log(`  Recipients: ${recipients.length}\n`)

  let sent = 0
  let failed = 0

  for (const user of recipients) {
    preview(user, campaign)

    if (!dryRun) {
      try {
        const id = await sendEmail(resend, {
          to: user.email,
          subject: getRecipientSubject(campaignId, campaign, user),
          text: campaign.text(user),
        })
        sentLog.sends.push({
          sentAt: new Date().toISOString(),
          campaign: campaignId,
          email: user.email,
          familyName: user.familyName,
          resendId: id,
        })
        saveSentLog(sentLog)
        console.log(`✅ Sent to ${user.email} (${id})\n`)
        sent++
        await new Promise((r) => setTimeout(r, DELAY_MS))
      } catch (err) {
        console.error(`❌ Failed ${user.email}: ${err.message}\n`)
        failed++
      }
    }
  }

  if (dryRun) {
    console.log(`  Previewed ${recipients.length} email(s) for ${campaignId}\n`)
  }

  return { sent, failed, skipped: false, count: recipients.length }
}

async function runPreset(presetId, args) {
  const preset = PRESETS[presetId]
  if (!preset) throw new Error(`Unknown preset: ${presetId}`)

  if (!args.dryRun && !RESEND_API_KEY) {
    console.error('RESEND_API_KEY missing from .env.local — cannot send.')
    process.exit(1)
  }

  const report = loadReport()
  const sentLog = loadSentLog()
  const resend = args.dryRun ? null : new Resend(RESEND_API_KEY)

  console.log(`Preset: ${preset.id} — ${preset.description}`)
  console.log(`Mode: ${args.dryRun ? 'DRY RUN (pass --send to deliver)' : 'SEND'}`)
  console.log(`Steps: ${preset.steps.length}\n`)

  let totalSent = 0
  let totalFailed = 0
  let totalPreviewed = 0

  for (let i = 0; i < preset.steps.length; i++) {
    const step = preset.steps[i]
    if (i > 0 && !args.dryRun) {
      console.log(`⏳ Waiting ${DELAY_BETWEEN_CAMPAIGNS_MS}ms before next campaign...\n`)
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_CAMPAIGNS_MS))
    }

    const result = await runCampaign({
      campaignId: step.campaign,
      report,
      sentLog,
      dryRun: args.dryRun,
      resend,
      force: args.force,
      stepEmails: step.emails,
    })

    totalSent += result.sent
    totalFailed += result.failed
    if (!result.skipped) totalPreviewed += result.count || 0
  }

  if (args.dryRun) {
    console.log(`Dry run complete — ${totalPreviewed} email(s) previewed across ${preset.steps.length} step(s).`)
    console.log('Add --send when ready.')
  } else {
    console.log(`Preset done. Sent: ${totalSent}, Failed: ${totalFailed}`)
  }
}

async function main() {
  const args = parseArgs(process.argv)

  if (args.list) {
    console.log('Campaigns:\n')
    for (const c of Object.values(CAMPAIGNS)) {
      console.log(`  ${c.id}`)
      console.log(`    ${c.description}\n`)
    }
    console.log('Presets:\n')
    for (const p of Object.values(PRESETS)) {
      console.log(`  ${p.id}`)
      console.log(`    ${p.description}`)
      console.log(`    Steps: ${p.steps.map((s) => s.campaign).join(' → ')}\n`)
    }
    console.log('Examples:')
    console.log('  node scripts/send-outreach.mjs --preset week2')
    console.log('  node scripts/send-outreach.mjs --preset week2 --send')
    console.log('  node scripts/send-outreach.mjs --mark-week1')
    return
  }

  if (args.sent) {
    const log = loadSentLog()
    if (!log.sends.length) {
      console.log('No outreach emails logged yet.')
      return
    }
    console.log(`Outreach send history (${log.sends.length}):\n`)
    log.sends.forEach((s) => {
      console.log(`  ${s.sentAt} | ${s.campaign} | ${s.email} | ${s.familyName} | ${s.resendId || 'dry-run'}`)
    })
    return
  }

  if (args.markWeek1) {
    const log = loadSentLog()
    let added = 0
    for (const email of WEEK1_CHAMPION_EMAILS) {
      if (!alreadySent(log, 'champion', email)) {
        log.sends.push({
          sentAt: new Date().toISOString(),
          campaign: 'champion',
          email,
          familyName: '(manual week1)',
          resendId: 'manual',
        })
        added++
      }
    }
    saveSentLog(log)
    console.log(`Week 1 champion sends logged: ${added} new, ${WEEK1_CHAMPION_EMAILS.length - added} already recorded.`)
    return
  }

  if (args.markSent) {
    if (!args.campaign || !args.email) {
      console.error('--mark-sent requires --campaign and --email')
      process.exit(1)
    }
    const log = loadSentLog()
    if (alreadySent(log, args.campaign, args.email)) {
      console.log(`Already logged: ${args.email} for ${args.campaign}`)
      return
    }
    log.sends.push({
      sentAt: new Date().toISOString(),
      campaign: args.campaign,
      email: args.email,
      familyName: '(manual)',
      resendId: 'manual',
    })
    saveSentLog(log)
    console.log(`Logged manual send: ${args.campaign} → ${args.email}`)
    return
  }

  if (args.preset) {
    await runPreset(args.preset, args)
    return
  }

  if (!args.campaign || !CAMPAIGNS[args.campaign]) {
    console.error('Specify --campaign <id> or --preset <id>. Run with --list to see options.')
    process.exit(1)
  }

  if (!args.dryRun && !RESEND_API_KEY) {
    console.error('RESEND_API_KEY missing from .env.local — cannot send.')
    process.exit(1)
  }

  const report = loadReport()
  const sentLog = loadSentLog()
  const resend = args.dryRun ? null : new Resend(RESEND_API_KEY)

  console.log(`Mode: ${args.dryRun ? 'DRY RUN (pass --send to deliver)' : 'SEND'}\n`)

  const result = await runCampaign({
    campaignId: args.campaign,
    report,
    sentLog,
    dryRun: args.dryRun,
    resend,
    force: args.force,
    singleEmail: args.email,
  })

  if (args.dryRun && !result.skipped) {
    console.log('Add --send when ready.')
  } else if (!args.dryRun && !result.skipped) {
    console.log(`Done. Sent: ${result.sent}, Failed: ${result.failed}`)
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
