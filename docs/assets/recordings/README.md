# ChoreStar Recording Guide

Place screen recordings (GIFs or short videos) in this folder.

**Automated:** Playwright scripts in `chorestar-nextjs/e2e/` generate videos to `test-results/`. See [`chorestar-nextjs/e2e/README.md`](../../../chorestar-nextjs/e2e/README.md) for setup and env vars.

**Manual:** Use Kap, Cmd+Shift+5, or Loom.

---

## Recording Flows

### 1. Add & Edit a Child

**Script:** `npm run test:e2e:add-edit-child`
**Path:** Dashboard → Add Child → Edit Child
**Steps:**
1. Log in as parent
2. Click **Add Child**
3. Enter name, pick avatar color/style
4. Save the child
5. Edit the child's name or avatar

**Filename:** `add-edit-child.gif`

---

### 2. Add & Edit a Chore

**Script:** `npm run test:e2e:add-edit-chore`
**Path:** Dashboard → (child selected) → Add Chore → Edit Chore
**Steps:**
1. Log in as parent, select a child
2. Click **Add Chore**
3. Enter chore name, pick icon, set reward
4. Save the chore
5. Edit the chore details

**Filename:** `add-edit-chore.gif`

---

### 3. Create a Routine

**Script:** `npm run test:e2e:create-routine`
**Path:** Dashboard → (child selected) → Add Routine
**Steps:**
1. Log in as parent, select a child
2. Click **Add Routine** (or switch to Routines tab)
3. Enter routine name (e.g., "Morning Routine")
4. Choose type (Morning / Bedtime / Afterschool / Custom)
5. Add steps (title, optional description, icon)
6. Set reward amount
7. Save the routine

**Filename:** `create-routine.gif`

---

### 4. Family Settings & Sharing

**Script:** `npm run test:e2e:family-settings`
**Path:** Dashboard → Settings → Family tab
**Steps:**
1. Log in as parent
2. Open Settings → Family tab
3. View/copy the family share link
4. Set a child's login PIN
5. (Optional) Send an invite to a co-parent

**Filename:** `family-settings.gif`

---

### 5. Kid Login

**Script:** `npm run test:e2e:kid-login`
**Path:** `/kid-login/[familyCode]`
**Steps:**
1. Start on the kid login page (family share link from Settings → Family)
2. Show the numeric keypad
3. Enter the child's 4–6 digit PIN
4. Land on the kid dashboard (child's name, routines)

**Filename:** `kid-login.gif`

---

### 6. Kid Dashboard

**Script:** `npm run test:e2e:kid-dashboard`
**Path:** Kid login → Browse dashboard
**Steps:**
1. Log in as kid with PIN
2. Browse the kid dashboard (chores, routines list)
3. Show the large kid-friendly UI

**Filename:** `kid-dashboard.gif`

---

### 7. Run a Routine

**Script:** `npm run test:e2e:run-routine`
**Path:** Kid dashboard → Select routine → Complete steps
**Steps:**
1. Log in as kid with PIN
2. Tap a routine to open it
3. Step through each checkbox (tap to complete)
4. Show the completion / celebration screen with confetti

**Filename:** `run-routine.gif`

---

## Run All Recordings

```bash
cd chorestar-nextjs
npm run test:e2e          # All 7 flows
npm run test:e2e:record   # Full Chromium recording pass
```

Videos land in `chorestar-nextjs/test-results/`.

## Video → GIF

```bash
# Using ffmpeg
ffmpeg -i test-results/…/video.webm -vf "fps=10,scale=640:-1:flags=lanczos" -c:v gif output.gif

# Or use Kap: import the .webm, export as GIF
```

Then move the GIFs here (`docs/assets/recordings/`).

## Usage in Docs or Marketing

```markdown
![Add a child](./docs/assets/recordings/add-edit-child.gif)
![Add a chore](./docs/assets/recordings/add-edit-chore.gif)
![Create a routine](./docs/assets/recordings/create-routine.gif)
![Family settings](./docs/assets/recordings/family-settings.gif)
![Kid login](./docs/assets/recordings/kid-login.gif)
![Kid dashboard](./docs/assets/recordings/kid-dashboard.gif)
![Run a routine](./docs/assets/recordings/run-routine.gif)
```
