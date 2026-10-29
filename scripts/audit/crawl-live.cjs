// Polite read-only SEO baseline crawler for spotlightnigeria-france.com
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const OUT = process.argv[2];
const ORIGIN = 'https://spotlightnigeria-france.com';
const HOST = 'spotlightnigeria-france.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const DELAY = 350;
const CAP = 250;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MEDIA_RE = /\.(jpe?g|png|gif|webp|svg|avif|ico|mp4|webm|mov|mp3|wav|zip|rar|css|js|woff2?|ttf|eot|xml|txt)$/i;
const DOC_RE = /\.(pdf|docx?|xlsx?|pptx?|odt|csv)$/i;

let reqCount = 0;
async function get(url, redirect = 'manual') {
  await sleep(DELAY);
  reqCount++;
  try {
    const res = await fetch(url, { redirect, headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' } });
    const ct = res.headers.get('content-type') || '';
    let body = '';
    if (/text|xml|json|html/.test(ct) || !ct) body = await res.text();
    else await res.arrayBuffer().catch(() => {});
    return { status: res.status, headers: res.headers, body, url: res.url, ct };
  } catch (e) {
    return { status: 0, error: String(e), headers: new Headers(), body: '', url, ct: '' };
  }
}

// follow redirects manually to record chain
async function fetchChain(url) {
  const chain = [];
  let cur = url;
  let r;
  for (let i = 0; i < 10; i++) {
    r = await get(cur, 'manual');
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
      const loc = new URL(r.headers.get('location'), cur).href;
      chain.push({ url: cur, status: r.status, location: loc });
      cur = loc;
      continue;
    }
    break;
  }
  return { first: chain.length ? chain[0].status : r.status, chain, final: r, finalUrl: cur };
}

function normalize(href, base) {
  try {
    const u = new URL(href, base);
    if (u.hostname.replace(/^www\./, '') !== HOST) return null;
    u.hash = '';
    return u;
  } catch { return null; }
}

function excluded(u) {
  const p = u.pathname;
  if (/\/wp-admin|\/wp-login|\/wp-json|\/xmlrpc|\/feed\/?$|\/wp-content\/|\/wp-includes\//.test(p)) return true;
  if (u.searchParams.has('replytocom') || u.search.includes('add-to-cart')) return true;
  if (MEDIA_RE.test(p) || DOC_RE.test(p)) return true;
  return false;
}

function toFr(u) {
  const x = new URL(u);
  if (x.pathname.startsWith('/fr/') || x.pathname === '/fr') return null;
  x.pathname = '/fr' + x.pathname;
  return x.href;
}

function analyze(html, headers) {
  const $ = cheerio.load(html);
  const meta = (sel) => $(sel).attr('content') ?? null;
  const jsonld = [];
  const jsonldErrors = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).contents().text());
      const walk = (o) => {
        if (Array.isArray(o)) return o.forEach(walk);
        if (o && typeof o === 'object') {
          if (o['@type']) [].concat(o['@type']).forEach((t) => jsonld.push(t));
          if (o['@graph']) walk(o['@graph']);
        }
      };
      walk(data);
    } catch (e) { jsonldErrors.push(String(e).slice(0, 80)); }
  });
  const h1 = $('h1').map((_, el) => $(el).text().replace(/\s+/g, ' ').trim()).get();
  const imgsNoAlt = $('img').filter((_, el) => { const a = $(el).attr('alt'); return a === undefined || a.trim() === ''; }).length;
  const hreflang = $('link[rel="alternate"][hreflang]').map((_, el) => ({ lang: $(el).attr('hreflang'), href: $(el).attr('href') })).get();
  const links = $('a[href]').map((_, el) => $(el).attr('href')).get();
  const insecure = [];
  $('img[src],script[src],link[href],iframe[src],source[src]').each((_, el) => {
    const v = $(el).attr('src') || $(el).attr('href');
    if (v && /^http:\/\//i.test(v)) insecure.push(v);
  });
  const httpLinks = links.filter((l) => /^http:\/\/(www\.)?spotlightnigeria-france\.com/i.test(l));
  const $c = cheerio.load(html);
  $c('script,style,noscript,svg,header,footer,nav').remove();
  const mainEl = $c('main').length ? $c('main') : $c('body');
  const text = mainEl.text().replace(/\s+/g, ' ').trim();
  return {
    title: $('title').first().text().trim() || null,
    title_count: $('title').length,
    description: meta('meta[name="description"]'),
    canonical: $('link[rel="canonical"]').attr('href') ?? null,
    meta_robots: meta('meta[name="robots"]'),
    x_robots_tag: headers.get('x-robots-tag'),
    lang: $('html').attr('lang') ?? null,
    hreflang,
    og_title: meta('meta[property="og:title"]'),
    og_description: meta('meta[property="og:description"]'),
    og_image: meta('meta[property="og:image"]'),
    og_type: meta('meta[property="og:type"]'),
    og_locale: meta('meta[property="og:locale"]'),
    og_url: meta('meta[property="og:url"]'),
    twitter_card: meta('meta[name="twitter:card"]'),
    h1_count: h1.length,
    h1,
    h2_count: $('h2').length,
    jsonld_types: [...new Set(jsonld)],
    jsonld_errors: jsonldErrors,
    img_count: $('img').length,
    img_no_alt: imgsNoAlt,
    word_count: text ? text.split(' ').length : 0,
    insecure_resources: insecure.slice(0, 10),
    insecure_internal_links: [...new Set(httpLinks)].slice(0, 10),
    generator: $('meta[name="generator"]').map((_, el) => $(el).attr('content')).get(),
    _links: links,
  };
}

