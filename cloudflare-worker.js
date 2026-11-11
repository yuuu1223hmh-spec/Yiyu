// 譯讀 · 網址中繼（選用）
// 貼到 Cloudflare Workers 後，把 Worker 網址填進譯讀的「設定 → 網址讀取方式」。
// 用途：代替譯讀去抓網頁或 PDF 的原始內容，因為瀏覽器不允許 App 直接讀別的網站。

const ALLOWED_ORIGINS = ["*"]; // 想更私密：改成你的譯讀網址，例如 ["https://你的帳號.github.io"]

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "*";
    const allow = ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin) ? (ALLOWED_ORIGINS.includes("*") ? "*" : origin) : "";
    const cors = { "Access-Control-Allow-Origin": allow, "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "*" };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (!allow) return new Response("forbidden", { status: 403 });

    const target = new URL(request.url).searchParams.get("url");
    if (!target || !/^https?:\/\//i.test(target)) return new Response("missing url", { status: 400, headers: cors });

    const res = await fetch(target, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8"
      }
    });
    const headers = new Headers(cors);
    headers.set("Content-Type", res.headers.get("Content-Type") || "text/plain");
    return new Response(res.body, { status: res.status, headers });
  }
};
