import Link from 'next/link'

export const APP_STORE_URL = 'https://apps.apple.com/app/id6761279049'
/** Opens the App Store's "Write a Review" sheet directly (on Apple devices). */
export const APP_STORE_REVIEW_URL = 'https://apps.apple.com/app/id6761279049?action=write-review'

/**
 * "Download on the App Store" badge. Drawn in-house (rounded black badge,
 * inline Apple glyph) so we don't hotlink Apple's asset through our CSP.
 */
export function AppStoreBadge({ className = '' }: { className?: string }) {
  return (
    <Link
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Download ChoreStar on the App Store"
      className={`inline-flex items-center gap-3 px-6 py-3 bg-black text-white rounded-xl border border-gray-700 hover:scale-105 transition-transform shadow-lg ${className}`}
    >
      <svg viewBox="0 0 384 512" className="w-7 h-7 fill-current shrink-0" aria-hidden="true">
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
      </svg>
      <span className="text-left leading-tight">
        <span className="block text-[11px] opacity-80">Download on the</span>
        <span className="block text-lg font-semibold -mt-0.5">App Store</span>
      </span>
    </Link>
  )
}
