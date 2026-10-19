'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Lock, Pencil, Sparkles, Gift } from 'lucide-react'
import { PetArt } from '@/components/pets/pet-art'
import { playSound } from '@/lib/utils/sound'
import { useKidT, type KidKey } from '@/lib/i18n/kid'
import { PET_SLOTS, STAGE_START_LEVEL, type PetItemId, type PetSlot, type PetSpecies, type PetStage } from '@/lib/pets/catalog'
import type { PetState } from '@/lib/pets/state'
import { unlockedBetween } from '@/lib/pets/unlocks'

/**
 * Star Pets in kid mode (migration 034): a white card on the themed gradient,
 * like the goal and challenge cards.
 *
 *  - Not adopted: pick one of six species (free families: the pup; the rest
 *    show a lock and a gentle "ask a grown-up"), name it, adopt.
 *  - Adopted: the pet in its habitat, level bar, stage, a mood line that is
 *    never sad, what's next, this month's drop, and the wardrobe.
 *  - A level-up, a new stage or the star form plays the confetti celebration
 *    once per device (the last seen level is kept in localStorage).
 *
 * Kids can't buy anything here: locked things say "Ask a grown-up about Star
 * Pets", and the parent dashboard carries the actual upgrade button
 * (gate_pet). Everything is checked again by /api/kid/pet.
 */

const SEEN_KEY = (childId: string) => `chorestar-pet-seen:${childId}`

const SLOT_KEY: Record<PetSlot, KidKey> = {
  hat: 'pet.slot.hat',
  accessory: 'pet.slot.accessory',
  habitat: 'pet.slot.habitat',
}

function itemName(t: ReturnType<typeof useKidT>, id: string): string {
  return t(`pet.item.${id as PetItemId}` as KidKey)
}

function speciesName(t: ReturnType<typeof useKidT>, id: PetSpecies): string {
  return t(`pet.species.${id}` as KidKey)
}

function stageName(t: ReturnType<typeof useKidT>, stage: PetStage, star = false): string {
  return t(star ? 'pet.stage.star' : (`pet.stage.${stage}` as KidKey))
}

interface Celebration {
  key: KidKey
  vars: Record<string, string | number>
  /** Level items this level-up unlocked (Premium). */
  items: string[]
}

