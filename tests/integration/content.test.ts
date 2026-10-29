import { beforeEach, describe, expect, it } from "vitest";
import { db, resetDb } from "../support/db";
import { getMenus, getPublishedPage, listPublishedPosts, loadBlockData, blocksFrom } from "@/lib/content/public";
import { resolvePath } from "@/lib/content/resolve";
import { saveSetting, getSetting } from "@/lib/settings";
import { storage } from "@/lib/storage";

beforeEach(resetDb);

const day = 86400_000;

async function page(data: Partial<{ path: string; locale: "en" | "fr"; status: "DRAFT" | "PUBLISHED"; publishedAt: Date | null; deletedAt: Date | null; group: string; blocks: unknown[] }>) {
  return db.page.create({
    data: {
      translationGroup: data.group ?? `g-${Math.random()}`,
      locale: data.locale ?? "en",
      title: data.path || "Home",
      slug: data.path ?? "",
      path: data.path ?? "",
      status: data.status ?? "PUBLISHED",
      publishedAt: data.publishedAt === undefined ? new Date(Date.now() - day) : data.publishedAt,
      deletedAt: data.deletedAt ?? null,
      blocks: (data.blocks ?? []) as object[],
    },
  });
}

describe("publication visibility", () => {
  it("shows published pages and hides drafts, scheduled and trashed pages", async () => {
    await page({ path: "live" });
    await page({ path: "draft", status: "DRAFT" });
    await page({ path: "scheduled", publishedAt: new Date(Date.now() + day) });
    await page({ path: "trashed", deletedAt: new Date() });
    expect(await getPublishedPage("en", "live")).not.toBeNull();
    expect(await getPublishedPage("en", "draft")).toBeNull();
    expect(await getPublishedPage("en", "scheduled")).toBeNull();
    expect(await getPublishedPage("en", "trashed")).toBeNull();
  });

  it("returns hreflang alternates for published translations only", async () => {
    await page({ path: "about", group: "about" });
    await page({ path: "about", group: "about", locale: "fr" });
    const hit = await getPublishedPage("en", "about");
    expect(hit!.alternates.map((a) => a.href).sort()).toEqual(["/about/", "/fr/about/"]);
  });

  it("lists published posts by category with pagination", async () => {
    const cat = await db.category.create({ data: { slug: "press-release", name: "Press Release" } });
    for (let i = 0; i < 5; i++) {
      await db.post.create({
        data: {
          translationGroup: `p${i}`, title: `Post ${i}`, slug: `post-${i}`, status: i === 4 ? "DRAFT" : "PUBLISHED",
          publishedAt: new Date(Date.now() - (i + 1) * day), categories: { create: { categoryId: cat.id } },
        },
      });
    }
    const r = await listPublishedPosts({ locale: "en", categorySlug: "press-release", perPage: 3, page: 1 });
    expect(r.total).toBe(4);
    expect(r.totalPages).toBe(2);
    expect(r.posts.map((p) => p.slug)).toEqual(["post-0", "post-1", "post-2"]);
  });
});

describe("URL resolution (WordPress-compatible)", () => {
  it("resolves home, pages, posts, archives and pagination", async () => {
    await page({ path: "" });
    await page({ path: "press-releases", blocks: [{ id: "a", type: "postList" }] });
    await page({ path: "about" });
    await db.post.create({ data: { translationGroup: "x", title: "Hello", slug: "hello-world", status: "PUBLISHED", publishedAt: new Date("2018-09-28T10:00:00Z") } });
    await db.category.create({ data: { slug: "updates", name: "Updates" } });

    expect((await resolvePath("en", [])).type).toBe("page");
    expect((await resolvePath("en", ["about"])).type).toBe("page");
    expect((await resolvePath("en", ["hello-world"])).type).toBe("post");
    expect((await resolvePath("en", ["press-releases", "page", "2"])).type).toBe("page");
    expect((await resolvePath("en", ["about", "page", "2"])).type).toBe("notFound");
    expect((await resolvePath("en", ["category", "updates"])).type).toBe("archive");
    expect((await resolvePath("en", ["2018", "09"])).type).toBe("archive");
    expect((await resolvePath("en", ["2018", "13"])).type).toBe("notFound");
    expect((await resolvePath("en", ["missing"])).type).toBe("notFound");
  });

  it("follows database redirects", async () => {
    await db.redirect.create({ data: { fromPath: "/old-page/", toPath: "/about/", statusCode: 301 } });
    expect(await resolvePath("en", ["old-page"])).toEqual({ type: "redirect", to: "/about/", permanent: true });
  });
});

