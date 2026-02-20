# ChoreStar E2E Recording Scripts

Playwright tests that double as recording flows for demos/GIFs. Videos are saved to `test-results/`.

## Setup

```bash
cd chorestar-nextjs
npm install
npx playwright install chromium
```

## Env vars

Create `.env.test` or export before running:

```bash
# Parent login (for add-edit-child, add-edit-chore, create-routine)
export TEST_USER_EMAIL="your@email.com"
export TEST_USER_PASSWORD="yourpassword"

# Kid login (for kid-login, kid-dashboard, run-routine)
export TEST_FAMILY_CODE="abc12345"   # From Settings → Family
export TEST_CHILD_PIN="1234"         # 4-6 digits

# Optional
export PLAYWRIGHT_BASE_URL="https://chorestar.app"  # defaults to http://localhost:3000
```

## Available recordings

| Script | What it records | Auth needed |
|--------|----------------|-------------|
| `test:e2e:kid-login` | Kid PIN login → lands on dashboard | Kid (family code + PIN) |
| `test:e2e:kid-dashboard` | Kid login → browses routines dashboard | Kid (family code + PIN) |
| `test:e2e:run-routine` | Kid login → starts routine → completes all steps → celebration | Kid (family code + PIN) |
| `test:e2e:create-routine` | Parent → creates Morning Routine from template | Parent (email + password) |
| `test:e2e:add-edit-child` | Parent → adds a child → edits them | Parent (email + password) |
| `test:e2e:add-edit-chore` | Parent → adds a chore → edits it | Parent (email + password) |

## Run a single flow

```bash
# Kid flows (no parent login needed)
PLAYWRIGHT_BASE_URL=https://chorestar.app TEST_FAMILY_CODE=abc12345 TEST_CHILD_PIN=1234 \
  npm run test:e2e:kid-login

PLAYWRIGHT_BASE_URL=https://chorestar.app TEST_FAMILY_CODE=abc12345 TEST_CHILD_PIN=1234 \
  npm run test:e2e:kid-dashboard

PLAYWRIGHT_BASE_URL=https://chorestar.app TEST_FAMILY_CODE=abc12345 TEST_CHILD_PIN=1234 \
  npm run test:e2e:run-routine

# Parent flows (requires TEST_USER_EMAIL + TEST_USER_PASSWORD for auth)
PLAYWRIGHT_BASE_URL=https://chorestar.app npm run test:e2e:create-routine
PLAYWRIGHT_BASE_URL=https://chorestar.app npm run test:e2e:add-edit-child
PLAYWRIGHT_BASE_URL=https://chorestar.app npm run test:e2e:add-edit-chore

# Run everything
npm run test:e2e
```

## Video → GIF

Videos land in `chorestar-nextjs/test-results/`. Convert with:

```bash
# Using ffmpeg
ffmpeg -i test-results/…/video.webm -vf "fps=10,scale=640:-1:flags=lanczos" -c:v gif output.gif

# Or use Kap: import the .webm, export as GIF
```

Then move to `docs/assets/recordings/`.
