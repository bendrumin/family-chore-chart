import type { CapacitorConfig } from '@capacitor/cli';

/**
 * ChoreStar Android — Capacitor config.
 *
 * The app is a native shell that loads the live Next.js web app
 * (chorestar.app) in a WebView. This reuses 100% of the web UI, API
 * routes, auth middleware, and kid-mode flows — no static export needed.
 *
 * The `www/` folder is a branded loading screen shown only briefly while
 * the remote URL connects (and as an offline fallback). All real content
 * comes from `server.url`.
 *
 * For local development against `npm run dev`, temporarily point
 * `server.url` at your machine's LAN IP (e.g. http://192.168.1.x:3000)
 * and set `server.cleartext = true`.
 */
const config: CapacitorConfig = {
  appId: 'com.chorestar.app',
  appName: 'ChoreStar',
  webDir: 'www',
  server: {
    // /login, not the marketing homepage: the landing pages carry pricing
    // copy that Play's consumption-only policy must never show in-app.
    // Logged-in users are redirected straight to the dashboard by the
    // middleware, so returning users never see the login form either.
    url: 'https://chorestar.app/login',
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#6366f1',
    // The web app detects this marker (lib/utils/platform.ts) and hides
    // every purchase surface: Play policy forbids non-Play purchase CTAs.
    appendUserAgent: 'ChoreStarAndroid',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#6366f1',
      showSpinner: false,
      androidSplashResourceName: 'splash',
    },
  },
};

export default config;
