const CACHE = 'grindplan-shell-v2'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg']
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())))
self.addEventListener('activate', (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())))
self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return
  event.respondWith(fetch(request).then((response) => {
    if (response.ok && (request.mode === 'navigate' || request.destination === 'script' || request.destination === 'style' || request.destination === 'image')) {
      // Clone before returning the network response, and keep the cache write
      // alive with this fetch event. Cache failures must not fail the request.
      try {
        const copy = response.clone()
        event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {}))
      } catch { /* Some opaque or already-consumed responses cannot be cached. */ }
    }
    return response
  }).catch(() => caches.match(request).then((cached) => cached || (request.mode === 'navigate' ? caches.match('/index.html') : undefined))))
})
