# Vercel Deployment Notes

## Monorepo Configuration

This project uses a monorepo structure with:
- **Vanilla JS version**: `frontend/` directory
- **Next.js version**: `chorestar-nextjs/` directory

## Important: basePath Configuration

**DO NOT** use `basePath` in `next.config.ts` when using `builds` in `vercel.json`. Vercel handles routing through the `rewrites` configuration instead.

## Routing Setup

The `vercel.json` file handles routing:

1. **Next.js App** (`/app/*`):
   - Routes `/app/*` to `/chorestar-nextjs/*`
   - Handles Next.js static assets via `/app/_next/*`

2. **Vanilla JS App** (`/*`):
   - Routes everything else to `/frontend/*`
   - This is the default/fallback route

3. **API Routes** (`/api/*`):
   - Routes to `/frontend/api/*.js`

## Deployment Steps

1. **Vercel Project Settings**:
   - Root Directory: Leave empty (root of repo)
   - Framework Preset: Other (we're using custom builds)

2. **Build Configuration**:
   - The `vercel.json` file defines all builds
   - Next.js build happens automatically
   - Static files are served from `frontend/`

3. **Environment Variables**:
   - Set in Vercel Project Settings
   - Both versions use the same Supabase credentials

## Troubleshooting

### If Next.js assets don't load:
- Check that `/app/_next/*` rewrite is working
- Verify Next.js build output is in `chorestar-nextjs/.next`

### If routing doesn't work:
- Ensure `vercel.json` rewrites are in correct order (most specific first)
- Check that `/app/*` rewrite comes before `/*` catch-all

### If build fails:
- Make sure `chorestar-nextjs/package.json` exists
- Verify all dependencies are installed
- Check build logs in Vercel dashboard

## Alternative: Project Settings Approach

If you prefer to use Vercel's Project Settings instead of `builds`:

1. Remove `builds` from `vercel.json`
2. In Vercel Dashboard → Project Settings:
   - Set Root Directory to `chorestar-nextjs` for Next.js app
   - Create separate projects for each version
   - Use path prefixes in domain settings

However, the current `builds` approach is simpler for a single deployment.

