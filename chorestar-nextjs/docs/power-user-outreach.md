# Power User Outreach Playbook

Generated from `node scripts/analyze-power-users.mjs` (re-run anytime for fresh data).

**Full report with emails:** `scripts/output/power-users-report.json` (gitignored — do not commit)

---

## How activity is scored

| Signal | Weight |
|--------|--------|
| Chore completion | 1 pt each |
| Routine completion | 3 pts each |
| Badge earned | 5 pts each |
| Kid PIN set up | 15 pts per child |
| Active routine configured | 10 pts each |
| Child added | 5 pts each |
| Kid login session | 0.5 pts each |

**Tiers:** power (100+), active (30–99), light (5–29), dormant (&lt;5)

---

## Segments & what to do

### 1. Champions — ask for testimonials & referrals

**Who:** 30+ days signed up, score 30+, still logging chore completions.

**Goal:** Real quote for homepage, optional referral to one mom friend.

**Template:**

> Subject: You're one of our most active ChoreStar families 🙌
>
> Hi [Name],
>
> I'm Ben, the parent who built ChoreStar. I was looking at usage stats and noticed [Family Name] has been one of our most active families — [X] chore check-offs and counting. That honestly makes my week.
>
> I'm trying to help more parents discover ChoreStar without paid ads. Would you be open to either:
> - A short testimonial (1–2 sentences) I could feature on our site, or
> - Sharing ChoreStar with one family you think would benefit?
>
> No pressure at all — just reaching out to the families who actually use it. If you have feedback or feature ideas, I'd love to hear those too.
>
> Thanks for being part of this,
> Ben

**Priority champions (from latest run):** Oslin, McKinney, McKenzie, GOATS (if they return), Wright.

---

### 2. Routine adopters — feature feedback

**Who:** Families using routine completions (very few today — high-value interview).

**Goal:** Learn what worked, improve onboarding, get a routines-specific quote.

**Template:**

> Subject: Quick question about your morning/bedtime routine
>
> Hi [Name],
>
> I noticed your family has been using ChoreStar routines — that's still a newer feature and not many families have tried it yet. I'd love 5 minutes of your honest take:
> - What made you set up a routine?
> - Did your kids use it on their own (PIN login)?
> - What would make it better?
>
> Happy to hop on email or a quick call. As a thank-you I can [offer 1 month premium / lifetime if they're especially helpful — your call].
>
> Ben

**Priority:** Wootten (4 routine completions + kid login in first week — ideal case study).

---

### 3. Win-back — used to be active, gone quiet

**Who:** 100+ chore completions but no activity in 30+ days.

**Goal:** Understand why they stopped, fix friction, re-activate.

**Template:**

> Subject: Everything OK with ChoreStar?
>
> Hi [Name],
>
> I'm Ben from ChoreStar. Your family logged [X] chores with us — thank you for giving it a real try. I noticed it's been a little while since anyone's checked in, and I wanted to reach out personally.
>
> Did something stop working? Paper chart creep back? Kids lost interest? I'd genuinely love to know — even if the answer is "life got busy."
>
> If you want to give it another shot, we added summer chore suggestions and a sunny seasonal theme this month. Happy to help you reset your chore list in 2 minutes.
>
> Ben

**Priority:** Chaos Clan (200 completions, ~4 months quiet), THE GOATS (200 completions, ~6 weeks quiet), Kids Chores, Barajas.

---

### 4. Long-tenured never activated — onboarding failure

**Who:** Signed up 300+ days ago, little or no chore activity.

**Goal:** Either re-onboard or learn what blocked them at signup.

**Template:**

> Subject: Did ChoreStar not click for your family?
>
> Hi [Name],
>
> You signed up for ChoreStar almost a year ago — I'm cleaning up old accounts and wanted to check in. A lot of families sign up, get busy, and never add their first child.
>
> If you still want to try it: add one child, assign 3 chores, and give kid login a shot (family code + PIN — no email for the kid). Takes about 2 minutes.
>
> If it's not for you, no worries — just reply "unsubscribe" and I won't bug you again.
>
> Ben

**Priority:** Murphy's, Dasari, Fuentes, Nick family (all ~320 days, zero real usage).

---

### 5. Signed up, never added children (26 families)

**Who:** Account exists, `childCount: 0`.

**Goal:** Fix onboarding drop-off — possibly automated email at signup+3 days.

**Short nudge:**

> Subject: Stuck on the first step?
>
> Hi — you created a ChoreStar account but haven't added a child yet. Common! Here's the 2-minute path: Dashboard → Add Child → pick an avatar → assign 3 chores → done.
>
> Need help? Just reply to this email.
>
> Ben

---

## Who NOT to email for outreach

- **Your own account** (Siegel Family) — exclude from campaigns
- **Users who never confirmed email** — check auth status first
- **Anyone who contacted support with a complaint** — handle separately

---

## Suggested outreach order (one email per week, personal tone)

| Week | Segment | Target count |
|------|---------|--------------|
| 1 | Champions — testimonial ask | 3 (Oslin, McKinney, McKenzie) |
| 2 | Routine adopter — Wootten | 1 |
| 3 | Win-back | 2 (GOATS, Chaos Clan) |
| 4 | Summer blog share to recently active | 5–8 |

---

## Re-run analysis

```bash
cd chorestar-nextjs && node scripts/analyze-power-users.mjs
```

Opens `scripts/output/power-users-report.json` with full emails and all segments.

---

## Automated sending (Resend script)

Personal 1:1 founder emails via your existing `RESEND_API_KEY`.

```bash
cd chorestar-nextjs

# See campaigns
node scripts/send-outreach.mjs --list

# Preview without sending (default)
node scripts/send-outreach.mjs --campaign win-back
node scripts/send-outreach.mjs --campaign routine-case-study

# Send for real
node scripts/send-outreach.mjs --campaign routine-case-study --send
node scripts/send-outreach.mjs --campaign win-back --email yeliufiorella@gmail.com --send

# Log emails you sent manually (avoids duplicates)
node scripts/send-outreach.mjs --campaign champion --email someone@gmail.com --mark-sent

# View history
node scripts/send-outreach.mjs --sent
```

**Campaigns:** `champion`, `routine-case-study`, `win-back`, `summer-blog`

**Presets (multi-step sequences):**

```bash
# Week 2: Wootten (routines) + GOATS + Chaos Clan (win-back)
node scripts/send-outreach.mjs --preset week2          # preview
node scripts/send-outreach.mjs --preset week2 --send   # deliver

# Week 3: summer blog to recently active families
node scripts/send-outreach.mjs --preset week3 --send

# Log week 1 champion emails you sent manually
node scripts/send-outreach.mjs --mark-week1
```

**Safety defaults:**
- Dry-run unless you pass `--send`
- Skips emails already in `scripts/output/outreach-sent-log.json`
- Uses plain text from Ben (not bulk newsletter headers)
- Excludes founder test accounts

**Workflow:** Run `analyze-power-users.mjs` first to refresh the report, then dry-run, then `--send`.
