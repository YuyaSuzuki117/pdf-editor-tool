const CACHE_NAME = 'pdf-editor-v2';
const STATIC_ASSETS = ['/', '/manifest.webmanifest'];

function shouldCacheRuntimeAsset(url) {
  return (
    url.includes('_next/static') ||
    url.includes('/icon') ||
    url.includes('/pdfjs/') ||
    url.includes('/fonts/')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // App shell のみキャッシュ（PDFファイルはキャッシュしない）
  if (event.request.method !== 'GET') return;
  if (shouldCacheRuntimeAsset(event.request.url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then((resp) => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return resp;
      }))
    );
  }
});