export function KidPet({ kidToken, refreshKey = 0 }: { kidToken: string; refreshKey?: number }) {
  const t = useKidT()
  const [childId, setChildId] = useState<string | null>(null)
  const [pet, setPet] = useState<PetState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState(false)
  const [celebration, setCelebration] = useState<Celebration | null>(null)

  const apply = useCallback((json: { childId?: string; pet?: PetState | null }) => {
    if (json.childId) setChildId(json.childId)
    setPet(json.pet ?? null)
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const res = await fetch('/api/kid/pet', { headers: { Authorization: `Bearer ${kidToken}` }, cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (active) apply(json)
      } catch {
        // Decoration: no card.
      }
    })()
    return () => {
      active = false
    }
  }, [kidToken, refreshKey, apply])

  // Celebrate growth once per device: level, stage, star.
  const growthKey = pet?.adopted ? `${pet.level}|${pet.stage}|${pet.star ? 1 : 0}` : ''
  useEffect(() => {
    if (!pet?.adopted || !childId || !pet.name) return
    let prev: { level: number; stage: string; star: boolean } | null = null
    try {
      const raw = localStorage.getItem(SEEN_KEY(childId))
      if (raw) prev = JSON.parse(raw)
      localStorage.setItem(SEEN_KEY(childId), JSON.stringify({ level: pet.level, stage: pet.stage, star: pet.star }))
    } catch {
      return
    }
    // First sight on this device: remember, don't celebrate.
    if (!prev || typeof prev.level !== 'number') return
    const grew = pet.level > prev.level || (pet.star && !prev.star)
    if (!grew) return

    const items = pet.premium ? unlockedBetween(prev.level, pet.level) : []
    let next: Celebration
    if (pet.star && !prev.star) next = { key: 'pet.becameStar', vars: { name: pet.name }, items }
    else if (pet.stage !== prev.stage) next = { key: 'pet.grewUp', vars: { name: pet.name, stage: stageName(t, pet.stage) }, items }
    else next = { key: 'pet.levelUp', vars: { name: pet.name, level: pet.level }, items }
    setCelebration(next)
    playSound('celebration')
    const big = next.key !== 'pet.levelUp'
    import('@/lib/utils/celebrations')
      .then(({ getCelebrationManager }) => getCelebrationManager().celebrateWithConfetti(big ? 'epic' : 'achievement'))
      .catch(() => {})
    const id = setTimeout(() => setCelebration(null), 6000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [growthKey, childId])

  const post = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true)
      setError(false)
      try {
        const res = await fetch('/api/kid/pet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kidToken}` },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error(String(res.status))
        apply(await res.json())
        return true
      } catch {
        setError(true)
        return false
      } finally {
        setBusy(false)
      }
    },
    [kidToken, apply]
  )

  if (!pet || !pet.enabled) return null

  if (!pet.adopted) {
    return (
      <AdoptCard
        pet={pet}
        busy={busy}
        error={error}
        onAdopt={(species, name) => void post({ action: 'adopt', species, name })}
      />
    )
  }

  const species = pet.species!
  const name = pet.name!

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="kid-pet-title"
      className={`max-w-2xl mx-auto mb-6 rounded-3xl bg-white p-5 shadow-lg ${pet.star ? 'ring-4 ring-yellow-300' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-bold uppercase tracking-wide text-gray-500 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" aria-hidden />
          {t('pet.title')}
        </div>
        <button
          type="button"
          onClick={() => setEditing(v => !v)}
          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <Pencil className="w-3.5 h-3.5" aria-hidden />
          {t('pet.edit')}
        </button>
      </div>

      <AnimatePresence>
        {celebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            role="status"
            className="mt-3 rounded-2xl bg-gradient-to-r from-yellow-300 to-amber-400 px-4 py-2 text-center text-lg font-black text-amber-900"
          >
            🎉 {t(celebration.key, celebration.vars)}
            {celebration.items.length > 0 && (
              <span className="block text-base">
                {celebration.items.map(id => t('pet.unlockedItem', { item: itemName(t, id) })).join(' ')}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 flex flex-col sm:flex-row items-center gap-4">
        <motion.div
          key={`${pet.stage}-${pet.star}`}
          initial={{ scale: 0.6, rotate: -6 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', bounce: 0.55, duration: 0.8 }}
          className="shrink-0"
        >
          <PetArt
            species={species}
            stage={pet.stage}
            mood={pet.mood}
            star={pet.star}
            equipped={pet.equipped}
            size={190}
            title={`${name}, ${speciesName(t, species)}`}
          />
        </motion.div>

        <div className="min-w-0 flex-1 w-full">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 id="kid-pet-title" className="text-3xl font-black text-gray-900 leading-tight break-words">
              {name}
            </h2>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${pet.star ? 'bg-yellow-100 text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}>
              {stageName(t, pet.stage, pet.star)} {speciesName(t, species)}
            </span>
          </div>

          <p className="mt-2 text-base font-bold text-gray-700">{t(`pet.mood.${pet.mood}` as KidKey, { name })}</p>

          <div className="mt-3" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pet.levelPercent} aria-label={t('pet.levelAria')}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-lg font-black text-gray-900">{t('pet.level', { level: pet.level })}</span>
              <span className="text-sm font-bold text-gray-500 tabular-nums">{t('pet.xp', { xp: pet.xp })}</span>
            </div>
            <div className="mt-1 h-4 rounded-full bg-gray-100 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${pet.star ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : 'accent-fill'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(pet.levelPercent > 0 ? 4 : 0, pet.levelPercent)}%` }}
                transition={{ type: 'spring', duration: 0.9, bounce: 0.2 }}
              />
            </div>
            <p className="mt-1 text-sm font-bold text-gray-600">
              {pet.heldBack
                ? t('pet.readyToGrow', { name, xp: pet.xp - pet.levelStartXp })
                : pet.nextLevelXp === null
                  ? t('pet.maxLevel')
                  : t('pet.xpToNext', { xp: pet.nextLevelXp - pet.xp, level: pet.level + 1 })}
            </p>
          </div>

          <ul className="mt-2 space-y-0.5 text-sm font-semibold text-gray-500">
            {pet.nextStage && !pet.heldBack && (pet.premium || pet.nextStage.level < STAGE_START_LEVEL.teen) && (
              <li>🌱 {t('pet.nextStage', { stage: stageName(t, pet.nextStage.stage), level: pet.nextStage.level })}</li>
            )}
            {pet.premium && pet.nextUnlock && (
              <li>🎁 {t('pet.nextUnlock', { item: itemName(t, pet.nextUnlock.id), level: pet.nextUnlock.level })}</li>
            )}
          </ul>
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold text-gray-500 text-center">{t('pet.howToGrow')}</p>

      {!pet.premium && !pet.heldBack && (
        <p className="mt-3 rounded-2xl bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-800 text-center">{t('pet.askGrownUp')}</p>
      )}

      {editing && (
        <EditPet
          pet={pet}
          busy={busy}
          onCancel={() => setEditing(false)}
          onSave={async (sp, nm) => {
            if (await post({ action: 'adopt', species: sp, name: nm })) setEditing(false)
          }}
        />
      )}

      {pet.drop && <DropCard pet={pet} busy={busy} onCollect={() => void post({ action: 'collect_drop' })} />}

      <Wardrobe pet={pet} busy={busy} onEquip={(slot, itemId) => void post({ action: 'equip', slot, itemId })} />

      {error && (
        <p role="alert" className="mt-3 text-sm font-bold text-rose-600 text-center">
          {t('pet.oops')}
        </p>
      )}
    </motion.section>
  )
}

