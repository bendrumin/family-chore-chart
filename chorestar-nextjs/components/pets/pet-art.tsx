import { useId, type ReactNode } from 'react'
import type { PetSpecies, PetStage } from '@/lib/pets/catalog'
import type { PetMood } from '@/lib/pets/mood'
import type { PetEquipped } from '@/lib/pets/unlocks'

/**
 * Star Pets art (migration 034): every pet, stage, mood and cosmetic as
 * inline SVG. No image assets.
 *
 * One sticker style for everything: soft round shapes, a dark plum outline
 * (so a white panda still reads on a white card or a pale gradient), pink
 * cheeks, big eyes on babies. 200 x 200 viewBox, ground at y = 190, so it
 * scales from a 40px dashboard chip to a 220px kid panel.
 *
 * Layers, back to front: habitat (clipped to a circle), star aura, tail,
 * body, arms, head + ears + face, neck accessory, face accessory, hat,
 * mood extras (zzz, hearts, a snack bubble), star sparkles.
 *
 * Idle animation is CSS (bob, blink, tail wag, twinkle) on wrapper groups
 * that carry no transform attribute of their own, and switches off under
 * prefers-reduced-motion. `animated={false}` renders a still pet.
 */

const INK = '#3b2a4f'
const BLUSH = '#ff9fb4'

interface Palette {
  body: string
  dark: string
  belly: string
  inner: string
}

const PALETTES: Record<PetSpecies, Palette> = {
  pup: { body: '#e3b47c', dark: '#9b6435', belly: '#fbe6cb', inner: '#f3a6a0' },
  kitty: { body: '#f7a65a', dark: '#d9772b', belly: '#ffe6cc', inner: '#ffb3c1' },
  bunny: { body: '#f5f0fb', dark: '#d8cbe9', belly: '#ffffff', inner: '#ffb8cd' },
  dino: { body: '#7fd88e', dark: '#33a152', belly: '#dcf7cf', inner: '#f8c15c' },
  panda: { body: '#ffffff', dark: '#2f2a3d', belly: '#ffffff', inner: '#ffb8cd' },
  owl: { body: '#a98ae0', dark: '#6d4cb0', belly: '#eee4fb', inner: '#f8b24c' },
}

interface StageShape {
  scale: number
  headR: number
  bodyRx: number
  bodyRy: number
  /** Eye radius in head-local units (head radius 40). Babies get big eyes. */
  eyeR: number
}

const STAGES: Record<PetStage, StageShape> = {
  baby: { scale: 0.72, headR: 46, bodyRx: 34, bodyRy: 28, eyeR: 7.5 },
  kid: { scale: 0.82, headR: 42, bodyRx: 38, bodyRy: 33, eyeR: 7 },
  teen: { scale: 0.92, headR: 38, bodyRx: 42, bodyRy: 38, eyeR: 6.4 },
  adult: { scale: 1, headR: 36, bodyRx: 46, bodyRy: 42, eyeR: 6 },
}

const GROUND = 190

export interface PetArtProps {
  species: PetSpecies
  stage: PetStage
  mood?: PetMood
  star?: boolean
  equipped?: Partial<PetEquipped> | null
  size?: number
  animated?: boolean
  /** Accessible name; omit for a decorative pet (aria-hidden). */
  title?: string
  className?: string
  /** Draw the habitat (default true). Small chips may skip it. */
  showHabitat?: boolean
}

export function PetArt(props: PetArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  return <PetArtSvg {...props} uid={uid} />
}

/**
 * PetArt without hooks, for renderers that call components as plain
 * functions (next/og in app/api/pets/art, which draws the native apps' pets).
 * `uid` keeps clip-path and gradient ids unique when several pets share a page.
 */
