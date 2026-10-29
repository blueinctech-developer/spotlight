import { expect, test } from "@playwright/test";

const PAGES = ["/", "/about/", "/programme/", "/registration/", "/previous-editions/", "/press-releases/", "/get-in-touch/", "/sponsorship-registration/", "/press-registration/", "/gallery/", "/speakers/", "/privacy-policy/", "/2023-programme2/"];

test.describe("public site", () => {
  for (const path of PAGES) {
    test(`renders ${path} in EN and FR without horizontal overflow`, async ({ page }) => {
      for (const p of [path, path === "/" ? "/fr/" : `/fr${path}`]) {
        const res = await page.goto(p);
        expect(res?.status(), p).toBe(200);
        await expect(page.locator("main#content")).toBeVisible();
        await expect(page.locator("h1").first()).toBeVisible();
        expect(await page.locator("html").getAttribute("lang")).toBe(p.startsWith("/fr") ? "fr-FR" : "en-US");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${p} horizontal overflow`).toBeLessThanOrEqual(1);
      }
    });
  }

  test("home page shows the forum hero, stats and partners", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Spotlight Nigeria" })).toBeVisible();
    await expect(page.getByText("TRANSLATING OPPORTUNITIES TO BUSINESS DEALS")).toBeVisible();
    await expect(page.getByText("Attendees")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Partners & Sponsors" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What participants say" })).toBeVisible();
  });

  test("has SEO metadata, hreflang and canonical", async ({ page }) => {
    await page.goto("/about/");
    await expect(page).toHaveTitle(/About/);
    expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toMatch(/\/about\/$/);
    expect(await page.locator('link[hreflang="fr-FR"]').getAttribute("href")).toMatch(/\/fr\/about\/$/);
    expect(await page.locator('meta[name="description"]').getAttribute("content")).toBeTruthy();
  });

  test("language switcher links to the equivalent French page", async ({ page, isMobile }) => {
    test.skip(isMobile, "footer dropdown tested on desktop");
    await page.goto("/about/");
    await page.getByRole("button", { name: /English/ }).click();
    await page.getByRole("link", { name: /Français/ }).click();
    await expect(page).toHaveURL(/\/fr\/about\/$/);
  });

  test("mobile menu opens, shows dropdown items and closes with Escape", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only");
    await page.goto("/");
    await page.getByRole("button", { name: "Menu" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Registrations" }).click();
    await expect(dialog.getByRole("link", { name: "Delegate Registration" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("legacy WordPress URLs redirect or return the right status", async ({ request }) => {
    const r1 = await request.get("/events/thursday-night-live-best-summer/", { maxRedirects: 0 });
    expect([301, 308]).toContain(r1.status());
    expect(r1.headers()["location"]).toContain("/programme/");
    const r2 = await request.get("/hf_template/footer/", { maxRedirects: 0 });
    expect(r2.status()).toBe(410);
    const r3 = await request.get("/this-page-does-not-exist/", { maxRedirects: 0 });
    expect(r3.status()).toBe(404);
    const r4 = await request.get("/en/about/", { maxRedirects: 0 });
    expect([301, 308]).toContain(r4.status());
  });

  test("WordPress feeds, sitemaps, search and URL variants keep working", async ({ request }) => {
    for (const p of ["/feed/", "/fr/feed/"]) {
      const feed = await request.get(p);
      expect(feed.status(), p).toBe(200);
      expect(feed.headers()["content-type"]).toContain("application/rss+xml");
      expect((await feed.text()).match(/<item>/g)?.length ?? 0, p).toBeGreaterThan(0);
    }
    for (const p of ["/sitemap_index.xml", "/wp-sitemap.xml", "/post-sitemap.xml"]) {
      const r = await request.get(p, { maxRedirects: 0 });
      expect([301, 308], p).toContain(r.status());
      expect(r.headers()["location"]).toMatch(/\/sitemap\.xml$/);
    }
    const search = await request.get("/?s=nigeria", { maxRedirects: 0 });
    expect(search.status()).toBe(301);
    expect(search.headers()["location"]).toContain("/search/?q=nigeria");
    const upper = await request.get("/REGISTRATION/", { maxRedirects: 0 });
    expect(upper.status()).toBe(301);
    expect(upper.headers()["location"]).toMatch(/\/registration\/$/);
    const index = await request.get("/index.php", { maxRedirects: 0 });
    expect([301, 308]).toContain(index.status());
  });

  test("the scheduled notification job cannot be triggered without its secret", async ({ request }) => {
    const r = await request.get("/api/cron/notifications/", { headers: { authorization: "Bearer wrong" } });
    expect([401, 503]).toContain(r.status());
  });

  test("structured data describes the site, posts and breadcrumbs", async ({ request }) => {
    const types = async (path: string) => {
      const html = await (await request.get(path)).text();
      return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])["@type"]);
    };
    expect(await types("/")).toEqual(expect.arrayContaining(["Organization", "WebSite"]));
    expect(await types("/france-to-boost-agribusiness-ties-in-nigeria/")).toEqual(expect.arrayContaining(["Article", "BreadcrumbList"]));
    expect(await types("/speakers/etienne-giros/")).toContain("BreadcrumbList");
    expect(await types("/about/")).toContain("BreadcrumbList");
  });

  test("header fits on one line at in-between widths, in both languages", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop widths");
    for (const width of [1024, 1100, 1280, 1366]) {
      await page.setViewportSize({ width, height: 800 });
      for (const path of ["/", "/fr/", "/fr/registration/"]) {
        await page.goto(path);
        const r = await page.evaluate(() => {
          const header = document.querySelector("header")!;
          const items = [...header.querySelectorAll<HTMLElement>('nav[aria-label="Main"] > ul > li > :first-child')];
          const parts = [header.querySelector("a[aria-label] img"), ...items, header.querySelector("a.btn")].filter(Boolean) as Element[];
          const boxes = parts.map((e) => e.getBoundingClientRect());
          return {
            wrappedLabels: items.filter((i) => i.getBoundingClientRect().height > 70).map((i) => i.textContent),
            outside: boxes.some((b) => b.left < 0 || b.right > innerWidth + 0.5),
            overlap: boxes.some((a, i) => boxes.slice(i + 1).some((b) => a.left < b.right - 0.5 && b.left < a.right - 0.5)),
            height: header.getBoundingClientRect().height,
          };
        });
        const where = `${path} at ${width}px`;
        expect(r.wrappedLabels, where).toEqual([]);
        expect(r.outside, `${where}: element outside the viewport`).toBe(false);
        expect(r.overlap, `${where}: header elements overlap`).toBe(false);
        expect(r.height, where).toBeLessThanOrEqual(125);
      }
    }
  });

  test("security headers are sent", async ({ request }) => {
    const r = await request.get("/");
    expect(r.headers()["content-security-policy"]).toContain("object-src 'none'");
    expect(r.headers()["x-content-type-options"]).toBe("nosniff");
    expect(r.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  });

  test("posts, archives and pagination resolve", async ({ page }) => {
    await page.goto("/press-releases/");
    const first = page.locator("article :is(h2, h3) a").first();
    const title = await first.textContent();
    const href = await first.getAttribute("href");
    await first.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title!.trim());
    expect((await page.goto("/press-releases/page/2/"))?.status()).toBe(200);
    expect((await page.goto("/category/press-release/"))?.status()).toBe(200);
    expect((await page.goto("/2018/09/"))?.status()).toBe(200);
  });

  test("sitemap and robots are served", async ({ request }) => {
    const sm = await request.get("/sitemap.xml");
    expect(sm.status()).toBe(200);
    expect(await sm.text()).toContain("/fr/about/");
    const rb = await request.get("/robots.txt");
    expect(await rb.text()).toContain("Disallow: /admin/");
  });

  test("contact form validates in the browser and on the server", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop only");
    await page.goto("/get-in-touch/");
    const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Submit" }) });
    await form.getByRole("button", { name: "Submit" }).click();
    // Native required validation keeps the user on the page with nothing sent.
    await expect(page.getByRole("status")).toHaveCount(0);
    await form.getByPlaceholder("First Name *").fill("E2E");
    await form.getByPlaceholder("Last Name *").fill("Test");
    await form.getByPlaceholder("Phone Number *").fill("+33 600000000");
    await form.getByPlaceholder("Email *").fill("e2e@example.test");
    await form.locator("select").nth(0).selectOption({ index: 1 });
    await form.locator("select").nth(1).selectOption({ index: 1 });
    await form.getByPlaceholder("Your message *").fill("Automated end-to-end test, please ignore.");
    await page.waitForTimeout(2000); // the anti-spam timer rejects instant submissions
    await form.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByRole("status")).toContainText("Thank you");
  });
});