function SpeciesPicker({
  pet,
  value,
  onChange,
  stage,
}: {
  pet: PetState
  value: PetSpecies
  onChange: (s: PetSpecies) => void
  stage: PetStage
}) {
  const t = useKidT()
  const [askedLocked, setAskedLocked] = useState(false)
  return (
    <>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('pet.adoptTitle')}>
        {pet.speciesOptions.map(opt => {
          const selected = value === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={opt.locked}
              onClick={() => (opt.locked ? setAskedLocked(true) : onChange(opt.id))}
              className={`relative flex flex-col items-center rounded-2xl border-2 p-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                selected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 bg-gray-50 hover:border-indigo-200'
              } ${opt.locked ? 'opacity-60' : ''}`}
            >
              <PetArt species={opt.id} stage={stage} mood="playful" size={72} animated={selected} showHabitat={false} />
              <span className="text-sm font-black text-gray-800">{speciesName(t, opt.id)}</span>
              {opt.locked && (
                <span className="absolute top-1 end-1 rounded-full bg-white p-1 shadow">
                  <Lock className="w-3.5 h-3.5 text-gray-500" aria-label={t('pet.locked')} />
                </span>
              )}
            </button>
          )
        })}
      </div>
      {askedLocked && <p className="mt-2 rounded-2xl bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-800 text-center">{t('pet.askGrownUp')}</p>}
    </>
  )
}

function AdoptCard({
  pet,
  busy,
  error,
  onAdopt,
}: {
  pet: PetState
  busy: boolean
  error: boolean
  onAdopt: (species: PetSpecies, name: string) => void
}) {
  const t = useKidT()
  const first = pet.speciesOptions.find(o => !o.locked)?.id ?? 'pup'
  const [species, setSpecies] = useState<PetSpecies>(first)
  const [name, setName] = useState('')
  const trimmed = name.trim()

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="kid-pet-adopt"
      className="max-w-2xl mx-auto mb-6 rounded-3xl bg-white p-5 shadow-lg"
    >
      <h2 id="kid-pet-adopt" className="text-2xl font-black text-gray-900">
        🐾 {t('pet.adoptTitle')}
      </h2>
      <p className="mt-1 text-base font-bold text-gray-600">{t('pet.adoptBody')}</p>
      <div className="mt-4">
        <SpeciesPicker pet={pet} value={species} onChange={setSpecies} stage="baby" />
      </div>
      <form
        className="mt-4 flex flex-col sm:flex-row gap-2"
        onSubmit={e => {
          e.preventDefault()
          if (trimmed && !busy) onAdopt(species, trimmed)
        }}
      >
        <label className="sr-only" htmlFor="kid-pet-name">
          {t('pet.nameLabel')}
        </label>
        <input
          id="kid-pet-name"
          value={name}
          maxLength={20}
          onChange={e => setName(e.target.value)}
          placeholder={`${t('pet.nameLabel')}: ${t('pet.namePlaceholder')}`}
          className="flex-1 rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-lg font-bold text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!trimmed || busy}
          className="rounded-2xl accent-fill px-6 py-3 text-lg font-black shadow disabled:opacity-50"
        >
          {busy ? t('pet.saving') : t('pet.adopt')}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm font-bold text-rose-600">
          {t('pet.oops')}
        </p>
      )}
    </motion.section>
  )
}

function EditPet({
  pet,
  busy,
  onCancel,
  onSave,
}: {
  pet: PetState
  busy: boolean
  onCancel: () => void
  onSave: (species: PetSpecies, name: string) => void
}) {
  const t = useKidT()
  const [species, setSpecies] = useState<PetSpecies>(pet.species ?? 'pup')
  const [name, setName] = useState(pet.name ?? '')
  const trimmed = name.trim()
  return (
    <div className="mt-4 rounded-2xl border-2 border-indigo-100 p-3">
      <SpeciesPicker pet={pet} value={species} onChange={setSpecies} stage={pet.stage} />
      <form
        className="mt-3 flex flex-col sm:flex-row gap-2"
        onSubmit={e => {
          e.preventDefault()
          if (trimmed && !busy) onSave(species, trimmed)
        }}
      >
        <label className="sr-only" htmlFor="kid-pet-rename">
          {t('pet.nameLabel')}
        </label>
        <input
          id="kid-pet-rename"
          value={name}
          maxLength={20}
          onChange={e => setName(e.target.value)}
          className="flex-1 rounded-2xl border-2 border-gray-200 bg-white px-4 py-2 text-lg font-bold text-gray-900 focus:border-indigo-400 focus:outline-none"
        />
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="rounded-2xl bg-gray-100 px-4 py-2 font-black text-gray-700">
            {t('pet.cancel')}
          </button>
          <button type="submit" disabled={!trimmed || busy} className="rounded-2xl accent-fill px-5 py-2 font-black shadow disabled:opacity-50">
            {busy ? t('pet.saving') : t('pet.save')}
          </button>
        </div>
      </form>
    </div>
  )
}

