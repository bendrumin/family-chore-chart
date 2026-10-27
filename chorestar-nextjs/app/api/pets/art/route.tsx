import { ImageResponse } from 'next/og'
import { PetArtSvg } from '@/components/pets/pet-art'
import { svgToString } from '@/lib/pets/svg-string'
import { PET_SLOTS, PET_SPECIES_IDS, PET_STAGES, getPetItem, type PetSpecies, type PetStage } from '@/lib/pets/catalog'
import { PET_MOODS, type PetMood } from '@/lib/pets/mood'

/**
 * GET /api/pets/art?species=pup&stage=kid&mood=happy&star=0&hat=cap&accessory=&habitat=meadow&size=240
 *
 * One pet as a PNG, drawn by the same PetArt the web uses, so the native apps
 * show exactly the web's pet without a second copy of ~800 lines of art to
 * keep in step. A still frame: the web's idle animation is CSS, and the app
 * adds its own gentle bob.
 *
 * Public on purpose: the picture is a pure function of the query (a species,
 * a stage and catalog item ids, no names or family data), so it caches hard
 * at the edge and in the app.
 */
const pick = <T extends string>(v: string | null, allowed: readonly T[], fallback: T): T =>
  v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams
  const species = pick<PetSpecies>(q.get('species'), PET_SPECIES_IDS, 'pup')
  const stage = pick<PetStage>(q.get('stage'), PET_STAGES, 'baby')
  const mood = pick<PetMood>(q.get('mood'), PET_MOODS, 'relaxed')
  const size = Math.min(600, Math.max(40, Number(q.get('size')) || 240))
  // Only real catalog items, each in its own slot.
  const equipped = Object.fromEntries(
    PET_SLOTS.map((slot) => {
      const item = getPetItem(q.get(slot))
      return [slot, item && item.slot === slot ? item.id : null]
    })
  )

  const svg = svgToString(
    <PetArtSvg
      uid="pet"
      species={species}
      stage={stage}
      mood={mood}
      star={q.get('star') === '1'}
      equipped={equipped}
      size={size}
      animated={false}
      showHabitat={q.get('habitat') !== 'none'}
    />
  ).replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')

  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
      <img src={`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`} width={size} height={size} />
    ),
    {
      width: size,
      height: size,
      headers: { 'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable' },
    }
  )
}
