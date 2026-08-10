/* CUTHALF · service worker
   Sube VERSION en cada despliegue: invalida la caché anterior.

   Estrategia:
   · navegación (el HTML) → red primero, caché sólo si no hay red.
     Así una versión nueva en el servidor se carga siempre al abrir.
   · resto (hojas de estilo, módulos, tipografías…) → caché primero y
     actualización en segundo plano, que es donde interesa la
     velocidad.

   Desde que el juego está repartido en módulos, la instalación se
   los lleva todos de una vez: con una lista incompleta el HTML nuevo
   podría acabar cargando módulos de la versión anterior.            */
const VERSION = "2026.08.10";
const CACHE   = "cuthalf-" + VERSION;
const PAGE    = new URL(location).searchParams.get("page") || "./";

const ASSETS = [
  PAGE,
  "manifest.webmanifest",
  "css/base.css", "css/game.css", "css/screens.css",
  "src/main.js", "src/config.js", "src/i18n.js", "src/rng.js", "src/util.js", "src/scoring.js",
  "src/geometry.js", "src/shapes.js", "src/storage.js", "src/scores.js",
  "src/state.js", "src/game.js", "src/render.js", "src/share.js",
  "src/input.js", "src/menu.js", "src/pwa.js",
  "icons/icon-192-any.png", "icons/icon-512-any.png", "icons/icon-512-maskable.png"
];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", e => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  /* las llamadas a la clasificación mundial nunca se guardan */
  if (/\/(rest|functions|auth)\/v\d/.test(new URL(req.url).pathname)) return;

  if (req.mode === "navigate"){
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(PAGE, copy));
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match(PAGE)))
    );
    return;
  }

  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => {
      if (res && res.status === 200 && res.type !== "opaque"){
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
