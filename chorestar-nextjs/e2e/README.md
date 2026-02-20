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
# Parent login (for create-routine)
export TEST_USER_EMAIL="your@email.com"
export TEST_USER_PASSWORD="yourpassword"

# Kid login (for kid-login, run-routine)
export TEST_FAMILY_CODE="abc12345"   # From Settings → Family
export TEST_CHILD_PIN="1234"         # 4-6 digits

# Optional
export PLAYWRIGHT_BASE_URL="http://localhost:3000"
```

## Run

1. **Start the app:** `npm run dev`
2. **Run a single flow:**
   - `npm run test:e2e:create-routine` – create routine (uses parent auth)
   - `npm run test:e2e:kid-login` – kid login flow
   - `npm run test:e2e:run-routine` – kid login + run routine to completion
3. **Run all:** `npm run test:e2e`

## Video → GIF

Videos are in `chorestar-nextjs/test-results/`. Convert with:

```bash
# Using ffmpeg
ffmpeg -i test-results/…/video.webm -vf "fps=10,scale=640:-1:flags=lanczos" -c:v gif output.gif

# Or use Kap: import the .webm, export as GIF
```

Then move to `docs/assets/recordings/`.
