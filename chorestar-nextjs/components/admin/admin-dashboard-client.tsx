'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AmbientBackground } from '@/components/ui/ambient-background'
import {
  ArrowLeft,
  BarChart3,
  Mail,
  RefreshCw,
  Send,
  Shield,
  Users,
} from 'lucide-react'
import type { PowerUserReport, PowerUserStat } from '@/lib/admin/types'

interface CampaignMeta {
  id: string
  label: string
  description: string
}

interface PresetStep {
  campaign: string
  emails?: string[]
}

interface PresetMeta {
  id: string
  label: string
  description: string
  steps: PresetStep[]
}

interface ManualSendLogMeta {
  id: string
  label: string
  hint?: string
  count: number
}

interface OutreachPreview {
  campaign: string
  email: string
  familyName: string
  subject: string
  text: string
}

interface SentRow {
  id: string
  campaign: string
  email: string
  family_name: string | null
  resend_id: string | null
  sent_at: string
}

type Tab = 'users' | 'outreach' | 'history'

const adminCardClass =
  'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm backdrop-blur-none'

function tierColor(tier: string) {
  switch (tier) {
    case 'power':
      return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30'
    case 'active':
      return 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
    case 'light':
      return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30'
    default:
      return 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
  }
}

export function AdminDashboardClient() {
  const [tab, setTab] = useState<Tab>('users')
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<PowerUserReport | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignMeta[]>([])
  const [presets, setPresets] = useState<PresetMeta[]>([])
  const [manualSendLogs, setManualSendLogs] = useState<ManualSendLogMeta[]>([])
  const [selected, setSelected] = useState('preset:week3')
  const [loggingBatch, setLoggingBatch] = useState<string | null>(null)
  const [previews, setPreviews] = useState<OutreachPreview[]>([])
  const [sentRows, setSentRows] = useState<SentRow[]>([])
  const [tableMissing, setTableMissing] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [authError, setAuthError] = useState(false)

  const loadReport = useCallback(async () => {
    setLoading(true)
    setAuthError(false)
    try {
      const res = await fetch('/api/admin/power-users')
      if (res.status === 404) {
        setAuthError(true)
        return
      }
      if (!res.ok) throw new Error('Failed to load')
      setReport(await res.json())
    } catch {
      toast.error('Could not load power user report')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMeta = useCallback(async () => {
    const res = await fetch('/api/admin/outreach')
    if (res.ok) {
      const data = await res.json()
      setCampaigns(data.campaigns || [])
      setPresets(data.presets || [])
      setManualSendLogs(data.manualSendLogs || [])
    }
  }, [])

  const loadHistory = useCallback(async () => {
    const res = await fetch('/api/admin/outreach/sent')
    if (res.ok) {
      const data = await res.json()
      setSentRows(data.rows || [])
      setTableMissing(!!data.tableMissing)
    }
  }, [])

  useEffect(() => {
    loadReport()
    loadMeta()
    loadHistory()
  }, [loadReport, loadMeta, loadHistory])

  const loadPreview = async () => {
    setPreviewLoading(true)
    try {
      const [type, id] = selected.split(':')
      const param = type === 'preset' ? `preset=${id}` : `campaign=${id}`
      const res = await fetch(`/api/admin/outreach?${param}`)
      if (!res.ok) throw new Error('Preview failed')
      const data = await res.json()
      setPreviews(data.previews || [])
      setTableMissing(!!data.tableMissing)
      if (!data.previews?.length) {
        toast.info('No recipients — everyone may already have been emailed for this campaign')
      }
    } catch {
      toast.error('Could not load preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleSend = async () => {
    if (!previews.length) {
      toast.error('Preview first — no emails queued')
      return
    }
    if (!confirm(`Send ${previews.length} personal email(s) via Resend?`)) return

    setSending(true)
    try {
      const [type, id] = selected.split(':')
      const body = type === 'preset' ? { preset: id } : { campaign: id }
      const res = await fetch('/api/admin/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Send failed')

      const ok = data.results?.filter((r: { success: boolean }) => r.success).length || 0
      const fail = data.results?.filter((r: { success: boolean }) => !r.success).length || 0
      toast.success(`Sent ${ok} email(s)${fail ? `, ${fail} failed` : ''}`)
      setPreviews([])
      loadHistory()
      loadReport()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  const logManualBatch = async (batchId: string) => {
    const meta = manualSendLogs.find((b) => b.id === batchId)
    if (meta?.count === 0) {
      toast.info(meta.hint || 'No manual entries for this week — sends via preset auto-log.')
      return
    }
    if (!confirm(`Log ${meta?.count ?? ''} manual send(s) for ${meta?.label ?? batchId}?`)) return

    setLoggingBatch(batchId)
    try {
      const res = await fetch('/api/admin/outreach/sent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: batchId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to log')

      if (data.empty) {
        toast.info(data.hint || 'Nothing to log')
        return
      }

      toast.success(
        `${meta?.label}: ${data.added} logged${data.skipped ? `, ${data.skipped} already recorded` : ''}`
      )
      loadHistory()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to log sends')
    } finally {
      setLoggingBatch(null)
    }
  }

  const selectedPreset = selected.startsWith('preset:')
    ? presets.find((p) => p.id === selected.split(':')[1])
    : null

  const campaignLabel = (id: string) => campaigns.find((c) => c.id === id)?.label || id

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--gradient-bg)' }}>
      <AmbientBackground />
      <header className="relative z-10 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-indigo-500 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white inline-flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-500" />
              Founder Admin
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={loadReport} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {authError && (
          <div className="mb-6 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-900 dark:text-red-200">
            Admin API returned not found. Set <code className="text-xs px-1 rounded bg-red-100 dark:bg-red-900/40">ADMIN_EMAIL=bsiegel13@gmail.com</code> in
            your environment and restart the dev server.
          </div>
        )}

        {tableMissing && (
          <div className="mb-6 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-900 dark:text-amber-200">
            <strong>Setup needed:</strong> Run{' '}
            <code className="text-xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded">database-migrations/004_outreach_sent_log.sql</code>{' '}
            in the Supabase SQL Editor before sending outreach from the UI.
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {([
            ['users', 'Power Users', Users],
            ['outreach', 'Outreach', Send],
            ['history', 'Send History', Mail],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === id
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <>
            {report && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Profiles', value: report.totals.profiles },
                  { label: 'With activity', value: report.totals.withAnyActivity },
                  { label: 'Power users', value: report.totals.powerUsers },
                  { label: 'Premium', value: report.totals.premiumOrLifetime },
                ].map(({ label, value }) => (
                  <Card key={label} className={adminCardClass}>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-black text-gray-900 dark:text-white">{value}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Card className={adminCardClass}>
              <CardHeader>
                <CardTitle className="text-base text-gray-900 dark:text-white inline-flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Top families by activity
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {loading ? (
                  <p className="text-sm text-gray-500">Loading…</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                        <th className="pb-2 pr-4">Family</th>
                        <th className="pb-2 pr-4">Score</th>
                        <th className="pb-2 pr-4">Chores</th>
                        <th className="pb-2 pr-4">Last active</th>
                        <th className="pb-2">Tier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(report?.topByActivity || []).slice(0, 15).map((u: PowerUserStat) => (
                        <tr key={u.userId} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{u.familyName}</td>
                          <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{Math.round(u.activityScore)}</td>
                          <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{u.choreCompletions}</td>
                          <td className="py-2 pr-4">
                            {u.daysSinceLastActivity != null ? `${u.daysSinceLastActivity}d ago` : '—'}
                          </td>
                          <td className="py-2">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tierColor(u.engagementTier)}`}>
                              {u.engagementTier}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {tab === 'outreach' && (
          <div className="space-y-6">
            <Card className={adminCardClass}>
              <CardHeader>
                <CardTitle className="text-base text-gray-900 dark:text-white">Send founder outreach</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <optgroup label="Presets (week sequences)">
                    {presets.map((p) => (
                      <option key={p.id} value={`preset:${p.id}`}>
                        {p.label} — {p.description}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Campaigns">
                    {campaigns.map((c) => (
                      <option key={c.id} value={`campaign:${c.id}`}>
                        {c.label} — {c.description}
                      </option>
                    ))}
                  </optgroup>
                </select>

                {selectedPreset && (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-3 py-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <p className="font-semibold text-gray-700 dark:text-gray-300">This preset includes:</p>
                    {selectedPreset.steps.map((step) => (
                      <p key={step.campaign}>
                        • {campaignLabel(step.campaign)}
                        {step.emails?.length
                          ? ` (${step.emails.length} specific ${step.emails.length === 1 ? 'address' : 'addresses'})`
                          : ' (segment from power-user report)'}
                      </p>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button onClick={loadPreview} disabled={previewLoading} variant="outline">
                    {previewLoading ? 'Loading…' : 'Preview emails'}
                  </Button>
                  <Button onClick={handleSend} disabled={sending || !previews.length} variant="gradient">
                    <Send className="w-4 h-4 mr-2" />
                    {sending ? 'Sending…' : `Send ${previews.length || ''} email(s)`}
                  </Button>
                </div>

                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Log manual sends (emailed outside admin)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {manualSendLogs.map((batch) => (
                      <Button
                        key={batch.id}
                        onClick={() => logManualBatch(batch.id)}
                        variant="outline"
                        size="sm"
                        disabled={loggingBatch === batch.id}
                      >
                        {loggingBatch === batch.id ? 'Logging…' : `Log ${batch.label}`}
                        {batch.count > 0 && (
                          <span className="ml-1 text-gray-500 dark:text-gray-400">({batch.count})</span>
                        )}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Skips addresses already in send history. Week 3 auto-logs when you send from the preset above.
                  </p>
                </div>
              </CardContent>
            </Card>

            {previews.map((p) => (
              <Card key={`${p.campaign}-${p.email}`} className={adminCardClass}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
                    {p.familyName} · {p.email}
                  </CardTitle>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Subject: {p.subject}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Internal log tag: {p.campaign}
                  </p>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs whitespace-pre-wrap text-gray-700 dark:text-gray-300 font-sans leading-relaxed">
                    {p.text}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {tab === 'history' && (
          <Card className={adminCardClass}>
            <CardHeader>
              <CardTitle className="text-base text-gray-900 dark:text-white">Outreach send log</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {sentRows.length === 0 ? (
                <p className="text-sm text-gray-500">No sends logged yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      <th className="pb-2 pr-4">When</th>
                      <th className="pb-2 pr-4">Log tag</th>
                      <th className="pb-2 pr-4">Email</th>
                      <th className="pb-2">Family</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sentRows.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                          {new Date(row.sent_at).toLocaleDateString()}
                        </td>
                        <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{row.campaign}</td>
                        <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{row.email}</td>
                        <td className="py-2 text-gray-700 dark:text-gray-300">{row.family_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
