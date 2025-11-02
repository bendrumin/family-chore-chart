# Local Development Setup

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env` (or set environment variables)
   - Add your Supabase credentials
   - Optional: Add PayPal and email configs for testing payments

3. **Configure Supabase:**
   - Update `frontend/supabase-config.js` with your Supabase URL and anon key
   - Or set `window.SUPABASE_URL` and `window.SUPABASE_ANON_KEY` in your HTML

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   
   Or use the custom server:
   ```bash
   node dev-server.js
   ```

5. **Open your browser:**
   - Navigate to `http://localhost:3000`
   - Start testing!

## Development Options

### Option 1: Vercel Dev (Recommended - Full Vercel Simulation)
```bash
npm run dev
# or
vercel dev
```
- ✅ Handles API routes exactly like production
- ✅ Hot reloading
- ✅ Environment variables from `.env`
- ✅ Full Vercel feature simulation

### Option 2: Custom Node Server
```bash
node dev-server.js
```
- ✅ Simple static file serving
- ✅ API route handling
- ✅ Basic hot reloading for API files
- ✅ Runs on port 3000

### Option 3: Static Server Only
```bash
npm run serve
```
- ✅ Simple static file serving
- ❌ API routes won't work (use for frontend-only testing)
- ✅ Fast and lightweight

## Environment Variables

Create a `.env` file in the root directory:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Optional - for testing payments
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
PAYPAL_ENVIRONMENT=sandbox

# Optional - for testing email
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
ADMIN_EMAIL=admin@example.com
```

## Supabase Configuration

You need to set up Supabase credentials in one of two ways:

### Method 1: Environment Variables (Recommended)
Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in your `.env` file, then update `frontend/supabase-config.js` to read them:

```javascript
const SUPABASE_URL = process.env.SUPABASE_URL || window.SUPABASE_URL || 'your_url';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || 'your_key';
```

### Method 2: Direct in Config
Edit `frontend/supabase-config.js` directly with your credentials.

## Testing API Routes

The development server handles API routes at `/api/*`. You can test them:

- Health check: `http://localhost:3000/api/health`
- Contact form: `POST http://localhost:3000/api/send-contact-email`
- PayPal checkout: `POST http://localhost:3000/api/create-paypal-checkout`

## Troubleshooting

### Port already in use?
Change the port:
```bash
PORT=8080 node dev-server.js
```

### API routes not working?
- Make sure you're using `npm run dev` (Vercel dev) or `node dev-server.js`
- Check that your API files are in `frontend/api/`
- Verify the API file exports a handler function

### Supabase connection issues?
- Verify your Supabase URL and anon key are correct
- Check browser console for errors
- Ensure Supabase client library is loaded in `index.html`

### CORS errors?
The custom dev server includes CORS headers. If using Vercel dev, it handles CORS automatically.

## Hot Reloading

- **Frontend files**: Browser refresh required (or use browser dev tools auto-refresh)
- **API files**: Automatically reloaded on each request in `dev-server.js`
- **Vercel dev**: Full hot reloading for both frontend and API

## Production Build

For production deployment:
```bash
vercel deploy
```

Or build and test locally:
```bash
vercel build
```

