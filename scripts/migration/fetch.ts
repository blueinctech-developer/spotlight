/**
 * Step 1 of the WordPress migration: download everything we need from the live site
 * into migration/cache/ (read-only; nothing on the WordPress site is changed).
 *
 *   npm run migrate:fetch
 *
 * - REST API collections (posts, pages, media, categories, tags, users)
 * - Rendered HTML of every sitemap URL in English and French (TranslatePress /fr/)
 * - Elementor per-page CSS (background images are only defined there)
 */
import fs from "node:fs";
import path from "node:path";

const SITE = process.env.WP_SITE_URL ?? "https://spotlightnigeria-france.com";
const OUT = path.join(process.cwd(), "migration", "cache");
const UA = "Mozilla/5.0 (compatible; SpotlightMigration/1.0)";
const CONCURRENCY = 4;

async function get(url: string): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
      if (res.status >= 500 && attempt < 3) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (attempt >= 3) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

async function pool<T>(items: T[], fn: (item: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await fn(queue.shift()!);
  }));
}

export function cacheFileFor(urlPath: string): string {
  const p = urlPath.replace(/^\/|\/$/g, "") || "index";
  return path.join(OUT, "html", p.replace(/\//g, "__") + ".html");
}

async function fetchRest() {
  fs.mkdirSync(path.join(OUT, "rest"), { recursive: true });
  for (const type of ["posts", "pages", "media", "categories", "tags", "users"]) {
    const all: unknown[] = [];
    for (let page = 1; ; page++) {
      const res = await get(`${SITE}/wp-json/wp/v2/${type}?per_page=100&page=${page}`);
      if (!res.ok) break;
      const batch = (await res.json()) as unknown[];
      all.push(...batch);
      if (page >= Number(res.headers.get("x-wp-totalpages") ?? 1)) break;
    }
    fs.writeFileSync(path.join(OUT, "rest", `${type}.json`), JSON.stringify(all, null, 1));
    console.log(`rest ${type}: ${all.length}`);
  }
}

async function sitemapUrls(): Promise<string[]> {
  const index = await (await get(`${SITE}/sitemap_index.xml`)).text();
  const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => !u.includes("hf_template"));
  const urls: string[] = [];
  for (const map of maps) {
    const xml = await (await get(map)).text();
    urls.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => !u.includes("/wp-content/")));
  }
  return urls;
}

async function fetchHtml() {
  fs.mkdirSync(path.join(OUT, "html"), { recursive: true });
  const urls = await sitemapUrls();
  const paths = new Set<string>();
  for (const u of urls) {
    const p = new URL(u).pathname;
    paths.add(p);
    paths.add(p === "/" ? "/fr/" : `/fr${p}`);
  }
  // Paginated archives that are reachable from the site.
  for (const extra of ["/press-releases/page/2/", "/speakers/page/2/", "/speakers/page/3/"]) {
    paths.add(extra);
    paths.add(`/fr${extra}`);
  }
  const log: { path: string; status: number }[] = [];
  await pool([...paths], async (p) => {
    const res = await get(SITE + p);
    log.push({ path: p, status: res.status });
    if (res.ok) fs.writeFileSync(cacheFileFor(p), await res.text());
  });
  log.sort((a, b) => a.path.localeCompare(b.path));
  fs.writeFileSync(path.join(OUT, "html", "_status.json"), JSON.stringify(log, null, 1));
  console.log(`html: ${log.filter((l) => l.status === 200).length}/${log.length} pages saved`);
}

async function fetchCss() {
  fs.mkdirSync(path.join(OUT, "css"), { recursive: true });
  const ids = new Set<string>();
  for (const f of fs.readdirSync(path.join(OUT, "html"))) {
    if (!f.endsWith(".html")) continue;
    const html = fs.readFileSync(path.join(OUT, "html", f), "utf8");
    for (const m of html.matchAll(/elementor\/css\/post-(\d+)\.css/g)) ids.add(m[1]);
  }
  await pool([...ids], async (id) => {
    const res = await get(`${SITE}/wp-content/uploads/elementor/css/post-${id}.css`);
    if (res.ok) fs.writeFileSync(path.join(OUT, "css", `post-${id}.css`), await res.text());
  });
  console.log(`css: ${ids.size} files`);
}

async function main() {
  await fetchRest();
  await fetchHtml();
  await fetchCss();
  console.log(`Cache written to ${OUT}`);
}

if (process.argv[1]?.endsWith("fetch.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
