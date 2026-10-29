const cheerio = require("cheerio");
const fs = require("fs");
const [,, baselinePath, outDir, base = "http://localhost:3100"] = process.argv;
const live = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const extra = ["/feed/", "/fr/feed/", "/sitemap_index.xml", "/wp-sitemap.xml", "/REGISTRATION/", "/registration", "/fr", "/?s=test", "/page/2/", "/author/blueinctech/", "/does-not-exist-xyz/", "/fr/does-not-exist-xyz/", "/index.php", "/press-releases/page/2/", "/wp-admin/", "/wp-login.php", "/xmlrpc.php", "/wp-json/"];
const paths = [...new Set([...live.map(r => new URL(r.url).pathname + new URL(r.url).search), ...extra])];
const liveBy = Object.fromEntries(live.map(r => [new URL(r.url).pathname + new URL(r.url).search, r]));
(async () => {
  const rows = [];
  for (const p of paths) {
    let url = base + p, chain = [], status, res;
    for (let i = 0; i < 6; i++) {
      res = await fetch(url, { redirect: "manual" });
      status = res.status;
      if (status >= 300 && status < 400 && res.headers.get("location")) {
        const next = new URL(res.headers.get("location"), url).toString();
        chain.push(`${status}→${new URL(next).pathname}`); url = next; continue;
      }
      break;
    }
    const r = { path: p, live_status: liveBy[p]?.status ?? "", live_final: liveBy[p]?.final_url ? new URL(liveBy[p].final_url).pathname : "", live_final_status: liveBy[p]?.final_status ?? "", local_chain: chain.join(" "), local_final: new URL(url).pathname, local_status: status };
    if ((res.headers.get("content-type") || "").includes("html") && status === 200) {
      const $ = cheerio.load(await res.text());
      r.title = $("title").first().text().trim();
      r.description = $('meta[name="description"]').attr("content") || "";
      r.canonical = $('link[rel="canonical"]').attr("href") || "";
      r.robots = $('meta[name="robots"]').attr("content") || "";
      r.lang = $("html").attr("lang");
      r.hreflang = $('link[rel="alternate"][hreflang]').map((_, e) => $(e).attr("hreflang")).get().join("|");
      r.h1_count = $("h1").length; r.h1 = $("h1").first().text().trim().replace(/\s+/g, " ").slice(0, 80);
      r.jsonld = $('script[type="application/ld+json"]').map((_, e) => { try { const j = JSON.parse($(e).text()); return [].concat(j["@graph"] || j).map(x => x["@type"]).join("+"); } catch { return "ERR"; } }).get().join("|");
      r.og_image = $('meta[property="og:image"]').attr("content") || "";
      r.img_no_alt = $("img:not([alt])").length;
      r.live_title = liveBy[p]?.title || ""; r.live_h1 = (liveBy[p]?.h1 || "").slice(0, 80);
    } else { await res.arrayBuffer().catch(() => {}); }
    rows.push(r);
  }
  fs.writeFileSync(outDir + "/compare.json", JSON.stringify(rows, null, 1));
  const cols = ["path","live_status","live_final","live_final_status","local_chain","local_final","local_status","title","live_title","h1_count","h1","live_h1","description","canonical","robots","lang","hreflang","jsonld","og_image","img_no_alt"];
  fs.writeFileSync(outDir + "/compare.csv", [cols.join(","), ...rows.map(r => cols.map(c => JSON.stringify(r[c] ?? "")).join(","))].join("\n"));
  console.log("rows", rows.length);
})();