export function PetArtSvg({
  uid,
  species,
  stage,
  mood = 'relaxed',
  star = false,
  equipped,
  size = 160,
  animated = true,
  title,
  className,
  showHabitat = true,
}: PetArtProps & { uid: string }) {
  const p = PALETTES[species]
  const s = STAGES[stage]
  const bodyCy = GROUND - 6 - s.bodyRy
  const headCy = bodyCy - s.bodyRy * 0.72 - s.headR * 0.62
  const headTop = headCy - s.headR
  const k = s.headR / 40
  const neckY = headCy + s.headR * 0.97
  const anim = animated ? '' : ' cs-pet-still'
  const bobClass = mood === 'playful' || mood === 'happy' ? 'cs-pet-hop' : mood === 'sleepy' ? 'cs-pet-breathe' : 'cs-pet-bob'

  const hat = equipped?.hat ?? null
  const accessory = equipped?.accessory ?? null
  const habitat = equipped?.habitat ?? null
  const faceAccessory = accessory && FACE_ACCESSORIES.has(accessory)

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`${className ?? ''}${anim}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {animated && <style>{PET_CSS}</style>}
      <defs>
        <clipPath id={`clip${uid}`}>
          <circle cx="100" cy="100" r="98" />
        </clipPath>
        <radialGradient id={`aura${uid}`} cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor="#fff6c2" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#fcd34d" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>

      {showHabitat && <g clipPath={`url(#clip${uid})`}>{habitatArt(habitat, uid)}</g>}

      {star && (
        <g className="cs-pet-pulse">
          <circle cx="100" cy={bodyCy - 10} r="88" fill={`url(#aura${uid})`} />
        </g>
      )}

      {/* Ground shadow */}
      <ellipse cx="100" cy={GROUND - 2} rx={s.bodyRx * s.scale * 1.05} ry="6" fill="#2a1f3d" opacity="0.18" />

      <g className={bobClass}>
        <g transform={`translate(100 ${GROUND}) scale(${s.scale}) translate(-100 -${GROUND})`}>
          {/* Tail */}
          <g transform={`translate(${100 + s.bodyRx * 0.86} ${bodyCy + s.bodyRy * 0.25})`}>
            <g className={species === 'pup' || species === 'kitty' ? 'cs-pet-wag' : undefined}>{tailArt(species, p)}</g>
          </g>

          {/* Feet */}
          <ellipse cx={100 - s.bodyRx * 0.48} cy={GROUND - 7} rx={s.bodyRx * 0.3} ry="8" fill={species === 'panda' ? p.dark : p.body} stroke={INK} strokeWidth="2.5" />
          <ellipse cx={100 + s.bodyRx * 0.48} cy={GROUND - 7} rx={s.bodyRx * 0.3} ry="8" fill={species === 'panda' ? p.dark : p.body} stroke={INK} strokeWidth="2.5" />

          {/* Body */}
          <ellipse cx="100" cy={bodyCy} rx={s.bodyRx} ry={s.bodyRy} fill={p.body} stroke={INK} strokeWidth="3" />
          {species === 'panda' && (
            <path
              d={`M ${100 - s.bodyRx * 0.98} ${bodyCy - s.bodyRy * 0.15} Q 100 ${bodyCy - s.bodyRy * 0.55} ${100 + s.bodyRx * 0.98} ${bodyCy - s.bodyRy * 0.15} L ${100 + s.bodyRx * 0.8} ${bodyCy - s.bodyRy * 0.62} Q 100 ${bodyCy - s.bodyRy * 1.05} ${100 - s.bodyRx * 0.8} ${bodyCy - s.bodyRy * 0.62} Z`}
              fill={p.dark}
            />
          )}
          <ellipse cx="100" cy={bodyCy + s.bodyRy * 0.18} rx={s.bodyRx * 0.6} ry={s.bodyRy * 0.62} fill={p.belly} opacity={species === 'panda' ? 0 : 1} />
          {species === 'owl' && <OwlFeathers cx={100} cy={bodyCy + s.bodyRy * 0.15} r={s.bodyRx * 0.45} color={p.dark} />}
          {species === 'dino' && (
            <g opacity="0.55">
              <circle cx={100 - s.bodyRx * 0.55} cy={bodyCy - s.bodyRy * 0.25} r="4" fill={p.dark} />
              <circle cx={100 + s.bodyRx * 0.6} cy={bodyCy + s.bodyRy * 0.1} r="5" fill={p.dark} />
              <circle cx={100 - s.bodyRx * 0.7} cy={bodyCy + s.bodyRy * 0.35} r="3" fill={p.dark} />
            </g>
          )}
          {star && <StarShape cx={100} cy={bodyCy + s.bodyRy * 0.2} r={s.bodyRx * 0.22} fill="#fbbf24" stroke={INK} />}

          {/* Arms / wings */}
          {species === 'owl' ? (
            <>
              <ellipse cx={100 - s.bodyRx * 0.92} cy={bodyCy} rx="11" ry={s.bodyRy * 0.62} fill={p.dark} stroke={INK} strokeWidth="2.5" transform={`rotate(14 ${100 - s.bodyRx * 0.92} ${bodyCy})`} />
              <ellipse cx={100 + s.bodyRx * 0.92} cy={bodyCy} rx="11" ry={s.bodyRy * 0.62} fill={p.dark} stroke={INK} strokeWidth="2.5" transform={`rotate(-14 ${100 + s.bodyRx * 0.92} ${bodyCy})`} />
            </>
          ) : (
            <>
              <ellipse cx={100 - s.bodyRx * 0.86} cy={bodyCy - 2} rx="8.5" ry="13" fill={species === 'panda' ? p.dark : p.body} stroke={INK} strokeWidth="2.5" transform={`rotate(24 ${100 - s.bodyRx * 0.86} ${bodyCy - 2})`} />
              <ellipse cx={100 + s.bodyRx * 0.86} cy={bodyCy - 2} rx="8.5" ry="13" fill={species === 'panda' ? p.dark : p.body} stroke={INK} strokeWidth="2.5" transform={`rotate(-24 ${100 + s.bodyRx * 0.86} ${bodyCy - 2})`} />
            </>
          )}

          {/* Head, in head-local units: origin at the head's centre, radius 40 */}
          <g transform={`translate(100 ${headCy}) scale(${k})`}>
            {earsBehind(species, p)}
            <circle cx="0" cy="0" r="40" fill={p.body} stroke={INK} strokeWidth={3 / k} />
            {earsFront(species, p, k)}
            <Face species={species} mood={mood} eyeR={s.eyeR} p={p} k={k} />
            {faceAccessory && accessory && faceAccessoryArt(accessory)}
          </g>

          {/* Neck accessory: just under the chin, over the head's lower edge */}
          {accessory && !faceAccessory && (
            <g transform={`translate(100 ${neckY}) scale(${s.bodyRx / 44})`}>{neckAccessoryArt(accessory)}</g>
          )}

          {/* Hat, in head-local units with the origin at the top of the head */}
          {hat && <g transform={`translate(100 ${headTop}) scale(${k})`}>{hatArt(hat)}</g>}

          {/* Mood extras */}
          {mood === 'sleepy' && (
            <g fill="#6d5bd0" fontWeight="900" fontFamily="system-ui, sans-serif">
              <text x={100 + s.headR * 0.8} y={headTop + 6} fontSize="16" className="cs-pet-z">z</text>
              <text x={100 + s.headR * 1.05} y={headTop - 8} fontSize="12" className="cs-pet-z cs-pet-z2">z</text>
            </g>
          )}
          {mood === 'happy' && (
            <g>
              <Heart x={100 - s.headR * 1.15} y={headTop + 10} size={9} className="cs-pet-float" />
              <Heart x={100 + s.headR * 1.1} y={headTop + 2} size={7} className="cs-pet-float cs-pet-z2" />
            </g>
          )}
          {mood === 'hungry' && (
            <g transform={`translate(${100 + s.headR * 1.05} ${headTop - 2})`} className="cs-pet-bob">
              <circle cx="-14" cy="22" r="3" fill="#ffffff" stroke={INK} strokeWidth="1.5" />
              <circle cx="-8" cy="14" r="4.5" fill="#ffffff" stroke={INK} strokeWidth="1.5" />
              <circle cx="6" cy="0" r="13" fill="#ffffff" stroke={INK} strokeWidth="2" />
              {/* a cookie */}
              <circle cx="6" cy="0" r="7.5" fill="#e0a65c" stroke={INK} strokeWidth="1.5" />
              <circle cx="3.5" cy="-2" r="1.3" fill={INK} />
              <circle cx="8.5" cy="1.5" r="1.3" fill={INK} />
              <circle cx="5" cy="3.5" r="1" fill={INK} />
            </g>
          )}
        </g>
      </g>

      {star && (
        <g fill="#fbbf24" stroke={INK} strokeWidth="1.2">
          <StarShape cx={34} cy={58} r={7} className="cs-pet-twinkle" />
          <StarShape cx={166} cy={44} r={9} className="cs-pet-twinkle cs-pet-z2" />
          <StarShape cx={170} cy={128} r={6} className="cs-pet-twinkle" />
          <StarShape cx={28} cy={140} r={5} className="cs-pet-twinkle cs-pet-z2" />
        </g>
      )}
    </svg>
  )
}

