'use client'

import { useEffect, useState } from 'react'
import { detectKidLocale } from '@/lib/i18n/kid'

/**
 * Wraps the kid routes (/kid/*, /kid-login/*) in a container that flips to
 * dir="rtl" when the detected kid locale reads right to left (Arabic).
 *
 * The server and the first client render leave `dir` unset (LTR), and the
 * detected direction is applied in an effect after hydration — the same
 * pattern useKidT uses for the locale — so the markup never mismatches.
 * Parent-facing routes are untouched: this only wraps the kid layouts.
 */
export function KidDirection({ children }: { children: React.ReactNode }) {
  const [dir, setDir] = useState<'rtl' | undefined>(undefined)

  useEffect(() => {
    if (detectKidLocale() === 'ar') setDir('rtl')
  }, [])

  return <div dir={dir}>{children}</div>
}
