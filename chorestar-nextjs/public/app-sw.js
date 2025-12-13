// Service Worker for ChoreStar Next.js App (only for /app paths)
const CACHE_NAME = 'chorestar-nextjs-v1'
const urlsToCache = [
  '/app/',
  '/app/dashboard',
  '/app/login',
  '/app/manifest.json',
]

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files')
        return cache.addAll(urlsToCache)
      })
      .catch((error) => {
        console.error('Service Worker: Cache failed', error)
      })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  return self.clients.claim()
})

// Fetch event - serve from cache, fallback to network
// IMPORTANT: Only intercept requests for /app paths, allow external resources through
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  // Only intercept requests for our app paths
  // Allow ALL external resources (CDNs, fonts, APIs) to pass through without interception
  if (url.pathname.startsWith('/app/') || url.pathname === '/app') {
    // Only intercept same-origin requests for /app paths
    if (url.origin === self.location.origin) {
      event.respondWith(
        caches.match(event.request)
          .then((response) => {
            // Return cached version or fetch from network
            return response || fetch(event.request)
          })
          .catch(() => {
            // If both fail, try to fetch normally
            return fetch(event.request)
          })
      )
    } else {
      // External resource for /app - let it through
      return
    }
  } else {
    // Not an /app path - don't intercept at all
    return
  }
})

// Push notification event
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'ChoreStar'
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/app/dashboard',
      ...data
    },
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-192x192.png'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/app/dashboard')
    )
  }
})
