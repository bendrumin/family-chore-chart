/**
 * First-touch signup attribution.
 *
 * Every page load calls captureAttribution() (mounted once from the root
 * layout). The first visit's UTM parameters, external referrer, and landing
 * path are stored in localStorage; a later visit only replaces the record if
 * it carries UTM parameters and the stored one does not (a tagged campaign
 * beats an untagged first touch). At signup the record rides the POST and the
 * server writes it to profiles.signup_source.
 *
 * The pure logic lives in firstTouch() so it is unit-testable without a
 * browser; the storage wrappers tolerate localStorage being unavailable.
 */

export interface AttributionRecord {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  referrer?: string
  landing?: string
  captured_at?: string
}

const STORAGE_KEY = 'chorestar-attribution'
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

const clip = (s: string) => s.slice(0, 200)

/** Build the record for the current visit; null when there is nothing to say. */
export function visitRecord(url: URL, referrer: string, now: Date): AttributionRecord | null {
  const rec: AttributionRecord = {}
  for (const k of UTM_KEYS) {
    const v = url.searchParams.get(k)
    if (v) rec[k] = clip(v)
  }
  // Only an external referrer is attribution; same-origin is just navigation.
  if (referrer) {
    try {
      const ref = new URL(referrer)
      if (ref.origin !== url.origin) rec.referrer = clip(ref.origin + ref.pathname)
    } catch {
      /* unparseable referrer: ignore */
    }
  }
  const hasSignal = Object.keys(rec).length > 0
  // A bare direct visit to the landing page still tells us "direct".
  rec.landing = clip(url.pathname)
  rec.captured_at = now.toISOString()
  return hasSignal || url.pathname !== '/' ? rec : rec
}

/** First-touch merge: keep the existing record unless the new visit is tagged
 *  with UTMs and the stored one is not. */
export function firstTouch(
  existing: AttributionRecord | null,
  visit: AttributionRecord | null
): AttributionRecord | null {
  if (!existing) return visit
  if (!visit) return existing
  const existingTagged = Boolean(existing.utm_source)
  const visitTagged = Boolean(visit.utm_source)
  if (!existingTagged && visitTagged) return visit
  return existing
}

/** Called on every page load (client only). Safe when storage is blocked. */
export function captureAttribution(): void {
  if (typeof window === 'undefined') return
  try {
    const existingRaw = window.localStorage.getItem(STORAGE_KEY)
    const existing: AttributionRecord | null = existingRaw ? JSON.parse(existingRaw) : null
    const visit = visitRecord(new URL(window.location.href), document.referrer, new Date())
    const merged = firstTouch(existing, visit)
    if (merged && merged !== existing) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    }
  } catch {
    /* private mode / blocked storage: attribution is best-effort */
  }
}

/** Read the stored record for the signup request. */
export function getAttribution(): AttributionRecord | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