const PET_CSS = `
.cs-pet-bob,.cs-pet-hop,.cs-pet-breathe,.cs-pet-wag,.cs-pet-blink,.cs-pet-z,.cs-pet-float,.cs-pet-twinkle,.cs-pet-pulse{transform-box:fill-box}
.cs-pet-bob{animation:cs-pet-bob 2.8s ease-in-out infinite}
.cs-pet-hop{animation:cs-pet-hop 1.6s ease-in-out infinite}
.cs-pet-breathe{transform-origin:50% 100%;animation:cs-pet-breathe 3.6s ease-in-out infinite}
.cs-pet-wag{transform-origin:0% 50%;animation:cs-pet-wag .9s ease-in-out infinite alternate}
.cs-pet-blink{transform-origin:50% 50%;animation:cs-pet-blink 4.5s infinite}
.cs-pet-z{animation:cs-pet-z 2.6s ease-in-out infinite}
.cs-pet-z2{animation-delay:1.1s}
.cs-pet-float{animation:cs-pet-float 2.2s ease-in-out infinite}
.cs-pet-twinkle{transform-origin:50% 50%;animation:cs-pet-twinkle 1.8s ease-in-out infinite}
.cs-pet-pulse{transform-origin:50% 50%;animation:cs-pet-pulse 3s ease-in-out infinite}
@keyframes cs-pet-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes cs-pet-hop{0%,100%{transform:translateY(0)}40%{transform:translateY(-7px)}60%{transform:translateY(-5px)}}
@keyframes cs-pet-breathe{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.97)}}
@keyframes cs-pet-wag{from{transform:rotate(-12deg)}to{transform:rotate(16deg)}}
@keyframes cs-pet-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes cs-pet-z{0%{opacity:0;transform:translate(0,4px)}30%{opacity:1}100%{opacity:0;transform:translate(6px,-12px)}}
@keyframes cs-pet-float{0%{opacity:0;transform:translateY(4px)}30%{opacity:1}100%{opacity:0;transform:translateY(-14px)}}
@keyframes cs-pet-twinkle{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1.1)}}
@keyframes cs-pet-pulse{0%,100%{opacity:.75;transform:scale(.96)}50%{opacity:1;transform:scale(1.03)}}
.cs-pet-still *{animation:none!important}
@media (prefers-reduced-motion: reduce){.cs-pet-bob,.cs-pet-hop,.cs-pet-breathe,.cs-pet-wag,.cs-pet-blink,.cs-pet-z,.cs-pet-float,.cs-pet-twinkle,.cs-pet-pulse{animation:none!important}}
`

// ---------------------------------------------------------------------------
// Small shapes
// ---------------------------------------------------------------------------

function starPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45
    const a = (Math.PI / 5) * i - Math.PI / 2
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(' ')
}

function StarShape({ cx, cy, r, fill, stroke, className }: { cx: number; cy: number; r: number; fill?: string; stroke?: string; className?: string }) {
  return <polygon points={starPoints(cx, cy, r)} fill={fill} stroke={stroke} strokeWidth={stroke ? 1.5 : undefined} strokeLinejoin="round" className={className} />
}

