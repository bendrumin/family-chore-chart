'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Loader2, Mail, Trash2, X } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { toast } from 'sonner'

/** Must be typed exactly (case-insensitively) to enable deletion. */
const CONFIRM_WORD = 'DELETE'

/** Kept in step with the iOS DeleteAccountView list so both platforms promise
 *  the same thing. */
const DELETED_ITEMS = [
  'Your login and profile',
  'Every child, including their avatars and PINs',
  "All chores and your family's completion history",
  'All routines and their step-by-step history',
  'Allowance and earnings totals',
  'Achievement badges and streaks',
  'Family sharing and your kid login code',
]

/**
 * Account settings, including permanent deletion.
 *
 * Web counterpart to the iOS flow required by App Store Guideline 5.1.1(v) —
 * both call POST /api/account/delete. The confirmation is expanded inline rather
 * than in a nested dialog, since this tab already lives inside the settings
 * modal.
 */
export function AccountTab() {
  const { user } = useAuth()
  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const canDelete = confirmation.trim().toUpperCase() === CONFIRM_WORD && !isDeleting

  const handleDelete = async () => {
    if (!canDelete) return
    setIsDeleting(true)

    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: CONFIRM_WORD }),
      })
      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.success) {
        toast.error(result?.error || 'We could not delete your account. Please try again.')
        setIsDeleting(false)
        return
      }

      if (result.billingCleanupFailed) {
        toast.warning(
          "Your account was deleted, but we couldn't confirm your subscription was cancelled. Please email hi@chorestar.app.",
          { duration: 12000 }
        )
      } else {
        toast.success('Your account has been deleted.')
      }

      // Full reload rather than a router push: the session is gone, and this
      // clears every cached query and context that still holds family data.
      window.location.href = '/'
    } catch (error) {
      console.error('Account deletion error:', error)
      toast.error('Something went wrong. Please try again.')
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Account details */}
      <div className="space-y-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <h5 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Email
          </h5>
        </div>
        <p className="text-sm font-semibold break-all" style={{ color: 'var(--text-primary)' }}>
          {user?.email || 'Not signed in'}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          The address you use to sign in to ChoreStar.
        </p>
      </div>

      {/* Danger zone */}
      <div className="space-y-4 p-4 rounded-xl border-2 border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <h5 className="text-lg font-bold text-red-700 dark:text-red-300">Delete Account</h5>
        </div>

        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Permanently deletes your account and your family&apos;s chore data. This cannot be undone.
        </p>

        {!isConfirming ? (
          <Button
            variant="outline"
            onClick={() => setIsConfirming(true)}
            className="border-2 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 font-semibold"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete My Account
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                What gets deleted
              </p>
              <ul className="space-y-1.5">
                {DELETED_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <X className="w-3.5 h-3.5 mt-1 shrink-0 text-red-600 dark:text-red-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-sm rounded-lg p-3 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/60" style={{ color: 'var(--text-primary)' }}>
              Any subscription billed by ChoreStar is cancelled. If you subscribed through the
              iOS app, Apple bills you and we can&apos;t cancel it for you — turn it off in your
              iPhone&apos;s Settings &rsaquo; your name &rsaquo; Subscriptions. If you share this
              family, everyone else loses access to its children, chores, and routines.
            </p>

            <div className="space-y-2">
              <Label htmlFor="delete-confirm" className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Type {CONFIRM_WORD} to confirm
              </Label>
              <Input
                id="delete-confirm"
                type="text"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={CONFIRM_WORD}
                autoComplete="off"
                spellCheck={false}
                disabled={isDeleting}
                className="h-12 text-base font-semibold border-2 rounded-xl"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleDelete}
                disabled={!canDelete}
                /* red-600, not red-500: white on #ef4444 is 3.76:1, short of AA. */
                className="bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Permanently Delete
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                disabled={isDeleting}
                onClick={() => {
                  setIsConfirming(false)
                  setConfirmation('')
                }}
                className="font-semibold"
              >
                Keep My Account
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
