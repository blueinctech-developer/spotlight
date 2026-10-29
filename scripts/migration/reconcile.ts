/**
 * Read-only reconciliation of the imported content against the live WordPress site.
 *
 *   npx tsx --conditions=react-server scripts/migration/reconcile.ts [--live]
 *
 * Prints database counts per content type and language, records with missing media, and
 * (with --live) compares against the public WordPress REST API and sitemap counts. It never
 * writes to the database or to WordPress, so it is safe to run at any time, e.g. just
 * before cutover to spot content added on WordPress after the last import.
 */
import "dotenv/config";
import { db } from "@/lib/db";

const SITE = "https://spotlightnigeria-france.com";

async function liveCounts() {
  const total = async (type: string) => {
    const r = await fetch(`${SITE}/wp-json/wp/v2/${type}?per_page=1`, { headers: { "user-agent": "spotlight-reconcile" } });
    return r.ok ? Number(r.headers.get("x-wp-total") ?? NaN) : NaN;
  };
  const sitemapCount = async (name: string) => {
    const r = await fetch(`${SITE}/${name}`, { headers: { "user-agent": "spotlight-reconcile" } });
    return r.ok ? ((await r.text()).match(/<loc>/g) ?? []).length : NaN;
  };
  return {
    posts: await total("posts"),
    pages: await total("pages"),
    media: await total("media"),
    categories: await total("categories"),
    tags: await total("tags"),
    speakersInSitemap: await sitemapCount("speakers-sitemap.xml"),
  };
}

async function main() {
  const byLocale = async (model: "page" | "post") => {
    const rows = await (model === "page"
      ? db.page.groupBy({ by: ["locale", "status"], where: { deletedAt: null }, _count: true })
      : db.post.groupBy({ by: ["locale", "status"], where: { deletedAt: null }, _count: true }));
    return Object.fromEntries(rows.map((r) => [`${r.locale}/${r.status}`, r._count]));
  };
  const local = {
    pages: await byLocale("page"),
    posts: await byLocale("post"),
    postsFromWordPress: await db.post.count({ where: { legacyId: { not: null }, locale: "en" } }),
    pagesFromWordPress: await db.page.count({ where: { legacyId: { not: null }, locale: "en" } }),
    media: await db.mediaAsset.count(),
    mediaFromWordPress: await db.mediaAsset.count({ where: { legacyUrl: { not: null } } }),
    categories: await db.category.count(),
    tags: await db.tag.count(),
    speakers: await db.speaker.count(),
    speakersPublished: await db.speaker.count({ where: { published: true } }),
    speakersWithoutPhoto: (await db.speaker.findMany({ where: { photoId: null }, select: { name: true } })).map((s) => s.name),
    partners: await db.partner.count(),
    testimonials: await db.testimonial.count(),
    events: await db.event.count(),
    sessions: await db.eventSession.count(),
    menus: await db.menu.count(),
    menuItems: await db.menuItem.count(),
    redirects: await db.redirect.count(),
    postsWithoutFeaturedImage: (await db.post.findMany({ where: { featuredImageId: null, locale: "en" }, select: { slug: true } })).map((p) => p.slug),
  };
  console.log(JSON.stringify({ local, ...(process.argv.includes("--live") ? { live: await liveCounts() } : {}) }, null, 2));
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