function parseLocs(xml) {
  const $ = cheerio.load(xml, { xmlMode: true });
  const sitemaps = $('sitemap > loc').map((_, el) => $(el).text().trim()).get();
  const urls = $('url > loc').map((_, el) => $(el).text().trim()).get();
  const alts = [];
  $('url').each((_, el) => {
    $(el).find('xhtml\\:link').each((_, l) => alts.push({ lang: $(l).attr('hreflang'), href: $(l).attr('href') }));
  });
  const lastmod = {};
  $('url').each((_, el) => { lastmod[$(el).find('loc').text().trim()] = $(el).find('lastmod').text().trim() || null; });
  return { sitemaps, urls, alts, lastmod };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  // 1. robots
  const robots = await get(ORIGIN + '/robots.txt', 'follow');
  fs.writeFileSync(path.join(OUT, 'robots.txt'), robots.body);
  const robotsSitemaps = (robots.body.match(/^sitemap:\s*(\S+)/gim) || []).map((l) => l.replace(/^sitemap:\s*/i, ''));

  const sitemapProbe = {};
  const smQueue = [...new Set([ORIGIN + '/sitemap_index.xml', ORIGIN + '/sitemap.xml', ORIGIN + '/wp-sitemap.xml', ...robotsSitemaps])];
  const smSeen = new Set();
  const sitemapUrls = []; // {url, sitemap, lastmod}
  const sitemapAlts = [];
  while (smQueue.length) {
    const sm = smQueue.shift();
    if (smSeen.has(sm)) continue;
    smSeen.add(sm);
    const c = await fetchChain(sm);
    sitemapProbe[sm] = { status: c.first, chain: c.chain, final: c.finalUrl, final_status: c.final.status };
    if (c.final.status !== 200) continue;
    const { sitemaps, urls, alts, lastmod } = parseLocs(c.final.body);
    sitemapProbe[sm].child_sitemaps = sitemaps.length;
    sitemapProbe[sm].url_count = urls.length;
    sitemaps.forEach((s) => smQueue.push(s));
    urls.forEach((u) => sitemapUrls.push({ url: u, sitemap: c.finalUrl, lastmod: lastmod[u] }));
    alts.forEach((a) => sitemapAlts.push({ ...a, sitemap: c.finalUrl }));
  }
  const smUnique = [...new Map(sitemapUrls.map((x) => [x.url, x])).values()];
  fs.writeFileSync(path.join(OUT, 'sitemaps.json'), JSON.stringify({ robotsSitemaps, sitemapProbe, urls: smUnique, hreflang_alternates_in_sitemaps: sitemapAlts }, null, 2));
  fs.writeFileSync(path.join(OUT, 'sitemap-urls.txt'), smUnique.map((x) => x.url).join('\n') + '\n');
  console.log('sitemap urls', smUnique.length, 'requests', reqCount);

  // 2. URL set
  const queue = []; // {url, source}
  const seen = new Set();
  const docs = new Map(); // doc url -> found on
  const external = new Map();
  const add = (url, source) => {
    const u = normalize(url, ORIGIN);
    if (!u) return;
    if (DOC_RE.test(u.pathname)) { if (!docs.has(u.href)) docs.set(u.href, source); return; }
    if (excluded(u)) return;
    if (u.hostname.startsWith('www.')) u.hostname = HOST;
    const key = u.href;
    if (seen.has(key)) return;
    if (seen.size >= CAP) return;
    seen.add(key);
    queue.push({ url: key, source });
  };
  add(ORIGIN + '/', 'seed');
  add(ORIGIN + '/fr/', 'seed');
  for (const s of smUnique) add(s.url, 'sitemap');
  for (const s of smUnique) { const fr = toFr(s.url); if (fr) add(fr, 'sitemap-fr-equivalent'); }
  for (const a of sitemapAlts) add(a.href, 'sitemap-hreflang');

  const records = [];
  const recByUrl = new Map();
  let homepageHtml = null, frHomeHtml = null;
  // depth handling: links discovered from seed pages (homepage EN/FR) are depth 1; we also expand links found on depth-1 nav/footer pages? Spec: one level deep from homepage+nav/footer. We expand links from homepage EN/FR and from pages linked in nav/footer of those (depth 1).
  const expandFrom = new Set([ORIGIN + '/', ORIGIN + '/fr/']);
  for (let i = 0; i < queue.length; i++) {
    const { url, source } = queue[i];
    const c = await fetchChain(url);
    const f = c.final;
    const rec = {
      url, source,
      status: c.first,
      redirect_chain: c.chain,
      final_url: c.finalUrl,
      final_status: f.status,
      content_type: f.ct,
      error: f.error || null,
    };
    if (f.status === 200 && /html/.test(f.ct)) {
      const a = analyze(f.body, f.headers);
      const links = a._links; delete a._links;
      Object.assign(rec, a);
      if (url === ORIGIN + '/') homepageHtml = f.body;
      if (url === ORIGIN + '/fr/') frHomeHtml = f.body;
      if (expandFrom.has(url)) {
        // nav/footer pages from homepages
        const $ = cheerio.load(f.body);
        const navLinks = $('nav a[href], header a[href], footer a[href], .menu a[href], [class*="footer"] a[href]').map((_, el) => $(el).attr('href')).get();
        navLinks.forEach((l) => { const u = normalize(l, url); if (u && !excluded(u)) expandFrom.add(u.href); });
        links.forEach((l) => add(l, 'link:' + url));
      } else if (expandFrom.has(c.finalUrl) || expandFrom.has(url)) {
        links.forEach((l) => add(l, 'link:' + url));
      }
      // record docs and external links anywhere
      links.forEach((l) => {
        const u = normalize(l, url);
        if (u && DOC_RE.test(u.pathname) && !docs.has(u.href)) docs.set(u.href, url);
        if (!u && /^https?:/i.test(l)) { try { const h = new URL(l).hostname; external.set(h, (external.get(h) || 0) + 1); } catch {} }
      });
    }
    records.push(rec);
    recByUrl.set(url, rec);
    if (i % 20 === 0) console.log(i, '/', queue.length, url, rec.status);
  }

  // docs: HEAD-ish check (GET with manual redirect but no body read for binaries)
  const docRecords = [];
  for (const [d, src] of docs) {
    const c = await fetchChain(d);
    docRecords.push({ url: d, found_on: src, status: c.first, final_url: c.finalUrl, final_status: c.final.status, content_type: c.final.ct, x_robots_tag: c.final.headers.get('x-robots-tag') });
  }

  // 4. probes
  const known = smUnique.find((x) => /\/[a-z0-9-]+\/$/.test(new URL(x.url).pathname) && new URL(x.url).pathname.split('/').length === 3)?.url || ORIGIN + '/about-us/';
  const knownPath = new URL(known).pathname;
  const author = smUnique.find((x) => x.url.includes('/author/'))?.url;
  const cat = smUnique.find((x) => x.url.includes('/category/'))?.url;
  const tag = smUnique.find((x) => x.url.includes('/tag/'))?.url;
  const probes = [
    ['feed', '/feed/'], ['fr feed', '/fr/feed/'], ['wp-json', '/wp-json/'], ['wp-json users', '/wp-json/wp/v2/users'], ['search', '/?s=test'], ['fr search', '/fr/?s=test'],
    ['author admin', '/author/admin/'], ['author ?author=1', '/?author=1'],
    ['author (sitemap)', author], ['category (sitemap)', cat], ['tag (sitemap)', tag],
    ['category uncategorized', '/category/uncategorized/'], ['blog page 2', '/page/2/'], ['blog /blog/page/2/', '/blog/page/2/'], ['news page 2', '/news/page/2/'],
    ['nonexistent', '/this-page-does-not-exist-' + Date.now() + '/'], ['fr nonexistent', '/fr/this-page-does-not-exist-xyz/'],
    ['uppercase known', knownPath.toUpperCase()], ['no trailing slash known', knownPath.replace(/\/$/, '')],
    ['http scheme', 'http://spotlightnigeria-france.com/'], ['www host', 'https://www.spotlightnigeria-france.com/'], ['index.php', '/index.php'],
    ['fr no slash', '/fr'], ['readme.html', '/readme.html'], ['license.txt', '/license.txt'], ['xmlrpc.php', '/xmlrpc.php'], 
    ['wp-content/uploads listing', '/wp-content/uploads/'], 
    ['attachment ?attachment_id=1', '/?attachment_id=1'], ['hello-world', '/hello-world/'], ['sample-page', '/sample-page/'], ['?p=1', '/?p=1'], ['comments feed', '/comments/feed/'],
    ['events archive', '/events/'], ['speakers archive', '/speakers/'], ['organizers archive', '/organizers/'],
  ].filter((p) => p[1]);
  const probeRecords = [];
  for (const [label, p] of probes) {
    const url = p.startsWith('http') ? p : ORIGIN + p;
    const c = await fetchChain(url);
    const pr = { label, url, status: c.first, chain: c.chain, final_url: c.finalUrl, final_status: c.final.status, content_type: c.final.ct, x_robots_tag: c.final.headers.get('x-robots-tag') };
    if (c.final.status === 200 && /html/.test(c.final.ct)) {
      const $ = cheerio.load(c.final.body);
      pr.title = $('title').text().trim();
      pr.meta_robots = $('meta[name="robots"]').attr('content') ?? null;
      pr.canonical = $('link[rel="canonical"]').attr('href') ?? null;
    }
    if (/json/.test(c.final.ct) && c.final.status === 200) {
      try { const j = JSON.parse(c.final.body); pr.json_summary = Array.isArray(j) ? j.map((u) => ({ id: u.id, slug: u.slug, name: u.name })).slice(0, 10) : { name: j.name, namespaces: (j.namespaces || []).slice(0, 40) }; } catch {}
    }
    if (/text\/plain/.test(c.final.ct) && c.final.status === 200) pr.body_head = c.final.body.slice(0, 200);
    probeRecords.push(pr);
  }

  // tracking on homepage
  const tracking = {};
  const scan = (html, key) => {
    if (!html) return;
    const ids = {
      ga4: [...new Set(html.match(/G-[A-Z0-9]{6,12}/g) || [])],
      ua: [...new Set(html.match(/UA-\d{4,10}-\d{1,4}/g) || [])],
      gtm: [...new Set(html.match(/GTM-[A-Z0-9]{4,9}/g) || [])],
      aw: [...new Set(html.match(/AW-\d{6,12}/g) || [])],
      fb_pixel: [...new Set([...(html.matchAll(/fbq\(\s*['"]init['"]\s*,\s*['"](\d+)['"]/g))].map((m) => m[1]))],
      fbevents: /connect\.facebook\.net\/[^"']*fbevents/.test(html),
      hotjar: [...new Set([...(html.matchAll(/hjid[:=]\s*(\d+)/g))].map((m) => m[1]))],
      clarity: [...new Set([...(html.matchAll(/clarity\.ms\/tag\/([a-z0-9]+)/gi))].map((m) => m[1]))],
      linkedin: [...new Set([...(html.matchAll(/_linkedin_partner_id\s*=\s*["']?(\d+)/g))].map((m) => m[1]))],
      tiktok: /analytics\.tiktok\.com/.test(html),
      site_kit: /googlesitekit|Site Kit by Google/i.test(html),
      monsterinsights: /monsterinsights/i.test(html),
      recaptcha: /recaptcha/i.test(html),
      google_site_verification: [...new Set([...(html.matchAll(/name=["']google-site-verification["']\s+content=["']([^"']+)/g))].map((m) => m[1]))],
      fb_domain_verification: [...new Set([...(html.matchAll(/name=["']facebook-domain-verification["']\s+content=["']([^"']+)/g))].map((m) => m[1]))],
    };
    const $ = cheerio.load(html);
    ids.script_srcs = [...new Set($('script[src]').map((_, el) => { try { return new URL($(el).attr('src'), ORIGIN).hostname; } catch { return null; } }).get().filter(Boolean))];
    ids.plugins = [...new Set((html.match(/wp-content\/plugins\/([a-z0-9_-]+)/gi) || []).map((m) => m.split('/')[2]))];
    ids.themes = [...new Set((html.match(/wp-content\/themes\/([a-z0-9_-]+)/gi) || []).map((m) => m.split('/')[2]))];
    ids.generator = $('meta[name="generator"]').map((_, el) => $(el).attr('content')).get();
    tracking[key] = ids;
  };
  scan(homepageHtml, 'en_home');
  scan(frHomeHtml, 'fr_home');
  if (homepageHtml) fs.writeFileSync(path.join(OUT, 'homepage-en.html'), homepageHtml);
  if (frHomeHtml) fs.writeFileSync(path.join(OUT, 'homepage-fr.html'), frHomeHtml);

  fs.writeFileSync(path.join(OUT, 'baseline.json'), JSON.stringify(records, null, 2));
  fs.writeFileSync(path.join(OUT, 'probes.json'), JSON.stringify(probeRecords, null, 2));
  fs.writeFileSync(path.join(OUT, 'documents.json'), JSON.stringify(docRecords, null, 2));
  fs.writeFileSync(path.join(OUT, 'tracking.json'), JSON.stringify({ tracking, external_link_hosts: Object.fromEntries([...external].sort((a, b) => b[1] - a[1])) }, null, 2));

  const esc = (v) => { if (v == null) return ''; const s = Array.isArray(v) ? v.join(' | ') : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const cols = ['url', 'status', 'final_url', 'title', 'description', 'canonical', 'robots', 'lang', 'h1_count', 'h1', 'jsonld_types', 'og_image'];
  const csv = [cols.join(',')].concat(records.map((r) => [r.url, r.status, r.final_url, r.title, r.description, r.canonical, r.meta_robots, r.lang, r.h1_count, r.h1, r.jsonld_types, r.og_image].map(esc).join(','))).join('\n');
  fs.writeFileSync(path.join(OUT, 'baseline.csv'), csv + '\n');
  console.log('done. records', records.length, 'docs', docRecords.length, 'probes', probeRecords.length, 'requests', reqCount);
}
if (require.main === module) main(); else module.exports = { fetchChain, analyze, normalize, excluded, DOC_RE };
