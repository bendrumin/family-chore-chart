/**
 * Read-aloud steps (free): the routine player speaks the step title with the
 * browser's SpeechSynthesis. On device, no network, nothing stored.
 *
 * Which language: the text spoken is what the kid sees. A known template
 * string ("Brush Teeth") is localized to the kid's device language for
 * display, so it's spoken in that language. Anything a parent typed is spoken
 * in the family's language from Settings > Family, falling back to the
 * device language.
 */

const BCP47: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-BR',
  ar: 'ar-SA',
  fr: 'fr-FR',
  de: 'de-DE',
}

/** 'es' → 'es-ES'; a full tag ('en-GB') passes through; junk → null. */
export function toSpeechTag(lang: string | null | undefined): string | null {
  if (!lang) return null
  const trimmed = lang.trim()
  if (!/^[a-zA-Z]{2,3}([-_][a-zA-Z0-9]{2,8})*$/.test(trimmed)) return null
  if (trimmed.includes('-') || trimmed.includes('_')) return trimmed.replace('_', '-')
  return BCP47[trimmed.toLowerCase()] ?? trimmed.toLowerCase()
}

export function speechLangFor(opts: {
  /** family_settings.language ('en', 'es', ...), when known. */
  familyLanguage?: string | null
  /** The kid UI locale the title was displayed in. */
  kidLocale?: string | null
  /** True when the displayed title is a localized template string. */
  localized?: boolean
  /** navigator.language, the last resort. */
  deviceLanguage?: string | null
}): string {
  if (opts.localized) {
    const tag = toSpeechTag(opts.kidLocale)
    if (tag) return tag
  }
  return toSpeechTag(opts.familyLanguage) ?? toSpeechTag(opts.deviceLanguage) ?? 'en-US'
}

/** What gets read: the title, then the description if the parent wrote one. */
export function speechTextFor(title: string, description?: string | null): string {
  const t = title.trim()
  const d = (description ?? '').trim()
  if (!d) return t
  return /[.!?]$/.test(t) ? `${t} ${d}` : `${t}. ${d}`
}

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
}

/**
 * Speak `text` now, cancelling anything already queued. Picks an installed
 * voice for the language when there is one. A little slower than default, for
 * young listeners. Never throws.
 */
export function speak(text: string, lang: string): boolean {
  if (!speechSupported() || !text.trim()) return false
  try {
    const synth = window.speechSynthesis
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = 0.9
    u.pitch = 1.05
    const base = lang.split('-')[0].toLowerCase()
    const voices = synth.getVoices?.() ?? []
    const voice =
      voices.find(v => v.lang?.toLowerCase() === lang.toLowerCase()) ??
      voices.find(v => v.lang?.toLowerCase().startsWith(base))
    if (voice) u.voice = voice
    synth.speak(u)
    return true
  } catch {
    return false
  }
}

export function stopSpeaking(): void {
  if (!speechSupported()) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    // nothing to stop
  }
}