function DropCard({ pet, busy, onCollect }: { pet: PetState; busy: boolean; onCollect: () => void }) {
  const t = useKidT()
  const drop = pet.drop!
  const percent = Math.min(100, Math.round((drop.xpThisMonth / drop.goal) * 100))
  const preview = { ...pet.equipped, [drop.slot]: drop.itemId }
  return (
    <div className="mt-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-pink-50 to-amber-50 p-3">
      <div className="shrink-0 rounded-2xl bg-white p-1 shadow-sm">
        <PetArt species={pet.species!} stage={pet.stage} mood="playful" equipped={preview} size={72} animated={false} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-black uppercase tracking-wide text-pink-600 flex items-center gap-1">
          <Gift className="w-3.5 h-3.5" aria-hidden />
          {t('pet.newThisMonth')}
        </div>
        <p className="text-lg font-black text-gray-900">
          {drop.emoji} {itemName(t, drop.itemId)}
        </p>
        {drop.locked ? (
          <p className="text-sm font-bold text-indigo-800">{t('pet.askGrownUp')}</p>
        ) : drop.owned ? (
          <p className="text-sm font-bold text-emerald-700">{t('pet.collected')}</p>
        ) : drop.collectible ? (
          <button
            type="button"
            disabled={busy}
            onClick={onCollect}
            className="mt-1 rounded-2xl bg-gradient-to-r from-pink-500 to-amber-500 px-4 py-2 font-black text-white shadow disabled:opacity-60"
          >
            {t('pet.collect')}
          </button>
        ) : (
          <>
            <div className="mt-1 h-2.5 rounded-full bg-white overflow-hidden" aria-hidden>
              <div className="h-full rounded-full bg-pink-400" style={{ width: `${Math.max(percent > 0 ? 4 : 0, percent)}%` }} />
            </div>
            <p className="mt-1 text-sm font-bold text-gray-600">{t('pet.dropProgress', { xp: drop.goal - drop.xpThisMonth })}</p>
          </>
        )}
      </div>
    </div>
  )
}

function Wardrobe({ pet, busy, onEquip }: { pet: PetState; busy: boolean; onEquip: (slot: PetSlot, itemId: string | null) => void }) {
  const t = useKidT()
  const [slot, setSlot] = useState<PetSlot>('hat')
  const items = pet.wardrobe.filter(w => w.slot === slot)
  return (
    <div className="mt-4">
      <h3 className="text-lg font-black text-gray-900">👗 {t('pet.wardrobe')}</h3>
      <div className="mt-2 flex gap-1 rounded-2xl bg-gray-100 p-1" role="tablist" aria-label={t('pet.wardrobe')}>
        {PET_SLOTS.map(s => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={slot === s}
            onClick={() => setSlot(s)}
            className={`flex-1 rounded-xl px-3 py-1.5 text-sm font-black transition ${slot === s ? 'bg-white text-indigo-700 shadow' : 'text-gray-600'}`}
          >
            {t(SLOT_KEY[s])}
          </button>
        ))}
      </div>
      <ul className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2" role="tabpanel">
        {items.map(item => {
          const wearable = item.state === 'unlocked'
          const label = itemName(t, item.id)
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={busy || !wearable}
                aria-pressed={item.equipped}
                aria-label={wearable ? t(item.equipped ? 'pet.takeOff' : 'pet.wear', { item: label }) : `${label}: ${t('pet.locked')}`}
                onClick={() => onEquip(item.slot, item.equipped ? null : item.id)}
                className={`relative w-full rounded-2xl border-2 p-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                  item.equipped ? 'border-indigo-500 bg-indigo-50' : wearable ? 'border-gray-100 bg-white hover:border-indigo-200' : 'border-gray-100 bg-gray-50'
                }`}
              >
                <span className={`block text-3xl ${wearable ? '' : 'grayscale opacity-50'}`} aria-hidden>
                  {item.emoji}
                </span>
                <span className="block text-xs font-bold text-gray-700 leading-tight">{label}</span>
                {!wearable && (
                  <span className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-black text-gray-500">
                    <Lock className="w-3 h-3" aria-hidden />
                    {item.state === 'level' && item.level ? t('pet.unlocksAt', { level: item.level }) : t('pet.locked')}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
