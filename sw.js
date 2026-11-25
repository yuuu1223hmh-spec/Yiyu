// Pip：離線快取。App 本體優先抓最新版；字典、PDF 元件、繁體轉換和字型存起來重複使用。
const V = "pip-v33";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

// 中文（繁、簡）和日韓 PDF 用的字型對照表：先存起來，第一次讀中文 PDF 時沒網路也讀得到
const CMAP = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/";
const CMAPS = ["Adobe-CNS1-UCS2", "UniCNS-UTF16-H", "UniCNS-UCS2-H", "B5pc-H", "ETen-B5-H", "HKscs-B5-H",
  "Adobe-GB1-UCS2", "UniGB-UTF16-H", "UniGB-UCS2-H", "GBK-EUC-H", "Adobe-Japan1-UCS2", "Adobe-Korea1-UCS2"].map(n => CMAP + n + ".bcmap");
self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL).then(() =>
    // 對照表抓不到（例如沒網路）也不影響安裝，之後用到時會再存
    Promise.all(CMAPS.map(u => fetch(u, { mode: "cors" }).then(r => r.ok && c.put(u, r)).catch(() => {}))))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  // 換新版時，把舊版存過的對照表、字典和 PDF 元件搬過來，不用重新下載
  e.waitUntil((async () => {
    const cur = await caches.open(V);
    for (const k of await caches.keys()) {
      if (k === V) continue;
      const old = await caches.open(k);
      for (const r of await old.keys()) {
        if (/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|dict\.json/.test(r.url) && !(await cur.match(r))) { const res = await old.match(r); if (res) await cur.put(r, res); }
      }
      await caches.delete(k);
    }
    await self.clients.claim();
  })());
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
