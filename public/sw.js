const CACHE_NAME = "meongcare-v3";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  // 구 캐시 전부 삭제
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

// 아이콘/폰트 등 정적 리소스만 캐시, HTML/JS/CSS는 항상 네트워크
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API, HTML, JS, CSS → 항상 네트워크 (캐시 안 함)
  if (
    url.pathname.includes("/api/") ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname === "/"
  ) return;

  // 아이콘, 이미지, 폰트만 캐시
  if (url.pathname.startsWith("/icons/") || url.pathname.endsWith(".png") || url.pathname.endsWith(".svg") || url.pathname.endsWith(".woff2")) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }))
    );
    return;
  }

  // 나머지는 네트워크 우선
  return;
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "멍케어", body: "알림" };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-96x96.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        const existing = list.find((c) => c.url.startsWith(self.location.origin));
        if (existing) return existing.focus();
        return clients.openWindow("/");
      })
  );
});
