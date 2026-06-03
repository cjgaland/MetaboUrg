// ============================================================
//  sw.js — Service Worker · MetaboUrg
//  Estrategia network-first con fallback a caché (uso offline).
//  El SW nuevo NO hace skipWaiting() en install: queda en espera
//  hasta que el usuario pulsa "Actualizar" en el banner de la app.
//  ▶ Al desplegar cambios, incrementar CACHE_NAME (metabourg-vN+1)
//    para que los usuarios vean el banner "Nueva versión disponible".
// ============================================================

const CACHE_NAME = "metabourg-v3";

const ASSETS = [
  "./index.html",
  "./styles.css",
  "./shared/core.js",
  "./shared/formulas.js",
  "./shared/informe.js",
  "./modulos/glucemia/protocolos.js",
  "./modulos/glucemia/glucemia.js",
  "./modulos/glucemia/cad.js",
  "./manifest.json",
  "./icon-192.svg",
  "./icon-512.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Mensaje desde la app: el usuario pulsó "Actualizar" en el banner.
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
