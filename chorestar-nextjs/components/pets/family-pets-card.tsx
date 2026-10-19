'use client'

import { Crown, PawPrint } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PetArt } from '@/components/pets/pet-art'
import { openPremiumBilling } from '@/components/settings/premium-gate'
import { useAndroidShell } from '@/lib/utils/platform'
import { playBillingAvailable } from '@/lib/utils/play-billing-client'
import { useFamilyPets } from '@/components/pets/use-family-pets'
import { getPetItem, type PetStage } from '@/lib/pets/catalog'
import type { PetMood } from '@/lib/pets/mood'

/**
 * Star Pets on the parent dashboard (migration 034): a small preview of each
 * kid's pet with its level and mood, so a parent sees at a glance who has
 * fed theirs today.
 *
 * Free families: the kid's pet still shows (the basic pup is free), plus the
 * upsell kids can't act on themselves. When a pet has XP saved past the free
 * "kid" stage the line names it ("Biscuit is ready to grow"). The button
 * opens Billing with source gate_pet; inside the Android shell without Play
 * Billing it states the limit with no purchase CTA.
 *
 * Renders nothing when the route is unavailable (pre-migration) or every kid
 * has pets switched off.
 */

const STAGE_LABEL: Record<PetStage, string> = { baby: 'Baby', kid: 'Kid', teen: 'Teen', adult: 'Grown-up' }
const MOOD_LABEL: Record<PetMood, string> = {
  happy: 'Happy: all done today',
  playful: 'Playful: on their way',
  hungry: 'Hungry for a chore',
  sleepy: 'Sleepy: nothing yet today',
  relaxed: 'Relaxed: nothing due',
}

export function FamilyPetsCard({ refreshKey, className }: { refreshKey?: unknown; className?: string }) {
  const { data, unavailable } = useFamilyPets(refreshKey)
  const androidShell = useAndroidShell()

  if (unavailable || !data) return null
  const kids = data.kids.filter(k => k.pet && k.pet.enabled)
  if (kids.length === 0) return null

  const canSell = !androidShell || playBillingAvailable()
  const ready = kids.find(k => k.pet?.heldBack)
  const drop = data.premium ? kids.find(k => k.pet?.drop)?.pet?.drop ?? null : null
  const dropItem = drop ? getPetItem(drop.itemId) : null

  return (
    <section
      aria-labelledby="family-pets-title"
      className={`rounded-2xl border p-4 sm:p-5 space-y-4 ${className ?? ''}`}
      style={{ background: 'var(--card-bg)', borderColor: 'hsl(var(--border))' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-9 h-9 rounded-lg grid place-items-center bg-pink-500/15 text-pink-600 dark:text-pink-400 shrink-0">
          <PawPrint className="w-5 h-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="family-pets-title" className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Star Pets
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Each kid&apos;s pet grows from the chores and routines they finish.
          </p>
        </div>
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {kids.map(({ childId, childName, pet }) => {
          const p = pet!
          return (
            <li
              key={childId}
              className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-2"
            >
              {p.adopted && p.species ? (
                <PetArt
                  species={p.species}
                  stage={p.stage}
                  mood={p.mood}
                  star={p.star}
                  equipped={p.equipped}
                  size={56}
                  animated={false}
                  title={`${childName}'s pet ${p.name}`}
                  className="shrink-0"
                />
              ) : (
                <PetArt species="pup" stage="baby" size={56} animated={false} className="shrink-0 opacity-40 grayscale" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold truncate text-gray-900 dark:text-gray-100">{childName}</p>
                {p.adopted ? (
                  <>
                    <p className="text-xs font-semibold truncate text-gray-600 dark:text-gray-300">
                      {p.name} · Lv {p.level} {p.star ? 'Star' : STAGE_LABEL[p.stage]}
                    </p>
                    <p className="text-xs truncate text-gray-500 dark:text-gray-400">{MOOD_LABEL[p.mood]}</p>
                  </>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Adopts one from kid login</p>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {data.premium && drop && dropItem && (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {dropItem.emoji} New this month: kids collect this month&apos;s item after about five chores.
        </p>
      )}

      {!data.premium && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-900/20 p-3">
          <p className="text-sm flex-1 text-gray-700 dark:text-gray-200">
            {ready?.pet?.name
              ? `${ready.pet.name} has XP saved and is ready to grow past the kid stage. `
              : 'On the free plan pets grow to the kid stage. '}
            Premium unlocks all six pets, the teen, grown-up and star stages, outfits, and a new item every month.
          </p>
          {canSell && (
            <Button type="button" variant="gradient" size="sm" className="font-bold shrink-0" onClick={() => openPremiumBilling('pet')}>
              <Crown className="w-4 h-4 mr-1" aria-hidden />
              See Premium
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
