'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const GLYPHS = ['⭐', '✨', '🌟', '💫']

interface Sparkle {
  x: number
  y: number
  toX: number
  toY: number
  duration: number
  glyph: string
}

/**
 * Drifting star emoji behind the kid-mode screens.
 *
 * The positions are random, so they are generated after mount. Calling
 * Math.random() during render made the server and client markup disagree,
 * which React reported as error #418 on every kid-login load and then
 * re-rendered the whole page on the client.
 *
 * `drift` 'down' sends each star to a new random height (kid login and
 * dashboard); 'around' nudges it up to 100px in any direction (routine
 * player, which keeps its motion gentler).
 */
export function FloatingSparkles({ count = 20, drift = 'down' }: { count?: number; drift?: 'down' | 'around' }) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([])

  useEffect(() => {
    const w = window.innerWidth
    const h = window.innerHeight
    setSparkles(
      Array.from({ length: count }, () => {
        const x = Math.random() * w
        const y = Math.random() * h
        return {
          x,
          y,
          toX: drift === 'around' ? x + (Math.random() - 0.5) * 200 : x,
          toY: drift === 'around' ? y + (Math.random() - 0.5) * 200 : Math.random() * h,
          duration: 15 + Math.random() * 10,
          glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        }
      })
    )
  }, [count, drift])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
      {sparkles.map((s, i) => (
        <motion.div
          key={i}
          className="absolute text-6xl opacity-10"
          initial={{ x: s.x, y: s.y }}
          animate={
            drift === 'around'
              ? { x: [null, s.toX], y: [null, s.toY], rotate: [0, 360] }
              : { y: [null, s.toY], rotate: [0, 360] }
          }
          transition={{ duration: s.duration, repeat: Infinity, ease: 'linear' }}
        >
          {s.glyph}
        </motion.div>
      ))}
    </div>
  )
}