function Heart({ x, y, size, className, fill = '#ff6b8a' }: { x: number; y: number; size: number; className?: string; fill?: string }) {
  const s = size / 10
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        className={className}
        d={`M 0 ${3 * s} C ${-6 * s} ${-3 * s} ${-12 * s} ${4 * s} 0 ${12 * s} C ${12 * s} ${4 * s} ${6 * s} ${-3 * s} 0 ${3 * s} Z`}
        fill={fill}
        stroke={INK}
        strokeWidth="1.2"
      />
    </g>
  )
}

function OwlFeathers({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  const rows: ReactNode[] = []
  for (let row = 0; row < 3; row++) {
    for (let col = -1; col <= 1; col++) {
      const x = cx + col * r * 0.55 + (row % 2 ? r * 0.27 : 0)
      const y = cy - r * 0.45 + row * r * 0.45
      if (row % 2 && col === 1) continue
      rows.push(<path key={`${row}${col}`} d={`M ${x - 5} ${y} Q ${x} ${y + 6} ${x + 5} ${y}`} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.7" />)
    }
  }
  return <g>{rows}</g>
}

// ---------------------------------------------------------------------------
// Species parts (head-local units: head radius 40, origin at its centre)
// ---------------------------------------------------------------------------

function tailArt(species: PetSpecies, p: Palette): ReactNode {
  switch (species) {
    case 'pup':
      return <ellipse cx="8" cy="-8" rx="6" ry="14" fill={p.dark} stroke={INK} strokeWidth="2.5" transform="rotate(40 8 -8)" />
    case 'kitty':
      return (
        <>
          <path d="M 0 0 C 22 -2 26 -26 14 -36" fill="none" stroke={INK} strokeWidth="12" strokeLinecap="round" />
          <path d="M 0 0 C 22 -2 26 -26 14 -36" fill="none" stroke={p.body} strokeWidth="7" strokeLinecap="round" />
        </>
      )
    case 'bunny':
      return <circle cx="2" cy="4" r="10" fill="#ffffff" stroke={INK} strokeWidth="2.5" />
    case 'dino':
      return <path d="M -10 -10 Q 26 -6 36 14 Q 14 10 -6 12 Z" fill={p.body} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
    case 'panda':
      return <circle cx="0" cy="4" r="7" fill={p.dark} stroke={INK} strokeWidth="2" />
    case 'owl':
      return <path d="M -6 6 L 10 16 L 2 4 L 12 6 L -2 -4 Z" fill={p.dark} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
  }
}

function earsBehind(species: PetSpecies, p: Palette): ReactNode {
  switch (species) {
    case 'pup':
      return null
    case 'kitty':
      return (
        <>
          <path d="M -34 -14 L -30 -50 L -6 -36 Z" fill={p.body} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M 34 -14 L 30 -50 L 6 -36 Z" fill={p.body} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M -28 -22 L -27 -41 L -14 -33 Z" fill={p.inner} />
          <path d="M 28 -22 L 27 -41 L 14 -33 Z" fill={p.inner} />
        </>
      )
    case 'bunny':
      return (
        <>
          <ellipse cx="-15" cy="-52" rx="10" ry="28" fill={p.body} stroke={INK} strokeWidth="3" transform="rotate(-10 -15 -52)" />
          <ellipse cx="15" cy="-52" rx="10" ry="28" fill={p.body} stroke={INK} strokeWidth="3" transform="rotate(10 15 -52)" />
          <ellipse cx="-15" cy="-50" rx="5" ry="19" fill={p.inner} transform="rotate(-10 -15 -50)" />
          <ellipse cx="15" cy="-50" rx="5" ry="19" fill={p.inner} transform="rotate(10 15 -50)" />
        </>
      )
    case 'dino':
      return (
        <>
          <path d="M -22 -30 L -16 -50 L -6 -36 Z" fill={p.inner} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M -6 -38 L 2 -58 L 10 -38 Z" fill={p.inner} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M 8 -36 L 18 -50 L 24 -30 Z" fill={p.inner} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        </>
      )
    case 'panda':
      return (
        <>
          <circle cx="-28" cy="-30" r="12" fill={p.dark} stroke={INK} strokeWidth="2.5" />
          <circle cx="28" cy="-30" r="12" fill={p.dark} stroke={INK} strokeWidth="2.5" />
        </>
      )
    case 'owl':
      return (
        <>
          <path d="M -32 -18 L -30 -48 L -12 -32 Z" fill={p.dark} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M 32 -18 L 30 -48 L 12 -32 Z" fill={p.dark} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        </>
      )
  }
}

function earsFront(species: PetSpecies, p: Palette, k: number): ReactNode {
  if (species === 'pup') {
    return (
      <>
        <ellipse cx="-36" cy="-6" rx="11" ry="22" fill={p.dark} stroke={INK} strokeWidth={2.5 / k} transform="rotate(18 -36 -6)" />
        <ellipse cx="36" cy="-6" rx="11" ry="22" fill={p.dark} stroke={INK} strokeWidth={2.5 / k} transform="rotate(-18 36 -6)" />
        <ellipse cx="0" cy="14" rx="15" ry="11" fill={p.belly} />
      </>
    )
  }
  if (species === 'kitty') {
    return (
      <>
        <ellipse cx="0" cy="14" rx="14" ry="10" fill={p.belly} />
        <path d="M -12 -38 L -8 -28 M 0 -40 L 0 -29 M 12 -38 L 8 -28" stroke={p.dark} strokeWidth="3" strokeLinecap="round" />
      </>
    )
  }
  if (species === 'owl') {
    return (
      <>
        <circle cx="-14" cy="0" r="13" fill={p.belly} />
        <circle cx="14" cy="0" r="13" fill={p.belly} />
      </>
    )
  }
  if (species === 'panda') {
    return (
      <>
        <ellipse cx="-15" cy="1" rx="10" ry="13" fill={p.dark} transform="rotate(25 -15 1)" />
        <ellipse cx="15" cy="1" rx="10" ry="13" fill={p.dark} transform="rotate(-25 15 1)" />
      </>
    )
  }
  if (species === 'dino') {
    return <ellipse cx="0" cy="15" rx="16" ry="10" fill={p.belly} />
  }
  return <ellipse cx="0" cy="14" rx="13" ry="9" fill={p.belly} opacity="0.8" />
}

function Face({ species, mood, eyeR, p, k }: { species: PetSpecies; mood: PetMood; eyeR: number; p: Palette; k: number }) {
  const ex = 14
  const ey = 0
  const panda = species === 'panda'
  const eyeInk = panda ? '#ffffff' : INK
  const closedHappy = mood === 'happy'
  const closedSleepy = mood === 'sleepy'
  const lw = 3 / Math.max(k, 0.8)

  const eyes = closedHappy ? (
    <g fill="none" stroke={eyeInk} strokeWidth={lw} strokeLinecap="round">
      <path d={`M ${-ex - eyeR} ${ey + 2} Q ${-ex} ${ey - eyeR - 2} ${-ex + eyeR} ${ey + 2}`} />
      <path d={`M ${ex - eyeR} ${ey + 2} Q ${ex} ${ey - eyeR - 2} ${ex + eyeR} ${ey + 2}`} />
    </g>
  ) : closedSleepy ? (
    <g fill="none" stroke={eyeInk} strokeWidth={lw} strokeLinecap="round">
      <path d={`M ${-ex - eyeR} ${ey} Q ${-ex} ${ey + eyeR * 0.8} ${-ex + eyeR} ${ey}`} />
      <path d={`M ${ex - eyeR} ${ey} Q ${ex} ${ey + eyeR * 0.8} ${ex + eyeR} ${ey}`} />
    </g>
  ) : (
    <g className="cs-pet-blink">
      {panda ? (
        <>
          <circle cx={-ex} cy={ey} r={eyeR * 0.75} fill="#ffffff" />
          <circle cx={ex} cy={ey} r={eyeR * 0.75} fill="#ffffff" />
          <circle cx={-ex + 1} cy={ey + 0.5} r={eyeR * 0.42} fill={INK} />
          <circle cx={ex + 1} cy={ey + 0.5} r={eyeR * 0.42} fill={INK} />
        </>
      ) : (
        <>
          <circle cx={-ex} cy={ey} r={eyeR} fill={INK} />
          <circle cx={ex} cy={ey} r={eyeR} fill={INK} />
          <circle cx={-ex + eyeR * 0.35} cy={ey - eyeR * 0.4} r={eyeR * 0.36} fill="#ffffff" />
          <circle cx={ex + eyeR * 0.35} cy={ey - eyeR * 0.4} r={eyeR * 0.36} fill="#ffffff" />
          {mood === 'playful' && (
            <>
              <circle cx={-ex - eyeR * 0.35} cy={ey + eyeR * 0.35} r={eyeR * 0.18} fill="#ffffff" />
              <circle cx={ex - eyeR * 0.35} cy={ey + eyeR * 0.35} r={eyeR * 0.18} fill="#ffffff" />
            </>
          )}
        </>
      )}
    </g>
  )

  const cheeks = (
    <g fill={BLUSH} opacity={mood === 'sleepy' ? 0.5 : 0.85}>
      <ellipse cx={-25} cy={13} rx="6" ry="3.8" />
      <ellipse cx={25} cy={13} rx="6" ry="3.8" />
    </g>
  )

  let mouth: ReactNode
  if (species === 'owl') {
    mouth = <path d="M -6 8 L 6 8 L 0 18 Z" fill={p.inner} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
  } else if (mood === 'happy') {
    mouth = (
      <g>
        <path d="M -9 12 Q 0 26 9 12 Z" fill="#7a2840" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M -4 18 Q 0 23 4 18 Q 0 16 -4 18 Z" fill="#ff8fa6" />
      </g>
    )
  } else if (mood === 'hungry') {
    mouth = <ellipse cx="0" cy="16" rx="3.5" ry="4.5" fill="#7a2840" stroke={INK} strokeWidth="2" />
  } else if (mood === 'sleepy') {
    mouth = <path d="M -4 15 Q 0 18 4 15" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
  } else {
    mouth = <path d="M -8 13 Q -4 19 0 14 Q 4 19 8 13" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  }

  const nose =
    species === 'owl' ? null : (
      <ellipse cx="0" cy="8" rx={species === 'bunny' ? 3 : 4.5} ry={species === 'bunny' ? 2.2 : 3.2} fill={species === 'bunny' || species === 'kitty' ? '#ff8fa6' : INK} />
    )

  return (
    <g>
      {cheeks}
      {eyes}
      {nose}
      {mouth}
      {species === 'kitty' && (
        <g stroke={INK} strokeWidth="1.5" strokeLinecap="round" opacity="0.7">
          <path d="M -20 10 L -36 7 M -20 14 L -36 16" />
          <path d="M 20 10 L 36 7 M 20 14 L 36 16" />
        </g>
      )}
    </g>
  )
}

// ---------------------------------------------------------------------------
// Cosmetics
// ---------------------------------------------------------------------------

const FACE_ACCESSORIES = new Set(['star_glasses', 'heart_glasses', 'sunglasses'])

/** Hats: origin at the top of the head, head radius 40 (spans x -40..40, y 0..80). */
function hatArt(id: string): ReactNode {
  switch (id) {
    case 'cap':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M -30 12 Q -30 -18 0 -18 Q 30 -18 30 12 Z" fill="#ef4444" />
          <path d="M 18 10 Q 44 6 52 14 Q 40 18 18 14 Z" fill="#dc2626" />
          <circle cx="0" cy="-18" r="3" fill="#fca5a5" />
          <path d="M -12 -14 Q -6 -2 -8 10" fill="none" stroke="#fca5a5" strokeWidth="2" />
        </g>
      )
    case 'beanie':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M -32 12 Q -32 -26 0 -26 Q 32 -26 32 12 Z" fill="#38bdf8" />
          <rect x="-34" y="4" width="68" height="12" rx="6" fill="#0ea5e9" />
          <circle cx="0" cy="-30" r="8" fill="#f0f9ff" />
          <path d="M -16 -16 L -16 2 M 0 -20 L 0 2 M 16 -16 L 16 2" stroke="#7dd3fc" strokeWidth="2" />
        </g>
      )
    case 'wizard_hat':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <ellipse cx="0" cy="10" rx="40" ry="8" fill="#6d28d9" />
          <path d="M -26 8 L 6 -62 L 26 8 Z" fill="#7c3aed" />
          <polygon points={starPoints(2, -20, 8)} fill="#fde047" strokeWidth="1.5" />
          <circle cx="-8" cy="-2" r="2.5" fill="#fde047" stroke="none" />
          <circle cx="12" cy="-38" r="2" fill="#fde047" stroke="none" />
        </g>
      )
    case 'crown':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M -26 12 L -30 -20 L -14 -4 L 0 -26 L 14 -4 L 30 -20 L 26 12 Z" fill="#fbbf24" />
          <circle cx="0" cy="2" r="4.5" fill="#ef4444" />
          <circle cx="-16" cy="5" r="3" fill="#38bdf8" />
          <circle cx="16" cy="5" r="3" fill="#22c55e" />
        </g>
      )
    case 'party_hat':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M -18 8 L 0 -46 L 18 8 Z" fill="#f472b6" />
          <path d="M -12 -10 L 12 -2 M -6 -28 L 8 -22" stroke="#fde047" strokeWidth="4" />
          <circle cx="0" cy="-48" r="6" fill="#fde047" />
        </g>
      )
    case 'clover_hat':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <ellipse cx="0" cy="8" rx="34" ry="7" fill="#15803d" />
          <rect x="-20" y="-30" width="40" height="38" rx="4" fill="#16a34a" />
          <rect x="-20" y="-4" width="40" height="8" fill="#facc15" />
          <g fill="#4ade80" strokeWidth="1.5">
            <circle cx="-5" cy="-18" r="5" />
            <circle cx="5" cy="-18" r="5" />
            <circle cx="0" cy="-25" r="5" />
          </g>
        </g>
      )
    case 'flower_crown':
      return (
        <g stroke={INK} strokeWidth="1.8">
          <path d="M -34 12 Q 0 -6 34 12" fill="none" stroke="#16a34a" strokeWidth="4" />
          {[
            [-28, 8, '#f9a8d4'],
            [-14, 2, '#fde047'],
            [0, 0, '#c4b5fd'],
            [14, 2, '#fda4af'],
            [28, 8, '#fde047'],
          ].map(([x, y, c]) => (
            <g key={`${x}`} transform={`translate(${x} ${y})`}>
              <circle cx="0" cy="-5" r="4" fill={c as string} />
              <circle cx="5" cy="0" r="4" fill={c as string} />
              <circle cx="0" cy="5" r="4" fill={c as string} />
              <circle cx="-5" cy="0" r="4" fill={c as string} />
              <circle cx="0" cy="0" r="2.6" fill="#f59e0b" />
            </g>
          ))}
        </g>
      )
    case 'sun_hat':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <ellipse cx="0" cy="10" rx="54" ry="11" fill="#fcd34d" />
          <path d="M -24 10 Q -24 -22 0 -22 Q 24 -22 24 10 Z" fill="#fde68a" />
          <path d="M -24 2 Q 0 8 24 2 L 24 8 Q 0 14 -24 8 Z" fill="#f472b6" />
          <circle cx="20" cy="2" r="5" fill="#fb7185" />
        </g>
      )
    case 'witch_hat':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <ellipse cx="0" cy="10" rx="44" ry="9" fill="#4c1d95" />
          <path d="M -24 8 Q -10 -30 8 -52 Q 22 -60 30 -46 Q 18 -46 14 -30 L 24 8 Z" fill="#5b21b6" />
          <path d="M -23 0 L 23 0 L 24 8 L -24 8 Z" fill="#f97316" />
          <rect x="-6" y="-2" width="12" height="11" rx="2" fill="#fde047" />
        </g>
      )
    case 'santa_hat':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M -30 8 Q -20 -36 10 -36 Q 38 -32 42 -2 L 30 8 Z" fill="#ef4444" />
          <circle cx="42" cy="0" r="8" fill="#ffffff" />
          <rect x="-36" y="0" width="72" height="14" rx="7" fill="#ffffff" />
        </g>
      )
    default:
      return null
  }
}

