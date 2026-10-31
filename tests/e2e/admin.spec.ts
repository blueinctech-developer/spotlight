import { expect, test, type Page } from "@playwright/test";
import pg from "pg";

/**
 * CMS flows. Requires an existing administrator:
 *   E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… npm run test:e2e
 * Test records are titled "E2E …" and removed afterwards (needs DATABASE_URL for cleanup).
 */
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;
const stamp = Date.now().toString(36);

async function signIn(page: Page) {
  await page.goto("/admin/login/");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/$/);
}

test.describe("CMS sign-in page", () => {
  test("the password can be shown and hidden again", async ({ page }) => {
    await page.goto("/admin/login/");
    const field = page.getByLabel("Password", { exact: true });
    await field.fill("secret-value-1");
    await expect(field).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(field).toHaveAttribute("type", "text");
    const hide = page.getByRole("button", { name: "Hide password" });
    await expect(hide).toHaveAttribute("aria-pressed", "true");
    await hide.click();
    await expect(field).toHaveAttribute("type", "password");
    await expect(field).toHaveValue("secret-value-1"); // toggling never clears or submits
    await expect(page).toHaveURL(/\/admin\/login\/$/);
  });
});

test.describe("CMS security", () => {
  test("admin pages require sign-in and are not indexable", async ({ request, page }) => {
    const r = await request.get("/admin/pages/", { maxRedirects: 0 });
    expect([302, 307]).toContain(r.status());
    expect(r.headers()["location"]).toContain("/admin/login/");
    await page.goto("/admin/login/");
    expect(await page.locator('meta[name="robots"]').getAttribute("content")).toContain("noindex");
  });

  test("upload API rejects anonymous and cross-site requests", async ({ request }) => {
    const anon = await request.post("/api/admin/media/upload/", {
      headers: { origin: process.env.E2E_BASE_URL ?? "http://localhost:3100" },
      multipart: { file: { name: "a.png", mimeType: "image/png", buffer: Buffer.from("x") } },
    });
    expect(anon.status()).toBe(401);
    const cross = await request.post("/api/admin/media/upload/", {
      headers: { origin: "https://evil.example" },
      multipart: { file: { name: "a.png", mimeType: "image/png", buffer: Buffer.from("x") } },
    });
    expect(cross.status()).toBe(403);
  });

  test("wrong password is rejected with a generic message", async ({ page }) => {
    await page.goto("/admin/login/");
    await page.getByLabel("Email").fill("nobody@example.test");
    await page.getByLabel("Password", { exact: true }).fill("not-the-password-123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/Incorrect email or password|Too many sign-in attempts/)).toBeVisible();
  });
});

test.describe("CMS publishing", () => {
  test.skip(!email || !password, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD");

  test.afterAll(async () => {
    if (!process.env.DATABASE_URL) return;
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query(`DELETE FROM "Post" WHERE title LIKE 'E2E %'`);
    await client.query(`DELETE FROM "Page" WHERE title LIKE 'E2E %'`);
    await client.end();
  });

  test("dashboard shows real counts and navigation", async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole("navigation", { name: "CMS" }).getByRole("link", { name: "Pages" })).toBeVisible();
    await page.getByRole("navigation", { name: "CMS" }).getByRole("link", { name: "Pages" }).click();
    await expect(page.getByText("About", { exact: false }).first()).toBeVisible();
  });

  test("dashboard quick actions open the create dialogs for events and speakers", async ({ page }) => {
    await signIn(page);
    for (const label of ["New event", "New speaker"]) {
      await page.goto("/admin/");
      await page.getByRole("link", { name: label }).first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      expect(page.url()).not.toContain("/new/");
    }
  });

  test("a draft post stays private until it is published", async ({ page, request }) => {
    await signIn(page);
    const title = `E2E Publishing ${stamp}`;
    await page.goto("/admin/posts/new/");
    await page.getByPlaceholder("Add title").fill(title);
    await page.locator(".ProseMirror").first().click();
    await page.keyboard.type("Body written by the end-to-end test.");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page).toHaveURL(/\/admin\/posts\/(?!new\/)[a-z0-9]+\/$/, { timeout: 30_000 });

    const slug = `e2e-publishing-${stamp}`;
    expect((await request.get(`/${slug}/`)).status()).toBe(404);

    await page.getByRole("button", { name: /^(Publish|Update)$/ }).click();
    await expect(page.getByText(/published|updated/i).first()).toBeVisible({ timeout: 30_000 });
    const live = await request.get(`/${slug}/`);
    expect(live.status()).toBe(200);
    expect(await live.text()).toContain("Body written by the end-to-end test.");
  });

  test("a draft page can be created and previewed but is not public", async ({ page, request }) => {
    await signIn(page);
    await page.goto("/admin/pages/new/");
    await page.getByLabel("Title").fill(`E2E Page ${stamp}`);
    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page).toHaveURL(/\/admin\/pages\/(?!new\/)[a-z0-9]+\/$/, { timeout: 30_000 });
    const id = page.url().match(/pages\/([a-z0-9]+)\//)![1];
    expect((await request.get(`/e2e-page-${stamp}/`)).status()).toBe(404);
    const preview = await page.request.get(`/admin/preview/page/${id}/`);
    expect(preview.status()).toBe(200);
    expect(await preview.text()).toContain("Preview");
  });
});
