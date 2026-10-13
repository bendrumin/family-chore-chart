import { AmbientBackground } from '@/components/ui/ambient-background'

/**
 * Page wrapper for public content pages (blog, how-to).
 *
 * Logged out, this is the brand page exactly as before: the indigo wash, no
 * glow. When a signed-in family has a theme (html[data-seasonal-theme], set
 * before first paint by THEME_INIT_SCRIPT), globals.css swaps in the dashboard's
 * backdrop: var(--gradient-bg) plus the theme-tinted ambient glow, matching
 * components/home/logged-in-home.tsx. Pure CSS, so it stays a server component
 * and pages keep their static rendering and metadata.
 *
 * Pair accents inside with the themed-* marker classes from globals.css.
 */
export function PublicPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-page min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <AmbientBackground className="public-page-ambient" />
      <div className="public-page-content">{children}</div>
    </div>
  )
}
