# Deployment Workflow Guide

## ✅ Correct Workflow: Commit from ROOT

Since Vercel deploys from the **root** of your repository, you should **always commit from the root**.

## Git Workflow

### ✅ DO THIS (Correct)

```bash
# Always work from repository root
cd /Users/bensiegel/family-chore-chart

# Check status
git status

# Add all changes (from root)
git add .

# Or add specific files
git add vercel.json
git add chorestar-nextjs/
git add frontend/

# Commit from root
git commit -m "Add new features to both apps"

# Push to trigger Vercel deployment
git push
```

### ❌ DON'T DO THIS (Wrong)

```bash
# Don't commit from frontend folder
cd frontend/
git add .  # ❌ Wrong location
git commit -m "..."  # ❌ Wrong location
```

## Why Root?

1. **Vercel reads `vercel.json` from root**
2. **Both apps are in the same repo**
3. **Single deployment handles both apps**
4. **Easier to manage changes across both apps**

## Typical Workflow

### Making Changes

```bash
# 1. Start from root
cd /Users/bensiegel/family-chore-chart

# 2. Make changes to either app
# - Edit files in frontend/
# - Edit files in chorestar-nextjs/

# 3. Check what changed
git status

# 4. Add changes
git add .

# 5. Commit
git commit -m "Description of changes"

# 6. Push (triggers Vercel deployment)
git push
```

### Example: Adding a Feature to Next.js

```bash
cd /Users/bensiegel/family-chore-chart

# Make changes to Next.js app
# Edit: chorestar-nextjs/components/something.tsx

# Commit from root
git add chorestar-nextjs/components/something.tsx
git commit -m "Add new feature to Next.js app"
git push
```

### Example: Fixing Vanilla JS

```bash
cd /Users/bensiegel/family-chore-chart

# Make changes to vanilla JS
# Edit: frontend/script.js

# Commit from root
git add frontend/script.js
git commit -m "Fix bug in vanilla JS"
git push
```

### Example: Updating Both Apps

```bash
cd /Users/bensiegel/family-chore-chart

# Make changes to both
# Edit: frontend/index.html
# Edit: chorestar-nextjs/app/layout.tsx

# Commit from root
git add .
git commit -m "Update both apps with new feature"
git push
```

## What Happens After Push

```
git push
  ↓
Vercel detects change
  ↓
Reads vercel.json from ROOT
  ↓
Builds Next.js (chorestar-nextjs/)
  ↓
Builds API functions (frontend/api/)
  ↓
Serves static files (frontend/)
  ↓
Deploys both apps
  ↓
✅ Live at chorestar.app
```

## Repository Structure Reminder

```
family-chore-chart/  ← YOU COMMIT FROM HERE
├── .git/           ← Git repo root
├── vercel.json     ← Vercel config (read from root)
├── frontend/       ← Vanilla JS app
│   ├── index.html
│   └── script.js
└── chorestar-nextjs/  ← Next.js app
    ├── package.json
    └── app/
```

## Quick Reference

| Action | Location | Command |
|--------|----------|---------|
| Check status | Root | `git status` |
| Add changes | Root | `git add .` |
| Commit | Root | `git commit -m "msg"` |
| Push | Root | `git push` |
| Deploy | Automatic | (happens on push) |

## Pro Tips

1. **Always start from root**: `cd /Users/bensiegel/family-chore-chart`
2. **Use relative paths**: `git add frontend/script.js` (from root)
3. **Commit both apps together**: Easier to keep them in sync
4. **One push = one deployment**: Both apps deploy together

## Summary

✅ **Commit from ROOT** (`/Users/bensiegel/family-chore-chart`)  
✅ **Vercel deploys from ROOT**  
✅ **Both apps deploy together**  
✅ **One git workflow for everything**

No need to commit from `frontend/` or `chorestar-nextjs/` separately - everything happens from the root! 🚀

