# Quick Start Guide

## 🚀 Start Development Server (3 Options)

### Option 1: Vercel Dev (Best for Full Testing)
```bash
npm run dev
```
- Runs on `http://localhost:3000`
- Fully simulates Vercel production environment
- Handles all API routes correctly
- Hot reloading enabled

### Option 2: Custom Node Server
```bash
node dev-server.js
```
- Runs on `http://localhost:3000`
- Handles static files + API routes
- Good for quick testing

### Option 3: Simple Static Server
```bash
npm run serve
```
- Runs on `http://localhost:3000`
- Static files only (API routes won't work)
- Fastest for frontend-only testing

## ⚙️ Setup Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Supabase:**
   - Edit `frontend/supabase-config.js`
   - Add your `SUPABASE_URL` and `SUPABASE_ANON_KEY`
   - Or create a `.env` file with:
     ```env
     SUPABASE_URL=https://your-project.supabase.co
     SUPABASE_ANON_KEY=your-anon-key
     ```

3. **Start the server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   - Go to `http://localhost:3000`
   - Start testing!

## 🧪 Testing Your Fixes

All the bugs we fixed are ready to test:
- ✅ Avatar selection (modal stays open)
- ✅ Chore icons (sized correctly in settings)
- ✅ Refresh button (reloads data)
- ✅ Delete chore (works in settings)
- ✅ Settings tabs (text stays visible)
- ✅ Color picker (more visible)
- ✅ Bulk activities (can add multiple)
- ✅ And more!

## 📝 Notes

- Make sure your Supabase project is set up and running
- The dev server automatically reloads API files on changes
- Frontend changes require a browser refresh (or use browser dev tools auto-refresh)
- Check the console for any errors

Happy testing! 🎉

