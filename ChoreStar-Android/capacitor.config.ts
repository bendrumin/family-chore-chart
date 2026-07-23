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
    url: 'https://chorestar.app',
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#6366f1',
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
