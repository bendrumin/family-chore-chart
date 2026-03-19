// Service Worker for ChoreStar PWA
const CACHE_NAME = 'chorestar-v1'
const urlsToCache = [
  '/',
  '/login',
  '/dashboard',
  '/manifest.json',
]

// Install event - cache resources
self.addEventListener('install', (event: any) => {
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
self.addEventListener('activate', (event: any) => {
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
self.addEventListener('fetch', (event: any) => {
  const url = new URL(event.request.url)
  
  // Only intercept requests for our app, not external resources
  // Allow external CDNs, fonts, and APIs to pass through
  if (url.origin !== self.location.origin) {
    return
  }

  // Skip API routes — always fetch fresh
  if (url.pathname.startsWith('/api')) {
    return
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request)
      })
      .catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('/dashboard').catch(() => fetch(event.request))
        }
        return fetch(event.request)
      })
  )
})

// Push notification event
self.addEventListener('push', (event: any) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'ChoreStar'
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
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
self.addEventListener('notificationclick', (event: any) => {
  event.notification.close()

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    )
  }
})