/** Neck accessories: origin at the neck, body half-width 44. */
function neckAccessoryArt(id: string): ReactNode {
  switch (id) {
    case 'bowtie':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M 0 0 L -18 -10 L -18 10 Z" fill="#ec4899" />
          <path d="M 0 0 L 18 -10 L 18 10 Z" fill="#ec4899" />
          <circle cx="0" cy="0" r="5" fill="#be185d" />
        </g>
      )
    case 'bandana':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M -26 -4 Q 0 6 26 -4 L 0 24 Z" fill="#3b82f6" />
          <g fill="#ffffff" stroke="none">
            <circle cx="-8" cy="4" r="2" />
            <circle cx="8" cy="4" r="2" />
            <circle cx="0" cy="13" r="2" />
          </g>
        </g>
      )
    case 'medal':
      return (
        <g stroke={INK} strokeWidth="2.2" strokeLinejoin="round">
          <path d="M -14 -6 L -4 18 L 4 18 L 14 -6 L 6 -6 L 0 10 L -6 -6 Z" fill="#6366f1" />
          <circle cx="0" cy="24" r="10" fill="#fbbf24" />
          <polygon points={starPoints(0, 24, 6)} fill="#fef3c7" strokeWidth="1" />
        </g>
      )
    case 'leaf_scarf':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M -30 -6 Q 0 8 30 -6 L 30 4 Q 0 18 -30 4 Z" fill="#ea580c" />
          <path d="M 14 6 L 22 30 L 12 30 L 6 8 Z" fill="#f97316" />
          <path d="M 18 34 Q 26 30 26 38 Q 20 44 14 40 Q 12 36 18 34 Z" fill="#facc15" strokeWidth="1.8" />
        </g>
      )
    default:
      return null
  }
}

