/* Service worker de Vida de Perros (scope /veterinaria/).
 * - Páginas: red primero, con copia en caché y página sin conexión.
 * - Recursos estáticos de Next (_next/static): caché primero (son inmutables).
 * - Imágenes: caché con revalidación en segundo plano (máx. 150).
 * - Notificaciones push: preparado (requiere claves VAPID y un emisor en el servidor).
 */
const VERSION = "vdp-v1";
const PAGES = `${VERSION}-pages`;
const STATIC = `${VERSION}-static`;
const IMAGES = `${VERSION}-images`;
const OFFLINE = "/veterinaria/offline.html";
const PRECACHE = [OFFLINE, "/veterinaria", "/veterinaria/tienda", "/veterinaria/turnos", "/veterinaria/icons/icon-192.png", "/veterinaria/brand/mark.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(u))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("vdp-") && !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.pathname.startsWith("/api/") || url.hostname.endsWith("supabase.co") || url.protocol.startsWith("ws")) return;

  // Navegación (HTML).
  if (request.mode === "navigate") {
    const isAdmin = url.pathname.startsWith("/veterinaria/admin");
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok && !isAdmin) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(request, copy)).then(() => trim(PAGES, 60));
          }
          return res;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match(OFFLINE)) || new Response("Sin conexión", { status: 503 })),
    );
    return;
  }

  // Estáticos inmutables de Next.js y fuentes.
  if (url.origin === self.location.origin && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/veterinaria/icons/") || url.pathname.startsWith("/veterinaria/brand/"))) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Imágenes (optimizadas por Next o remotas).
  if (request.destination === "image" || url.pathname.startsWith("/_next/image")) {
    event.respondWith(
      caches.open(IMAGES).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone()).then(() => trim(IMAGES, 150));
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

// ── Notificaciones push (pedido listo, turno próximo, promociones…) ──
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Vida de Perros", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Vida de Perros", {
      body: data.body || "",
      icon: "/veterinaria/icons/icon-192.png",
      badge: "/veterinaria/icons/favicon-32.png",
      tag: data.tag,
      data: { url: data.url || "/veterinaria" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/veterinaria";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if (c.url.includes(target) && "focus" in c) return c.focus();
      return self.clients.openWindow(target);
    }),
  );
});
