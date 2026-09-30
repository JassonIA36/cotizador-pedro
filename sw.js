// Service Worker for Cotizador Pedro Roa PWA
const CACHE_NAME = 'pedro-roa-cotizador-v2.6.4';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/logo-data.js',
  './js/pdf-generator.js',
  './js/app.js',
  './assets/logo.png',
  './assets/favicon.ico',
  './assets/favicon-96x96.png',
  './assets/favicon-144x144.png',
  './assets/favicon-192x192.png',
  './assets/favicon-512x512.png',
  './assets/apple-touch-icon.png',
  './assets/jspdf.umd.min.js',
  './assets/jspdf.plugin.autotable.min.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First: Intenta obtener la versión más reciente por red.
// Si no hay conexión (offline), usa la versión guardada en caché.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // No cachear llamadas a la API ni autenticación de Supabase
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
