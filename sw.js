// Pip：離線快取。App 本體優先抓最新版，PDF 元件與字型存起來重複使用。
const V = "yidu-v6";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.origin === location.origin) {
    if (req.mode === "navigate" || u.pathname.endsWith("/") || u.pathname.endsWith(".html")) {
      e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(V).then(ca => ca.put(req, c)); return r; })
        .catch(() => caches.match(req).then(r => r || caches.match("./index.html"))));
      return;
    }
    e.respondWith(caches.match(req).then(r => r || fetch(req)));
    return;
  }
  if (/(^|\.)cdnjs\.cloudflare\.com$|^fonts\.(googleapis|gstatic)\.com$/.test(u.host)) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
      if (res.ok || res.type === "opaque") { const c = res.clone(); caches.open(V).then(ca => ca.put(req, c)); }
      return res;
    })));
  }
});
