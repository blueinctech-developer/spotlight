// Crawl the local site from the homepages + sitemap and check every internal link and image.
const cheerio = require("cheerio");
const BASE = "http://localhost:3100";
const LEGACY_HOSTS = ["spotlightnigeria-france.com", "www.spotlightnigeria-france.com", "172.104.245.184"];
(async () => {
  const sm = await (await fetch(BASE + "/sitemap.xml")).text();
  const seeds = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const queue = [...new Set(["/", "/fr/", ...seeds])];
  const seenPages = new Set();
  const links = new Map(); // url -> Set(pages)
  const legacy = [];
  while (queue.length) {
    const p = queue.shift();
    if (seenPages.has(p)) continue;
    seenPages.add(p);
    const res = await fetch(BASE + p);
    if (!(res.headers.get("content-type") || "").includes("html")) continue;
    const $ = cheerio.load(await res.text());
    $("a[href], img[src], link[rel=canonical]").each((_, e) => {
      const raw = $(e).attr("href") || $(e).attr("src");
      if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:")) return;
      let u;
      try { u = new URL(raw, BASE + p); } catch { return; }
      if (LEGACY_HOSTS.includes(u.hostname)) legacy.push(`${p} -> ${raw}`);
      if (u.origin !== BASE && u.hostname !== "localhost") return;
      const key = u.pathname + u.search;
      if (!links.has(key)) links.set(key, new Set());
      links.get(key).add(p);
      if (e.tagName === "a" && !key.startsWith("/media/") && !key.startsWith("/_next/") && !key.startsWith("/admin") && !seenPages.has(key) && seenPages.size < 400 && !/\.(pdf|jpg|png|svg|webp)$/i.test(key)) queue.push(key.split("?")[0]);
    });
  }
  const bad = [];
  const redirected = [];
  for (const [url, pages] of links) {
    const r = await fetch(BASE + url, { redirect: "manual" });
    if (r.status >= 400) bad.push(`${r.status} ${url}  (on ${[...pages].slice(0, 3).join(", ")})`);
    else if (r.status >= 300) redirected.push(`${r.status} ${url} -> ${r.headers.get("location")}  (on ${[...pages].slice(0, 2).join(", ")})`);
  }
  console.log(`pages crawled: ${seenPages.size}, unique internal URLs checked: ${links.size}`);
  console.log(`broken (4xx/5xx): ${bad.length}`); bad.forEach((b) => console.log("  ", b));
  console.log(`internal links that redirect: ${redirected.length}`); redirected.slice(0, 30).forEach((b) => console.log("  ", b));
  console.log(`links to the old WordPress host/IP: ${legacy.length}`); [...new Set(legacy)].slice(0, 30).forEach((b) => console.log("  ", b));
})();