describe("block data loading", () => {
  it("loads referenced media, partners and speakers in batches and skips hidden blocks", async () => {
    const m = await db.mediaAsset.create({ data: { storageKey: "uploads/t/a.png", filename: "a.png", mimeType: "image/png", size: 1, alt: "A", altFr: "A fr" } });
    const p = await db.partner.create({ data: { slug: "acme", name: "Acme", logoId: m.id } });
    const unpublished = await db.partner.create({ data: { slug: "hidden", name: "Hidden", published: false } });
    const blocks = blocksFrom([
      { id: "1", type: "image", image: m.id },
      { id: "2", type: "partners", groups: [{ heading: "", partnerIds: [p.id, unpublished.id] }] },
      { id: "3", type: "heading", text: "secret", hidden: true },
    ]);
    expect(blocks).toHaveLength(2);
    const data = await loadBlockData(blocks, "fr");
    expect(data.media[m.id].alt).toBe("A fr");
    expect(Object.keys(data.partners)).toEqual([p.id]);
  });
});

describe("menus", () => {
  it("links menu items to pages by translation group and hides links to unpublished pages", async () => {
    await page({ path: "about", group: "about" });
    await page({ path: "a-propos", group: "about", locale: "fr" });
    await page({ path: "draft", group: "draft", status: "DRAFT" });
    for (const locale of ["en", "fr"] as const) {
      const menu = await db.menu.create({ data: { location: "header", locale, name: "Main" } });
      await db.menuItem.createMany({
        data: [
          { menuId: menu.id, label: "About", pageGroup: "about", order: 0 },
          { menuId: menu.id, label: "Draft", pageGroup: "draft", order: 1 },
          { menuId: menu.id, label: "External", url: "https://flickr.com", order: 2 },
          { menuId: menu.id, label: "Bad", url: "javascript:alert(1)", order: 3 },
        ],
      });
    }
    const en = await getMenus("en");
    expect(en.header.items.map((i) => [i.label, i.href])).toEqual([["About", "/about/"], ["External", "https://flickr.com"], ["Bad", "#"]]);
    const fr = await getMenus("fr");
    expect(fr.header.items[0].href).toBe("/fr/a-propos/");
  });
});

describe("settings", () => {
  it("validates and stores settings documents", async () => {
    await saveSetting("social", { facebook: "https://facebook.com/x" });
    expect((await getSetting("social")).facebook).toBe("https://facebook.com/x");
    await expect(saveSetting("social", { facebook: "not a url" })).rejects.toThrow();
  });
});

describe("local storage driver", () => {
  it("writes, reads and deletes objects, refusing unsafe keys", async () => {
    const s = storage();
    await s.put("uploads/test/hello.txt", Buffer.from("hi"), "text/plain");
    expect(await s.exists("uploads/test/hello.txt")).toBe(true);
    const got = await s.get("uploads/test/hello.txt");
    expect(await new Response(got!.body).text()).toBe("hi");
    await s.delete("uploads/test/hello.txt");
    expect(await s.exists("uploads/test/hello.txt")).toBe(false);
    await expect(s.put("../escape.txt", Buffer.from("x"), "text/plain")).rejects.toThrow();
  });
});
