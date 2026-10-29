import { describe, expect, it } from "vitest";
import { localizeHref, localizePath } from "@/lib/i18n";
import { FORMS, formValidator } from "@/lib/forms/definitions";
import { can, canEditPost } from "@/lib/auth/permissions";
import { settingsSchemas, tr } from "@/lib/settings-schema";
import { detectType, UploadError } from "@/lib/media/process";

describe("localized URLs", () => {
  it("prefixes French paths and keeps trailing slashes", () => {
    expect(localizePath("", "en")).toBe("/");
    expect(localizePath("", "fr")).toBe("/fr/");
    expect(localizePath("about", "fr")).toBe("/fr/about/");
    expect(localizePath("/speakers/x/", "en")).toBe("/speakers/x/");
  });
  it("localizes internal links only", () => {
    expect(localizeHref("/registration/", "fr")).toBe("/fr/registration/");
    expect(localizeHref("/fr/about/", "fr")).toBe("/fr/about/");
    expect(localizeHref("https://x.com", "fr")).toBe("https://x.com");
    expect(localizeHref("/media/uploads/a.pdf", "fr")).toBe("/media/uploads/a.pdf");
    expect(localizeHref("/about/#team", "fr")).toBe("/fr/about/#team");
    expect(localizeHref("/about/", "en")).toBe("/about/");
  });
});

describe("form validation", () => {
  const contact = formValidator(FORMS.contact);
  const valid = { firstName: "Ada", lastName: "Obi", phone: "+33 6", email: "ada@example.com", profile: "investor", inquiryType: "general", message: "" };
  it("accepts a valid contact submission (message optional, as on the original form)", () => {
    expect(contact.safeParse(valid).success).toBe(true);
  });
  it("rejects missing required fields, bad emails and unknown options", () => {
    expect(contact.safeParse({ ...valid, firstName: "" }).success).toBe(false);
    expect(contact.safeParse({ ...valid, email: "nope" }).success).toBe(false);
    expect(contact.safeParse({ ...valid, profile: "hacker" }).success).toBe(false);
  });
  it("has French labels for every field and option", () => {
    for (const def of Object.values(FORMS)) {
      for (const f of def.fields) {
        expect(f.label.fr, `${def.key}.${f.name}`).toBeTruthy();
        f.options?.forEach((o) => expect(o.label.fr).toBeTruthy());
      }
    }
  });
});

describe("permissions", () => {
  it("follows the WordPress-like role model", () => {
    expect(can("ADMIN", "users.manage")).toBe(true);
    expect(can("EDITOR", "users.manage")).toBe(false);
    expect(can("EDITOR", "content.publish")).toBe(true);
    expect(can("AUTHOR", "content.publish")).toBe(false);
    expect(can("AUTHOR", "pages.manage")).toBe(false);
  });
  it("lets authors edit only their own unpublished posts", () => {
    const author = { id: "u1", role: "AUTHOR" as const };
    expect(canEditPost(author, { authorId: "u1", status: "DRAFT" })).toBe(true);
    expect(canEditPost(author, { authorId: "u2", status: "DRAFT" })).toBe(false);
    expect(canEditPost(author, { authorId: "u1", status: "PUBLISHED" })).toBe(false);
    expect(canEditPost({ id: "e", role: "EDITOR" }, { authorId: "u2", status: "PUBLISHED" })).toBe(true);
  });
});

describe("settings", () => {
  it("parses empty documents to safe defaults", () => {
    for (const schema of Object.values(settingsSchemas)) expect(schema.safeParse({}).success).toBe(true);
  });
  it("falls back to English when French is empty", () => {
    expect(tr({ en: "Register", fr: "" }, "fr")).toBe("Register");
    expect(tr({ en: "Register", fr: "S'inscrire" }, "fr")).toBe("S'inscrire");
  });
  it("rejects invalid analytics ids", () => {
    expect(settingsSchemas.analytics.safeParse({ gaMeasurementId: "<script>" }).success).toBe(false);
  });
});

describe("upload type detection", () => {
  it("detects real file types from content", () => {
    expect(detectType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.mime).toBe("image/png");
    expect(detectType(Buffer.from("%PDF-1.7 ..."))?.mime).toBe("application/pdf");
    expect(detectType(Buffer.from("<html><script>"))).toBeNull();
  });
  it("accepts clean SVG and rejects SVG with scripts", () => {
    expect(detectType(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>`))?.mime).toBe("image/svg+xml");
    expect(() => detectType(Buffer.from(`<svg onload="alert(1)"></svg>`))).toThrow(UploadError);
    expect(() => detectType(Buffer.from(`<svg><script>alert(1)</script></svg>`))).toThrow(UploadError);
  });
});
