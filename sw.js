// Pip：離線快取。App 本體優先抓最新版；字典、PDF 元件、繁體轉換和字型存起來重複使用。
const V = "pip-v10";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const keep = (req, res) => { if (res && (res.ok || res.type === "opaque")) { const c = res.clone(); caches.open(V).then(ca => ca.put(req, c)); } return res; };
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.origin === location.origin) {
    if (req.mode === "navigate" || u.pathname.endsWith("/") || u.pathname.endsWith(".html")) {
      e.respondWith(fetch(req).then(r => keep(req, r)).catch(() => caches.match(req).then(r => r || caches.match("./index.html"))));
      return;
    }
    if (u.pathname.endsWith("dict.json")) {
      // 字典很大：先用快取，背景更新
      e.respondWith(caches.match(req).then(r => { const f = fetch(req).then(res => keep(req, res)).catch(() => r); return r || f; }));
      return;
    }
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => keep(req, res))));
    return;
  }
  if (/(^|\.)cdnjs\.cloudflare\.com$|^cdn\.jsdelivr\.net$|^fonts\.(googleapis|gstatic)\.com$/.test(u.host)) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => keep(req, res))));
  }
});
