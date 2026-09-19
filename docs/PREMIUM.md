# Premium: what is promised vs what is gated

Audited 2026-09-19, the week the second paying subscriber arrived. Every
surface that describes Premium was compared against the code that enforces
it, on both platforms. Keep this table true when either side changes.

| Promise | Web gate | iOS gate | Status |
|---|---|---|---|
| Unlimited children (free: 3) | add-child-modal, `getChildLimit` | `childLimit` | gated both |
| Unlimited chores (free: 20, family-wide) | add-chore-modal, `getChoreLimit` | `choreLimit` | gated both (web since 2026-09-16) |
| Unlimited reward store items (free: 3) | server `wallet.ts` limits | `rewardItemLimit` + server | gated both |
| Unlimited goals (free: 1) | server `wallet.ts` limits | server | gated both |
| Premium themes (Ocean, Sunset, Forest, Aurora, Coral, Lavender) | **none** (all themes free) | `SeasonalTheme.isPremium` locks the six | gated iOS only |
| Family sharing / co-parent | **none** | **none** | advertised, free everywhere |
| Export reports (PDF, CSV) | exists, **ungated** | feature does not exist | advertised, free on web |
| Advanced analytics / full insights | **ungated** | **ungated** | advertised, free everywhere |
| Priority email support | process, not code | | fine |

Copy that was false and is now fixed (2026-09-19): the homepage FAQ promised
a Premium trial (none exists: no Stripe `trial_period_days`, no Apple
introductory offer on either subscription); the iOS upgrade prompt listed
"Custom icons & categories" (never gated) and "Export reports" (no such
feature on iOS); the iOS paywall listed "Full insights & analytics"
(ungated). Both iOS screens now list only the gated set.

Bug fixed 2026-09-19: the Stripe webhook granted a tier only for
`mode=subscription`, so a Lifetime checkout ($149.99, one-time) would have
charged and granted nothing. `tierForCheckout()` in
`lib/utils/subscription.ts` is the tested decision now.

## Billing plumbing state

- Apple: proven live twice (2026-08-27 pre-token, healed; 2026-09-17 clean
  `SUBSCRIBED` -> premium with zero manual steps).
- Stripe: live key, webhook enabled for checkout.session.completed,
  customer.subscription.updated/deleted, invoice.payment_failed; prices
  live ($4.99 mo, $49.99 yr, $149.99 lifetime); all five env vars present
  in Vercel production. Never exercised: zero completed live checkouts
  ever (five abandoned sessions, last 2026-02-01). Code-reviewed, not
  battle-tested. A $0.50 self-purchase and refund would settle it.

## Open product decision (2026-09-19)

Four advertised-premium features are free in practice: premium themes on
web, family sharing, export, analytics. Usage today: 2 families share
(both free), 1 free family uses a premium theme (Lavender). Options:
(a) gate them to match the promise, grandfathering the three families;
(b) stop advertising them as premium and let Premium stand on limits
(kids, chores, store, goals) plus themes on iOS. Either is honest; the
current state is not.
