# Version Switching Guide

## Overview

ChoreStar now has **two versions** running simultaneously:

1. **Original Version** (Vanilla JS) - `/` - Stable, production-ready
2. **New Version** (React/Next.js) - `/app` - Beta with all features + improvements

Both versions share the **same Supabase database**, so your data is automatically synced between versions!

---

## 🚀 How to Test the New Version

### Option 1: Direct URL Access
Simply navigate to:
```
https://chorestar.app/app/dashboard
```

### Option 2: Version Switcher
- **In New Version**: Click the "Switch Version" button (bottom-right) or banner at top
- **In Original Version**: Look for the "Try New Version" prompt (bottom-right)

### Option 3: Manual Path
Replace any path with `/app` prefix:
- Original: `https://chorestar.app/dashboard` 
- New: `https://chorestar.app/app/dashboard`

---

## 🔄 Switching Between Versions

### From New Version → Original
1. Click "Switch Version" button (bottom-right)
2. Click "Switch to Original" in the modal
3. Or manually remove `/app` from the URL

### From Original → New Version
1. Click "Try New Version" prompt (bottom-right)
2. Or manually add `/app` to the URL path

---

## ✅ Data Compatibility

**Both versions use the same database**, so:

- ✅ All your children, chores, and completions are synced
- ✅ Settings are shared (currency, theme, etc.)
- ✅ You can switch versions anytime without losing data
- ✅ Changes in one version appear in the other immediately

---

## 🎯 Testing Checklist

When testing the new version, verify:

### Core Features
- [ ] Login/Signup works
- [ ] Password reset flow works
- [ ] Dashboard loads correctly
- [ ] All children display
- [ ] All chores display
- [ ] Chore completion works
- [ ] Rewards calculate correctly
- [ ] Analytics/metrics display

### New Features (Only in New Version)
- [ ] Sound effects work (Settings > Family Tab)
- [ ] PDF export works (Settings > Downloads Tab)
- [ ] CSV export works (Settings > Downloads Tab)
- [ ] Push notifications can be enabled (Settings > Appearance Tab)
- [ ] Service worker registers (check browser DevTools > Application > Service Workers)

### Data Integrity
- [ ] Create a child in new version → appears in original
- [ ] Create a chore in new version → appears in original
- [ ] Complete a chore in new version → appears in original
- [ ] Edit settings in new version → appears in original

---

## 🛠️ Deployment Configuration

### Vercel Configuration

The `vercel.json` file routes:
- `/app/*` → Next.js app (new version)
- `/*` → Vanilla JS app (original version)
- `/api/*` → API endpoints (shared)

### Next.js Configuration

The `chorestar-nextjs/next.config.ts` sets:
- `basePath: '/app'` in production
- Ensures all assets load correctly

---

## 📊 Feature Comparison

| Feature | Original | New Version |
|---------|----------|-------------|
| All core features | ✅ | ✅ |
| Password reset | ✅ | ✅ |
| Sound effects | ✅ | ✅ |
| Export (PDF/CSV) | ✅ | ✅ |
| PWA support | ✅ | ✅ |
| Push notifications | ✅ | ✅ |
| Performance | Good | Better |
| TypeScript | ❌ | ✅ |
| Modern React | ❌ | ✅ |
| Better error handling | ❌ | ✅ |

---

## 🐛 Reporting Issues

If you find issues in the new version:

1. **Check if it works in original version**
   - If yes → New version bug
   - If no → Database/backend issue

2. **Report with:**
   - Which version you're using (`/app` or `/`)
   - Steps to reproduce
   - Browser/device info
   - Screenshots if possible

3. **Common issues:**
   - **Assets not loading**: Clear browser cache
   - **Routes not working**: Check URL has `/app` prefix
   - **Data not syncing**: Check Supabase connection

---

## 🔐 Authentication

Both versions use the same Supabase authentication:

- ✅ Login works in both versions
- ✅ Session is shared (login in one, logged in in both)
- ✅ Logout works in both versions
- ✅ Password reset works in both versions

---

## 🎨 UI Differences

The new version has:
- Improved dark mode
- Better responsive design
- Smoother animations
- Better accessibility
- More consistent styling

But functionality is **100% the same**!

---

## 📝 Migration Path

### Phase 1: Beta Testing (Current)
- Both versions available
- Users can opt-in to new version
- Data synced automatically

### Phase 2: Gradual Migration
- Default new users to new version
- Allow existing users to switch
- Monitor for issues

### Phase 3: Full Migration
- Make new version default
- Keep original as fallback
- Eventually deprecate original

---

## 🚨 Important Notes

1. **Don't delete the original version yet!**
   - Keep it as fallback
   - Some users may prefer it
   - Good for A/B testing

2. **Test thoroughly before making new version default**
   - All routes work
   - All data syncs
   - All features work

3. **Monitor user feedback**
   - Which version do users prefer?
   - Any missing features?
   - Performance differences?

---

## 🔧 Development

### Running Locally

**Original Version:**
```bash
cd frontend
python3 -m http.server 8000
# Visit http://localhost:8000
```

**New Version:**
```bash
cd chorestar-nextjs
npm run dev
# Visit http://localhost:3000/app
```

### Testing Both Locally

1. Start original version on port 8000
2. Start new version on port 3000
3. Use different browsers/incognito to test both
4. Verify data syncs between them

---

## ✅ Success Criteria

The new version is ready to become default when:

- [ ] All core features work
- [ ] All data syncs correctly
- [ ] No critical bugs
- [ ] Performance is equal or better
- [ ] User feedback is positive
- [ ] All routes work correctly
- [ ] Mobile experience is good

---

## 📞 Support

If you have questions or issues:

1. Check this guide first
2. Test in both versions
3. Check browser console for errors
4. Verify Supabase connection
5. Report with details

---

**Last Updated**: December 2025  
**Status**: Beta Testing Phase

