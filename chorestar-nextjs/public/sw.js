/*
 * Tombstone service worker.
 *
 * The old vanilla-JS ChoreStar app registered a root-scoped service worker at
 * /sw.js (frontend/script.js) that cached the legacy app shell. When the site
 * moved to Next.js the SW file was deleted — but deleting it does NOT unregister
 * the worker on devices that already installed it. Those devices keep serving the
 * stale legacy shell (e.g. the "Getting everything ready for your family…" screen
 * that never resolves), especially on iPad/home-screen installs.
 *
 * This replacement takes over on the next update check, purges every cache, and
 * unregisters itself so the device falls back to the live Next.js site. It is a
 * one-shot self-destruct — the current app ships no service worker of its own.
 */
self.addEventListener('install', () => {
  // Activate immediately instead of waiting for existing clients to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Delete all Cache Storage entries left by the legacy worker.
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch (err) {
        // Best-effort — continue to unregister even if cache cleanup fails.
      }

      // Remove this worker entirely.
      await self.registration.unregister();

      // Reload any open tabs/PWA windows so they load fresh from the network.
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.navigate(client.url);
      }
    })()
  );
});

// Safety net: never serve from cache. If the worker is briefly active before it
// unregisters, pass every request straight to the network.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
