'use client'

import { useState } from 'react'
import { Smartphone, CheckCircle2, Loader2 } from 'lucide-react'
import { GRADIENT } from '@/lib/constants/brand'

export function TestFlightSignup({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'already' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/testflight-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data.error || 'Something went wrong. Please try again.')
      } else if (data.alreadySignedUp) {
        setStatus('already')
      } else {
        setStatus('success')
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
          {status === 'already' ? "You're already on the list!" : "You're in! 🎉"}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          {status === 'already'
            ? "We already have your email. We'll reach out when TestFlight spots open up."
            : "We'll send you a TestFlight invite as soon as a spot opens. Keep an eye on your inbox!"}
        </p>
      </div>
    )
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 w-full max-w-md mx-auto">
        {/* Honeypot */}
        <input type="text" name="website" className="hidden" tabIndex={-1} aria-hidden="true" />
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-70 hover:opacity-90 transition-opacity whitespace-nowrap"
          style={{ background: GRADIENT }}
        >
          {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Get Early Access
        </button>
        {status === 'error' && (
          <p className="w-full text-xs text-red-500 mt-1">{errorMsg}</p>
        )}
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto w-full">
      {/* Honeypot */}
      <input type="text" name="website" className="hidden" tabIndex={-1} aria-hidden="true" />
      <div>
        <label htmlFor="tf-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Name <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id="tf-name"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>
      <div>
        <label htmlFor="tf-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email address
        </label>
        <input
          id="tf-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>
      {status === 'error' && (
        <p className="text-sm text-red-500">{errorMsg}</p>
      )}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full px-6 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-70 hover:opacity-90 transition-opacity"
        style={{ background: GRADIENT }}
      >
        {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Smartphone className="w-5 h-5" />}
        Request TestFlight Access
      </button>
      <p className="text-xs text-center text-gray-400 dark:text-gray-500">
        No spam. Only used to send your TestFlight invite.
      </p>
    </form>
  )
}
