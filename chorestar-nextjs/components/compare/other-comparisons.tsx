import Link from 'next/link'
import { COMPARISON_PAGES } from '@/lib/constants/comparison'

/**
 * Cross-links the comparison spokes to each other.
 *
 * Each spoke used to be reachable only from the hub, one internal link apiece,
 * and Google had all four sitting at "Discovered - currently not indexed".
 * These are the highest-intent pages on the site, so they are worth linking
 * from somewhere other than a single hub page.
 */
export function OtherComparisons({ current }: { current: string }) {
  const others = COMPARISON_PAGES.filter((p) => p.slug !== '' && p.slug !== current)
  if (!others.length) return null

  return (
    <section className="border-t border-gray-200 dark:border-gray-800 pt-8">
      <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Other comparisons</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {others.map((page) => (
          <Link
            key={page.slug}
            href={page.path}
            className="group block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 transition-colors hover:border-indigo-300 dark:hover:border-indigo-600"
          >
            <div className="text-sm font-semibold leading-snug text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              {page.title}
            </div>
          </Link>
        ))}
      </div>
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Or start with the{' '}
        <Link href="/compare" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
          full comparison
        </Link>
        .
      </p>
    </section>
  )
}
