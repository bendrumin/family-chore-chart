'use client'

import { useState } from 'react'
import { PawPrint } from 'lucide-react'
import { toast } from 'sonner'
import { useFamilyPets } from '@/components/pets/use-family-pets'

/**
 * Settings > Family: Star Pets on/off per kid (migration 034). Saves on its
 * own through POST /api/pets. Never gated: the basic pet is free and turning
 * anything off is always allowed. Off hides the pet on the kid dashboard and
 * the parent preview; nothing is deleted.
 */
export function PetsSection() {
  const { data, unavailable, setData } = useFamilyPets()
  const [busy, setBusy] = useState<string | null>(null)

  if (unavailable || !data || data.kids.length === 0) return null

  const toggle = async (childId: string, enabled: boolean) => {
    setBusy(childId)
    try {
      const res = await fetch('/api/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, enabled }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setData(d =>
        d ? { ...d, kids: d.kids.map(k => (k.childId === childId && k.pet ? { ...k, pet: { ...k.pet, enabled } } : k)) } : d
      )
      toast.success(enabled ? 'Star Pet turned on' : 'Star Pet turned off')
    } catch {
      toast.error('Could not save. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
      <div className="flex items-center gap-2 mb-1">
        <PawPrint className="w-5 h-5 text-pink-600 dark:text-pink-400" aria-hidden />
        <h5 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Star Pets
        </h5>
      </div>
      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
        A pet on each kid&apos;s dashboard that grows from their chores, routines and streaks. Never sad, never
        lost. Turn it off for a kid who doesn&apos;t want one; it comes back as it was if you turn it on again.
      </p>
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {data.kids.map(k => {
          const on = k.pet?.enabled !== false
          return (
            <li key={k.childId} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {k.childName}
                {k.pet?.adopted && k.pet.name && (
                  <span className="font-normal text-gray-500 dark:text-gray-400"> · {k.pet.name}, level {k.pet.level}</span>
                )}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`Star Pet for ${k.childName}`}
                disabled={busy === k.childId}
                onClick={() => void toggle(k.childId, !on)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-60 ${
                  on ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
