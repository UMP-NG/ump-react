// UMP Service Worker — push notifications + offline caching

const SHELL_CACHE  = "ump-shell-v1";
const API_CACHE    = "ump-api-v1";
const STATIC_CACHE = "ump-static-v1";

// App-shell resources cached on install (always available offline)
const SHELL_URLS = ["/", "/index.html", "/images/ump-logo.jpeg"];

// API routes to cache with stale-while-revalidate (show cached, refresh in bg)
const SWR_API_PATTERNS = [
  /\/api\/categories/,
  /\/api\/products(\?|$)/,
  /\/api\/services(\?|$)/,
  /\/api\/listings(\?|$)/,
  /\/api\/sellers(\?|$)/,
  /\/api\/admins\/config/,
];

// ── Install: pre-cache the app shell ─────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

// ── Activate: wipe old caches ─────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, API_CACHE, STATIC_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
    )
  );
  event.waitUntil(clients.claim());
});

// ── Fetch: routing strategies ─────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin, and browser extensions
  if (request.method !== "GET") return;
  if (url.origin !== location.origin) return;

  // 1. Static assets (JS/CSS bundles, fonts, images) → Cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 2. Key API reads → Stale-while-revalidate (instant from cache, refresh in bg)
  if (url.pathname.startsWith("/api/") && SWR_API_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }

  // 3. Navigation requests (HTML) → Network-first with shell fallback
  if (request.mode === "navigate") {
    event.respondWith(networkFirstWithShellFallback(request));
    return;
  }

  // 4. Everything else → Network only (auth, mutations, admin APIs)
});

// ── Strategy: Cache-first ─────────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

// ── Strategy: Stale-while-revalidate ─────────────────────────────────────────
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchAndUpdate = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  // Return cached immediately if available; otherwise wait for network
  return cached ?? await fetchAndUpdate;
}

// ── Strategy: Network-first with shell fallback ───────────────────────────────
async function networkFirstWithShellFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    return (await cache.match(request)) ?? (await cache.match("/")) ?? new Response("Offline", { status: 503 });
  }
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/images/") ||
    /\.(js|css|woff2?|ttf|otf|eot)$/.test(pathname)
  );
}

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try { data = event.data.json(); } catch { data = { title: "UMP", body: event.data.text() }; }

  const title   = data.title || "UMP";
  const options = {
    body:     data.body  || "",
    icon:     data.icon  || "/images/ump-logo.jpeg",
    badge:    data.badge || "/images/ump-logo.jpeg",
    tag:      data.tag   || "ump-broadcast",
    renotify: true,
    data:     { url: data.url || "/", broadcastId: data.tag || null },
    actions:  data.url ? [{ action: "open", title: "View" }] : [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url         = event.notification.data?.url || "/";
  const broadcastId = event.notification.data?.broadcastId;

  event.waitUntil(
    (async () => {
      if (broadcastId && broadcastId !== "ump-broadcast") {
        fetch(`/api/push/open/${broadcastId}`, { method: "POST" }).catch(() => {});
      }
      const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })()
  );
});
