const CACHE_NAME = 'chorestar-v1';
const urlsToCache = [
  '/',
  '/style.css',
  '/script.js',
  '/api-client.js',
  '/supabase-config.js',
  '/payment.js',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
// IMPORTANT: Only intercept same-origin requests, allow external resources through
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  
  // Only intercept same-origin requests (our app files)
  // Allow ALL external resources (CDNs, fonts, APIs) to pass through
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Return cached version or fetch from network
          return response || fetch(event.request);
        })
        .catch(() => {
          // If cache fails, just fetch normally
          return fetch(event.request);
        })
    );
  } else {
    // External resource - don't intercept, let it fetch normally
    return;
  }
});

// Push notification event
self.addEventListener('push', event => {
  let notificationData = {
    title: 'ChoreStar',
    body: 'Time to do your chores! ⭐',
    icon: '/manifest.json',
    badge: '/manifest.json',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      url: '/'
    }
  };

  // Parse custom notification data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        data: {
          ...notificationData.data,
          ...data.data,
          url: data.url || '/'
        }
      };
    } catch (e) {
      // If not JSON, treat as text
      notificationData.body = event.data.text();
    }
  }

  const options = {
    ...notificationData,
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/manifest.json'
      },
      {
        action: 'complete',
        title: 'Mark Complete',
        icon: '/manifest.json'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/manifest.json'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'open' || event.action === 'complete') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
}); 