/**
 * Real App Store reviews, quoted word for word (from App Store Connect's
 * customer reviews). The only testimonials the site may show: anything added
 * here must be a real review or a quote a family agreed to, never written by
 * us. A cut is marked with an ellipsis; don't tidy the wording.
 */
export interface AppStoreReview {
  title: string
  quote: string
  /** The reviewer's public App Store nickname. */
  name: string
  date: string
}

export const APP_STORE_REVIEWS: AppStoreReview[] = [
  {
    title: 'Really awesome and intricate chore app',
    quote:
      'Pleasantly surprised with how detailed this app is and how easy it is to use. Awesome app for me and my kids!',
    name: 'MockBucketss',
    date: 'October 2026',
  },
  {
    title: 'Great app',
    quote: 'This app is amazing, being able to set a price amount for each chore helps keep my son motivated…',
    name: 'Katieko17',
    date: 'October 2026',
  },
]
