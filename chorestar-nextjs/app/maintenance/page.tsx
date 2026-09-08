'use client'

import { useEffect } from 'react'
import { Wrench } from 'lucide-react'

/**
 * Maintenance screen, shown site-wide while MAINTENANCE_MODE=1.
 *
 * To turn it on (from the REPO ROOT, or the Vercel dashboard):
 *   npx vercel env add MAINTENANCE_MODE production   # value: 1
 *   npx vercel --prod
 * To turn it off: remove the env var and deploy again.
 *
 * Fully static (no data fetches), and the middleware gate short-circuits
 * before any Supabase call, so this page stays up while the database is not.
 */
export default function MaintenancePage() {
  // Self-recovers: once maintenance mode is off, the next reload lands the
  // visitor back on the page they asked for (the rewrite preserves the URL).
  useEffect(() => {
    const t = setTimeout(() => window.location.reload(), 120_000)
    return () => clearTimeout(t)
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-indigo-50 dark:bg-indigo-900/30">
          <Wrench className="h-7 w-7 text-indigo-500 dark:text-indigo-400" />
        </div>
        <h1 className="mb-2 text-2xl font-extrabold text-gray-900 dark:text-white">
          Back in a little while
        </h1>
        <p className="mb-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          ChoreStar is getting a short scheduled upgrade. Everything is safe
          where you left it: chores, streaks, goals, and balances.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          This page refreshes on its own. Usually done within the hour.
        </p>
      </div>
    </main>
  )
}
