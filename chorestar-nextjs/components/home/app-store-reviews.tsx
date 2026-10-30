import { APP_STORE_REVIEWS } from '@/lib/constants/reviews'

/** Real App Store reviews, each labelled as one. Used wherever we quote parents. */
export function AppStoreReviews({ className = '' }: { className?: string }) {
  return (
    <div className={`grid md:grid-cols-2 gap-6 max-w-4xl mx-auto ${className}`}>
      {APP_STORE_REVIEWS.map(({ title, quote, name, date }) => (
        <figure key={name} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-indigo-100 dark:border-indigo-900">
          <div className="text-yellow-400 text-lg mb-3" role="img" aria-label="5 out of 5 stars">⭐⭐⭐⭐⭐</div>
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">{title}</p>
          <blockquote className="text-gray-700 dark:text-gray-300 mb-4 italic text-sm leading-relaxed">&ldquo;{quote}&rdquo;</blockquote>
          <figcaption>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">App Store review, {date}</p>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
