export type ThemeMode = 'light' | 'dark' | 'auto'

export const THEME_MODE_STORAGE_KEY = 'chorestar-theme-mode'
/**
 * The resolved theme CSS variables (light and dark sets) for the signed-in
 * family, written by the dashboard's SettingsProvider and re-applied by the
 * inline init script on EVERY page (marketing, blog, how-to, auth). This is
 * what makes a picked accent follow the user off the dashboard without a
 * flash: the public pages have no provider, so without it they'd snap back to
 * the brand default.
 */
export const THEME_VARS_STORAGE_KEY = 'chorestar-theme-vars'

export interface StoredThemeVars {
  id: string
  reach: 'full' | 'accent'
  light: Record<string, string>
  dark: Record<string, string>
}

export function storeThemeVars(payload: StoredThemeVars): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(THEME_VARS_STORAGE_KEY, JSON.stringify(payload)) } catch { /* storage unavailable */ }
}

/** Forget the stored accent and strip it from the current document (sign-out, theme cleared). */
export function clearStoredThemeVars(): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(THEME_VARS_STORAGE_KEY)
    if (raw) {
      const payload = JSON.parse(raw) as StoredThemeVars
      const root = document.documentElement
      for (const name of Object.keys({ ...payload.light, ...payload.dark })) root.style.removeProperty(name)
      root.removeAttribute('data-seasonal-theme')
      root.removeAttribute('data-theme-reach')
    }
    localStorage.removeItem(THEME_VARS_STORAGE_KEY)
  } catch { /* storage unavailable */ }
}

/** True when auto mode should use dark (OS preference or evening/morning hours). */
export function shouldUseDarkAuto(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return true
  const hour = new Date().getHours()
  return hour >= 19 || hour < 7
}

export function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return shouldUseDarkAuto()
}

export function getStoredThemeMode(): ThemeMode | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(THEME_MODE_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored
  return null
}

export function setStoredThemeMode(mode: ThemeMode): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(THEME_MODE_STORAGE_KEY, mode)
}

export function clearStoredThemeMode(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(THEME_MODE_STORAGE_KEY)
}

export function getEffectiveThemeMode(): ThemeMode {
  return getStoredThemeMode() ?? 'auto'
}

export function applyThemeClasses(isDark: boolean): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (isDark) {
    root.classList.add('dark')
    root.setAttribute('data-theme', 'dark')
    document.body?.setAttribute('data-theme', 'dark')
  } else {
    root.classList.remove('dark')
    root.setAttribute('data-theme', 'light')
    document.body?.setAttribute('data-theme', 'light')
  }
}

export function applyThemeMode(mode: ThemeMode): void {
  applyThemeClasses(resolveIsDark(mode))
}

/** Inline script for layout <head> — prevents flash before React hydrates. */
export const THEME_INIT_SCRIPT = `(function(){try{var d=document.documentElement,m=localStorage.getItem('${THEME_MODE_STORAGE_KEY}'),dark;if(m==='dark')dark=true;else if(m==='light')dark=false;else dark=window.matchMedia('(prefers-color-scheme:dark)').matches||(function(){var h=new Date().getHours();return h>=19||h<7})();if(dark){d.classList.add('dark');d.setAttribute('data-theme','dark')}else{d.classList.remove('dark');d.setAttribute('data-theme','light')}var v=localStorage.getItem('${THEME_VARS_STORAGE_KEY}');if(v){var o=JSON.parse(v),set=dark?o.dark:o.light;for(var k in set)d.style.setProperty(k,set[k]);if(o.id)d.setAttribute('data-seasonal-theme',o.id);if(o.reach)d.setAttribute('data-theme-reach',o.reach)}}catch(e){}})()`
