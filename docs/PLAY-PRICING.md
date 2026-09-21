# Google Play pricing and releases from the command line

Most of Play's money and release surface has an API. `chorestar-nextjs/scripts/play-prices.mjs`
drives the pricing half, the way `ChoreStar-iOS/scripts/apply-latam-prices.mjs`
drives Apple's and `scripts/stripe-latam-prices.mjs` drives Stripe's.

```
cd chorestar-nextjs
node --env-file=.env.local scripts/play-prices.mjs show          # products, base plans, regional prices
node --env-file=.env.local scripts/play-prices.mjs convert 4.99  # Google's suggested local prices
node --env-file=.env.local scripts/play-prices.mjs plan          # dry run of our PPP targets
node --env-file=.env.local scripts/play-prices.mjs apply         # write them
node --env-file=.env.local scripts/play-prices.mjs apply TIER2   # or a single region: apply MX
```

It reads `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (raw or base64) and
`GOOGLE_PLAY_PACKAGE_NAME` exactly as `lib/google/play-api.ts` does, so the key
is never copied or printed. The same env vars live in Vercel; for local runs the
key has to be in `.env.local` (or any file passed to `--env-file`).

**The service account needs Play Console permissions.** Verifying purchases only
needs the financial-data scope, but editing prices needs a role that includes
store presence. Grant it under Users and permissions in the Play Console, to the
service account's own email address.

## What the API can do

| Task | API | Notes |
|---|---|---|
| Subscription base-plan prices per region | `subscriptions.patch` with `updateMask=basePlans` | Needs `regionsVersion.version`; our script handles it |
| Suggested local prices for a base price | `pricing:convertRegionPrices` | What the Console's auto-convert button calls |
| Move existing subscribers onto a new price | `subscriptions.basePlans.batchMigratePrices` | Deliberately not in the script: a price change alone leaves current subscribers where they are |
| Offers and free trials | `subscriptions.basePlans.offers.*` | Create, activate, deactivate |
| One-time product prices | `inappproducts.patch` | `prices` map keyed by region |
| Upload a bundle, pick a track, release notes | `edits.bundles.upload`, `edits.tracks.update` | `fastlane supply` wraps this |
| Store listing text and images | `edits.listings.*`, `edits.images.*` | Per language |
| Reviews, RTDN subscriptions, voided purchases | `reviews.*`, `purchases.*` | Already used by `/api/google/*` |

## What stays manual in the Console

Creating the app itself, identity verification, the Data Safety form, the
content rating questionnaire, target audience and Designed for Families
answers, granting the service account its permissions, and the closed-test
tester opt-in. None of those have a public API.

## Prices we use

The same purchasing-power set as Apple and Stripe: MX, BR and IN, plus a tier-2
batch of CL, CO, AR, TR, EG, ID, PH, VN, PK and NG. The table lives at the top
of the script; keep it in step with `ChoreStar-iOS/scripts/apply-latam-prices.mjs`.
Play's regions are ISO-2 codes where Apple's territories are ISO-3.

## fastlane, for the parts it does well

`ChoreStar-Android-Native/fastlane` holds an Appfile and Fastfile, so the
Android side has the same shape as the iOS one:

```
cd ChoreStar-Android-Native
fastlane android state                        # what is on each track
fastlane android validate                     # dry run against Play, writes nothing
fastlane android internal                     # build the bundle, upload as a draft
fastlane android internal rollout:true        # and roll it out to testers
fastlane android metadata                     # listing text and graphics only
fastlane android promote from:internal to:production
```

The key comes from `SUPPLY_JSON_KEY`, defaulting to
`~/.chorestar-android/play-key.json`, which is where the Play service-account
JSON now lives. Keep it out of the repo.

Two things supply cannot do, which is why the node scripts exist:
subscription products and prices (`scripts/play-prices.mjs`) and the
cross-store price audit (`scripts/compare-store-prices.mjs`). Supply also
needs a `track` and a `version_code` for a metadata-only run, since with no
binary it cannot tell which release a changelog belongs to; both lanes pass
them already.

Images live twice on purpose: `docs/assets/play` is the source, and
`fastlane/metadata/android/en-US/images` is the copy supply reads. Update both
or re-copy when the screenshots change.
