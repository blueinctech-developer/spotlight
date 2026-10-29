import { describe, expect, it } from "vitest";
import { htmlToText, safeHref, sanitizeRichText, truncate } from "@/lib/sanitize";

describe("sanitizeRichText", () => {
  it("removes scripts, event handlers and inline styles", () => {
    const out = sanitizeRichText(`<p onclick="x()" style="color:red">Hi<script>alert(1)</script></p><img src=x onerror=alert(1)>`);
    expect(out).not.toMatch(/script|onclick|onerror|style=/i);
    expect(out).toContain("<p>Hi</p>");
  });

  it("drops javascript: and data: links", () => {
    expect(sanitizeRichText(`<a href="javascript:alert(1)">x</a>`)).toBe("<a>x</a>");
    expect(sanitizeRichText(`<a href="data:text/html,hi">x</a>`)).toBe("<a>x</a>");
  });

  it("adds rel to links opening in a new tab and strips target otherwise", () => {
    expect(sanitizeRichText(`<a href="https://a.com" target="_blank">x</a>`)).toBe(`<a href="https://a.com" target="_blank" rel="noopener noreferrer">x</a>`);
    expect(sanitizeRichText(`<a href="/x/" target="_self">x</a>`)).toBe(`<a href="/x/">x</a>`);
  });

  it("removes iframes and forms", () => {
    expect(sanitizeRichText(`<iframe src="https://evil"></iframe><form><input></form>ok`)).toBe("ok");
  });

  it("keeps allowed formatting", () => {
    const html = "<h2>T</h2><ul><li><strong>a</strong></li></ul><blockquote>q</blockquote>";
    expect(sanitizeRichText(html)).toBe(html);
  });
});

describe("safeHref", () => {
  it.each([
    ["/about/", "/about/"],
    ["#section", "#section"],
    ["https://example.com", "https://example.com"],
    ["mailto:a@b.c", "mailto:a@b.c"],
    ["tel:+33", "tel:+33"],
    ["javascript:alert(1)", "#"],
    ["//evil.com", "#"],
    ["/\\evil.com", "#"],
    ["", "#"],
  ])("%s → %s", (input, expected) => expect(safeHref(input)).toBe(expected));
});

describe("text helpers", () => {
  it("converts html to plain text", () => {
    expect(htmlToText("<p>Hello&nbsp;<b>world</b></p>")).toBe("Hello world");
  });
  it("truncates on a word boundary", () => {
    expect(truncate("one two three four", 9)).toBe("one two…");
  });
});