/** Face accessories: head-local units, eyes at (+-14, 0). */
function faceAccessoryArt(id: string): ReactNode {
  switch (id) {
    case 'star_glasses':
      return (
        <g stroke={INK} strokeWidth="2" strokeLinejoin="round">
          <polygon points={starPoints(-14, 0, 13)} fill="#fde047" fillOpacity="0.55" />
          <polygon points={starPoints(14, 0, 13)} fill="#fde047" fillOpacity="0.55" />
          <path d="M -6 -2 Q 0 -6 6 -2" fill="none" />
        </g>
      )
    case 'heart_glasses':
      return (
        <g stroke={INK} strokeWidth="2" strokeLinejoin="round">
          <path d="M -14 -4 C -18 -12 -28 -8 -26 0 C -24 6 -16 10 -14 12 C -12 10 -4 6 -2 0 C 0 -8 -10 -12 -14 -4 Z" fill="#f472b6" fillOpacity="0.75" />
          <path d="M 14 -4 C 10 -12 0 -8 2 0 C 4 6 12 10 14 12 C 16 10 24 6 26 0 C 28 -8 18 -12 14 -4 Z" fill="#f472b6" fillOpacity="0.75" />
          <path d="M -2 -2 L 2 -2" />
        </g>
      )
    case 'sunglasses':
      return (
        <g stroke={INK} strokeWidth="2" strokeLinejoin="round">
          <rect x="-27" y="-8" width="22" height="15" rx="6" fill="#1f2937" />
          <rect x="5" y="-8" width="22" height="15" rx="6" fill="#1f2937" />
          <path d="M -5 -3 Q 0 -6 5 -3" fill="none" />
          <path d="M -22 -4 L -16 -4" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
          <path d="M 10 -4 L 16 -4" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
        </g>
      )
    default:
      return null
  }
}

