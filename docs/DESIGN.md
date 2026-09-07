# ChoreStar Design System

The rules behind the September 2026 restraint pass, for both platforms. This is
the brief new UI is built against: when a change would break one of these rules,
the rule wins unless this document is updated in the same change.

## The one-sentence direction

Spend the boldness in one place. The seasonal hero and kid mode carry all the
color and celebration; every parent surface around them stays quiet, factual,
and disciplined.

## Principles

1. **One accent, flat.** Parent chrome uses a single solid indigo. The
   indigo-to-purple brand gradient is reserved for the seasonal hero card and
   celebration effects (confetti, badge reveals). It never fills a button, a
   card, or a heading.
2. **Ink headings.** Headings and stat numbers render in solid ink or one
   semantic color. Never gradient-clipped text.
3. **Emoji are content, not chrome.** Emoji a family chose (chore icons,
   avatars, reward and goal emoji, routine type icons) appear everywhere they
   always did. Emoji baked into buttons, headings, badges, toasts, and empty
   states do not exist.
4. **Quiet cards.** White/system cards, 1px borders, hairline shadows. No
   purple-pink washes, no glow effects.
5. **Facts over fanfare (parent surfaces).** Parent-facing copy reports what
   happened: amounts, counts, streaks. Cheerleading ("Great job! Keep it up!")
   lives only on kid screens, where the celebration belongs.

## What stays untouched

- The seasonal hero card and all its palettes, greeting emoji included.
- Kid mode's white-on-gradient playfulness (`/kid`, `/kid-login` on web;
  kid login, kid dashboard, routine player, and celebrations on iOS).
- The brand icon and store assets.
- Chore, goal, and reward emoji chosen by families. The confetti.

## Tokens

Match restraint across platforms, not raw metrics. Native norms win on sizing.

| Role | Web | iOS |
|------|-----|-----|
| Accent fill (buttons, pills) | `--primary-fill` `#5e61e5` | `choreStarFill` `#5e61e5` |
| Accent fill pressed/hover | `--primary-fill-hover` `#565ad2` | `#565ad2` |
| Accent text/border | `--primary` `#595cd9` | `choreStarLink` (dark-mode aware) |
| Ink | `--text-primary` `#0f172a` | `UIColor.label` |
| Secondary text | `--text-secondary` `#64748b` | `UIColor.secondaryLabel` |
| Ground | `--bg-secondary` `#f8fafc` | `systemGroupedBackground` |
| Card | `--card-bg` white | `secondarySystemGroupedBackground` |
| Radius: cards | 12px | 16pt (platform norm) |
| Radius: controls | 10px | 12pt (platform norm) |
| Shadows | hairline (`--shadow-sm`) | radius ≤ 6, y ≤ 2, opacity ≤ 0.08 |
| Gradient (FX only) | `#6366f1 → #8b5cf6` | `choreStarGradient` |

`#5e61e5` is not arbitrary: it is the darkest-adjacent indigo that clears WCAG
AA (4.5:1) with white text. The old `#6366f1` fill does not (about 4.1:1), so
never fill a white-text control with it.

## Typography

- **Display face (headings, big numbers):** Bricolage Grotesque, weights
  600 to 800. Web: `--font-display` in `globals.css`, applied to h1 to h3 and
  the `.font-display` utility, kid mode excluded via `.kid-mode-bg` scoping.
  iOS: bundled OFL font, applied through a shared heading style.
- **Body, labels, buttons:** the platform's reading face. Web: Nunito.
  iOS: SF Pro (`.rounded` where it already is).
- Bricolage has no 900 weight; `font-black`/`.black` resolves to 800 by
  closest-match. That is expected, not a bug.
- Swapping the display face is one change: the `--font-display` variable on
  web, the heading style on iOS.

## Voice

- Parent copy states facts in active voice, sentence case. A CTA says exactly
  what happens: "Save changes", not "Submit". An action keeps its name through
  the whole flow.
- Errors say what went wrong and how to fix it. They do not apologize and are
  never vague. An empty screen says what to do, not how to feel.
- Kid copy celebrates. That is its job.
- No em dashes anywhere in user-facing copy. No "not just X, it's Y"
  constructions. No "Yes!" openers.

## Working on the UI

- The `frontend-design` skill (user-level, `~/.claude/skills/frontend-design`)
  is the general calibration for avoiding template defaults. This document is
  the project-specific brief; where they disagree, this document wins.
- The visual reference for the restraint pass is the design canvas
  (Claude artifact "ChoreStar Restraint Pass"): five moves, before/after phone
  mockups, and the type ramp.
- Web guard tests parse `globals.css` (accent pair contrast, retired vars).
  Run `npm run test:unit` after any token change.
