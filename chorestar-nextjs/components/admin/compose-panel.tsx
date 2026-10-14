'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Search, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BODY_MAX,
  COMPOSE_PLACEHOLDERS,
  fillTemplate,
  validateCompose,
  varsFor,
  type ComposeFamily,
} from '@/lib/admin/compose'

const cardClass = 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm backdrop-blur-none'
const inputClass =
  'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400'

const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

/** Starting points; every one is edited before it goes. */
const STARTERS: { label: string; subject: string; body: string }[] = [
  {
    label: 'Check-in',
    subject: 'How is ChoreStar going for {family}?',
    body: `Hi {family},

I'm Ben, the parent who builds ChoreStar. I wanted to check in: how is it going with {kids}? Is anything confusing, missing, or not working the way you hoped?

Just hit reply. I read every email myself.

Ben
chorestar.app`,
  },
  {
    label: 'Thank you',
    subject: 'Thank you from ChoreStar',
    body: `Hi {family},

Thank you for using ChoreStar with {kids}. Families like yours are why I keep building it.

If there's one thing you'd change, I'd love to hear it. Just reply to this email.

Ben
chorestar.app`,
  },
  {
    label: 'Before you go',
    subject: 'A quick question from ChoreStar',
    body: `Hi {family},

I saw you turned off Premium's renewal, and I wanted to ask honestly: was something not working, or missing? Your answer helps me make ChoreStar better.

If Premium isn't for you, no problem at all. The free plan keeps working for {kids}.

Thanks for being one of our early families.

Ben
chorestar.app`,
  },
]

export function ComposePanel({ initialUserId }: { initialUserId?: string | null }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ComposeFamily[]>([])
  const [searching, setSearching] = useState(false)
  const [family, setFamily] = useState<ComposeFamily | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [recentWarning, setRecentWarning] = useState<string | null>(null)

  // Opened from a family's Email button: load that family.
  useEffect(() => {
    if (!initialUserId) return
    fetch(`/api/admin/compose?userId=${encodeURIComponent(initialUserId)}`)
      .then((r) => r.json())
      .then((d) => d.families?.[0] && setFamily(d.families[0]))
      .catch(() => toast.error('Could not load that family'))
  }, [initialUserId])

  // Search as you type, debounced.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/admin/compose?q=${encodeURIComponent(q)}`)
        const d = await res.json()
        setResults(d.families ?? [])
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  const preview = useMemo(() => {
    if (!family) return null
    const vars = varsFor(family)
    return { subject: fillTemplate(subject, vars), body: fillTemplate(body, vars) }
  }, [family, subject, body])

  const problem = validateCompose({ subject, body })

  async function send(confirmRecent = false) {
    if (!family || problem) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: family.userId, subject, body, confirmRecent }),
      })
      const d = await res.json()
      if (res.status === 409 && d.recent) {
        setRecentWarning(d.lastDirectSentAt)
        return
      }
      if (!res.ok) throw new Error(d.error || 'Send failed')
      toast.success(`Sent to ${d.to}`)
      setRecentWarning(null)
      setFamily({ ...family, lastDirectSentAt: new Date().toISOString() })
      setSubject('')
      setBody('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Write a note</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Plain text from Ben Siegel &lt;hi@chorestar.app&gt;. Replies come to hi@chorestar.app.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recipient */}
          {family ? (
            <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">{family.familyName || 'Unnamed family'}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{family.email}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {family.subscription} · {family.kidNames.length ? family.kidNames.join(', ') : 'no kids yet'}
                  {family.lastDirectSentAt && ` · last note ${day(family.lastDirectSentAt)}`}
                </p>
                {family.email.endsWith('privaterelay.appleid.com') && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Hide My Email address: Apple forwards it only if chorestar.app is registered as a sender in your Apple developer account.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setFamily(null)
                  setRecentWarning(null)
                }}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                aria-label="Choose a different family"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              <label htmlFor="compose-search" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                To
              </label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  id="compose-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by email or family name"
                  className={`${inputClass} pl-9`}
                  autoComplete="off"
                />
              </div>
              {(results.length > 0 || searching) && (
                <ul className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
                  {searching && !results.length && <li className="p-3 text-sm text-gray-500 dark:text-gray-400">Searching…</li>}
                  {results.map((f) => (
                    <li key={f.userId}>
                      <button
                        type="button"
                        onClick={() => {
                          setFamily(f)
                          setQuery('')
                          setResults([])
                        }}
                        className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{f.familyName || 'Unnamed family'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {f.email} · {f.subscription}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Starters */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 self-center">Start from:</span>
            {STARTERS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  if ((subject || body) && !window.confirm('Replace what you have written?')) return
                  setSubject(s.subject)
                  setBody(s.body)
                }}
                className="text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {s.label}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="compose-subject" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Subject
            </label>
            <input id="compose-subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={`${inputClass} mt-1`} />
          </div>

          <div>
            <label htmlFor="compose-body" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Message
            </label>
            <textarea
              id="compose-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              maxLength={BODY_MAX}
              className={`${inputClass} mt-1 font-mono leading-relaxed`}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {COMPOSE_PLACEHOLDERS.map((p) => (
                <span key={p.token} className="mr-3">
                  <code className="bg-gray-100 dark:bg-gray-900 px-1 rounded">{p.token}</code> {p.meaning}
                </span>
              ))}
            </p>
          </div>

          {recentWarning && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-200">
              You sent this family a note on {day(recentWarning)}. Send another anyway?
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="gradient" onClick={() => send(true)} disabled={sending}>
                  Send anyway
                </Button>
                <Button size="sm" variant="outline" onClick={() => setRecentWarning(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">{family ? (problem ?? 'Ready to send.') : 'Pick a family first.'}</p>
            <Button variant="gradient" onClick={() => send()} disabled={!family || !!problem || sending || !!recentWarning}>
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Preview</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">Exactly what they will get, placeholders filled in.</p>
        </CardHeader>
        <CardContent>
          {preview && (subject || body) ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">To: {family!.email}</p>
              <p className="font-semibold text-gray-900 dark:text-white mt-1">{preview.subject || '(no subject)'}</p>
              <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{preview.body}</pre>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Pick a family and start writing to see the preview.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
