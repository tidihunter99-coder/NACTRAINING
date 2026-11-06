/* NAC TRAINING public-shell service worker.
 * Private routes, API calls, authenticated responses and signed media URLs
 * intentionally always use the network and are never persisted here.
 */
const CACHE = "nac-public-shell-v1";
const PUBLIC_SHELL = [
  "/",
  "/entrar",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/logos/nac-header.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PUBLIC_SHELL)));
  // Do not skipWaiting: an existing authenticated tab keeps its current bundle
  // until it is closed, avoiding an update in the middle of a workout.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  // Never cache documents: a document might render personal data after login.
  if (request.mode === "navigate" || request.destination === "document") return;
  const cacheable = ["style", "script", "font", "image", "manifest"].includes(request.destination)
    || url.pathname.startsWith("/_next/static/");
  if (!cacheable) return;
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok && response.type === "basic") {
        const copy = response.clone();
        void caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })),
  );
});
