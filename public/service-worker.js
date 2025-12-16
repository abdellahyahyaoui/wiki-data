// public/service-worker.js

const CACHE_NAME = "v1_cache";
const urlsToCache = [
  "/",
  "/index.html",
  "/static/js/main.js",
  "/static/css/main.css",
  "/images/icon-dark-32x32.png",  // Asegúrate de agregar tus imágenes e íconos
  "/images/icon-light-32x32.png",
  "/images/icon.svg",
  "/images/apple-icon.png",
  "/images/w.png",  // Tu icono W.png
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
