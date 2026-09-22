'use client'

import { useState, useRef } from 'react'
import { CheckCircle2, Loader2, Smartphone } from 'lucide-react'
import { ACCENT_SURFACE_STYLE } from '@/lib/constants/brand'

/**
 * Where a tester goes once their address is on the Play tester list. A Google
 * Group lets people add themselves, which is the only self-serve route Play
 * offers; without one we add addresses by hand and the copy says so.
 */
const GROUP_URL = process.env.NEXT_PUBLIC_ANDROID_BETA_GROUP_URL || ''
const OPT_IN_URL = process.env.NEXT_PUBLIC_ANDROID_BETA_OPT_IN_URL || ''

const INPUT =
  'w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 ' +
  'text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'

export function AndroidBetaSignup({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'already' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const honeypotRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/android-beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, honeypot: honeypotRef.current?.value || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data.error || 'Something went wrong. Please try again.')
      } else {
        setStatus(data.alreadySignedUp ? 'already' : 'success')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Network error. Please try again.')
    }
  }

  if (status === 'success' || status === 'already') {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 text-center ${compact ? 'py-4' : 'py-8'}`}>
        <CheckCircle2 className="w-10 h-10 text-green-500" />
        <p className="font-bold text-gray-900 dark:text-white text-lg">
          {status === 'already' ? "You're already on the list" : "You're on the list"}
        </p>
        {GROUP_URL ? (
          <div className="text-sm text-gray-600 dark:text-gray-300 max-w-sm space-y-3">
            <p>Two more steps and the app is yours:</p>
            <ol className="text-left space-y-2 list-decimal list-inside">
              <li>
                <a href={GROUP_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                  Join the testers group
                </a>{' '}
                with the same Google account that&apos;s on your phone.
              </li>
              {OPT_IN_URL && (
                <li>
                  <a href={OPT_IN_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                    Open the test link
                  </a>{' '}
                  and tap Become a tester, then Download on Google Play.
                </li>
              )}
            </ol>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
            We&apos;ll email you a Google Play test link as soon as your spot is ready. It arrives from
            hi@chorestar.app, so keep an eye on your inbox.
          </p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={`w-full ${compact ? 'max-w-md mx-auto' : 'max-w-sm mx-auto space-y-4'}`}>
      <input ref={honeypotRef} type="text" name="website" className="hidden" tabIndex={-1} aria-hidden="true" autoComplete="off" />
      {compact ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            placeholder="your@gmail.com"
            aria-label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={`${INPUT} flex-1`}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-70 hover:opacity-90 transition-opacity whitespace-nowrap"
            style={ACCENT_SURFACE_STYLE}
          >
            {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Join the beta
          </button>
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="ab-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input id="ab-name" type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label htmlFor="ab-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Google account email
            </label>
            <input
              id="ab-email"
              type="email"
              placeholder="you@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={INPUT}
              aria-describedby="ab-email-help"
            />
            <p id="ab-email-help" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              It has to be the Google account signed in on your Android phone. Play checks that address
              before it will hand over the test build.
            </p>
          </div>
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-70 hover:opacity-90 transition-opacity"
            style={ACCENT_SURFACE_STYLE}
          >
            {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Smartphone className="w-5 h-5" />}
            Request a beta spot
          </button>
        </>
      )}
      {status === 'error' && <p className="text-sm text-red-500 mt-2">{errorMsg}</p>}
      {!compact && (
        <p className="text-xs text-center text-gray-400 dark:text-gray-500">
          No spam. Used only to get you into the test.
        </p>
      )}
    </form>
  )
}