/** Habitats: full 200 x 200 backgrounds, clipped to a circle by the caller. */
function habitatArt(id: string | null, uid: string): ReactNode {
  switch (id) {
    case 'meadow':
      return (
        <g>
          <rect width="200" height="200" fill="#bfe7ff" />
          <circle cx="160" cy="40" r="16" fill="#fde047" />
          <ellipse cx="60" cy="210" rx="140" ry="70" fill="#86d97a" />
          <ellipse cx="170" cy="215" rx="110" ry="60" fill="#6cc864" />
          {[[30, 160], [62, 172], [150, 168], [175, 156]].map(([x, y]) => (
            <g key={`${x}`} transform={`translate(${x} ${y})`}>
              <circle r="3" cx="-3" fill="#fff" />
              <circle r="3" cx="3" fill="#fff" />
              <circle r="3" cy="-3" fill="#fff" />
              <circle r="3" cy="3" fill="#fff" />
              <circle r="2.2" fill="#facc15" />
            </g>
          ))}
        </g>
      )
    case 'bedroom':
      return (
        <g>
          <rect width="200" height="200" fill="#e9dcff" />
          <rect y="150" width="200" height="50" fill="#d6a46c" />
          <path d="M 0 165 H 200 M 0 182 H 200" stroke="#c08a53" strokeWidth="2" />
          <rect x="128" y="34" width="48" height="44" rx="6" fill="#1e3a8a" stroke="#ffffff" strokeWidth="4" />
          <circle cx="160" cy="50" r="8" fill="#fef9c3" />
          <circle cx="155" cy="47" r="7" fill="#1e3a8a" />
          <ellipse cx="100" cy="182" rx="70" ry="10" fill="#f9a8d4" opacity="0.8" />
          <path d="M 20 40 L 30 30 L 40 40 Z" fill="#fde047" opacity="0.7" />
        </g>
      )
    case 'beach':
      return (
        <g>
          <rect width="200" height="200" fill="#a5e4ff" />
          <circle cx="40" cy="44" r="18" fill="#fde047" />
          <rect y="120" width="200" height="40" fill="#38bdf8" />
          <path d="M 0 124 Q 20 118 40 124 T 80 124 T 120 124 T 160 124 T 200 124" fill="none" stroke="#e0f2fe" strokeWidth="3" />
          <ellipse cx="100" cy="200" rx="150" ry="50" fill="#fde68a" />
          <circle cx="160" cy="168" r="4" fill="#fb923c" />
        </g>
      )
    case 'space':
      return (
        <g>
          <rect width="200" height="200" fill="#1e1b4b" />
          {[[24, 30], [70, 18], [150, 26], [180, 80], [30, 110], [120, 60], [60, 70], [176, 140]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2 : 1.3} fill="#ffffff" />
          ))}
          <circle cx="156" cy="56" r="16" fill="#f472b6" />
          <ellipse cx="156" cy="56" rx="28" ry="6" fill="none" stroke="#fde047" strokeWidth="3" transform="rotate(-18 156 56)" />
          <ellipse cx="100" cy="214" rx="140" ry="50" fill="#a5b4fc" />
          <circle cx="60" cy="182" r="6" fill="#818cf8" />
          <circle cx="140" cy="186" r="4" fill="#818cf8" />
        </g>
      )
    case 'garden':
      return (
        <g>
          <rect width="200" height="200" fill="#d9f2ff" />
          <ellipse cx="100" cy="214" rx="150" ry="60" fill="#7bd389" />
          {[[24, 150, '#f87171'], [46, 162, '#fbbf24'], [156, 160, '#f472b6'], [178, 148, '#a78bfa']].map(([x, y, c]) => (
            <g key={`${x}`}>
              <path d={`M ${x} ${y} L ${x} ${(y as number) + 22}`} stroke="#16a34a" strokeWidth="3" />
              <path d={`M ${(x as number) - 7} ${y} Q ${x} ${(y as number) + 12} ${(x as number) + 7} ${y} L ${(x as number) + 4} ${(y as number) - 8} L ${x} ${(y as number) - 3} L ${(x as number) - 4} ${(y as number) - 8} Z`} fill={c as string} />
            </g>
          ))}
          <path d="M 120 40 q 6 -8 12 0 q 6 -8 12 0" fill="none" stroke="#7c3aed" strokeWidth="2" />
        </g>
      )
    case 'fireworks':
      return (
        <g>
          <rect width="200" height="200" fill="#172554" />
          {[
            [50, 50, '#f472b6'],
            [150, 40, '#fde047'],
            [110, 90, '#4ade80'],
          ].map(([x, y, c]) => (
            <g key={`${x}`} stroke={c as string} strokeWidth="3" strokeLinecap="round" className="cs-pet-twinkle">
              {Array.from({ length: 8 }, (_, i) => {
                const a = (Math.PI / 4) * i
                return (
                  <path
                    key={i}
                    d={`M ${(x as number) + 6 * Math.cos(a)} ${(y as number) + 6 * Math.sin(a)} L ${(x as number) + 18 * Math.cos(a)} ${(y as number) + 18 * Math.sin(a)}`}
                  />
                )
              })}
            </g>
          ))}
          <ellipse cx="100" cy="216" rx="150" ry="52" fill="#1e3a8a" />
        </g>
      )
    case 'harvest':
      return (
        <g>
          <defs>
            <linearGradient id={`harvest${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="100%" stopColor="#fdba74" />
            </linearGradient>
          </defs>
          <rect width="200" height="200" fill={`url(#harvest${uid})`} />
          <ellipse cx="60" cy="214" rx="140" ry="64" fill="#c2803e" />
          <ellipse cx="170" cy="220" rx="110" ry="58" fill="#a16207" />
          <g transform="translate(166 164)">
            <ellipse rx="15" ry="12" fill="#f97316" stroke={INK} strokeWidth="2" />
            <path d="M -5 -11 Q 0 6 5 -11" fill="none" stroke="#c2410c" strokeWidth="1.5" />
            <path d="M 0 -12 L 2 -18" stroke="#166534" strokeWidth="3" strokeLinecap="round" />
          </g>
          <path d="M 30 40 q 6 -10 12 0 q -6 8 -12 0 Z" fill="#dc2626" />
          <path d="M 140 30 q 6 -10 12 0 q -6 8 -12 0 Z" fill="#f59e0b" />
        </g>
      )
    default:
      return (
        <g>
          <rect width="200" height="200" fill="#eef2ff" />
          <ellipse cx="100" cy="214" rx="140" ry="44" fill="#e0e7ff" />
        </g>
      )
  }
}
