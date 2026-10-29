import { describe, expect, it } from "vitest";
import { clientIpFrom } from "@/lib/client-ip";
import { detectType, isSafeSvg, UploadError } from "@/lib/media/process";
import { settingsSchemas } from "@/lib/settings-schema";

const headers = (h: Record<string, string>) => new Headers(h);

describe("client IP for rate limiting", () => {
  it("ignores a client-supplied left-most X-Forwarded-For entry", () => {
    // Nginx appends the real address; the first entry is whatever the client sent.
    expect(clientIpFrom(headers({ "x-forwarded-for": "1.1.1.1, 203.0.113.9" }), {})).toBe("203.0.113.9");
  });
  it("honours the number of trusted proxy hops", () => {
    expect(clientIpFrom(headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.9, 10.0.0.2" }), { TRUSTED_PROXY_HOPS: "2" })).toBe("203.0.113.9");
  });
  it("uses the platform header on Vercel and a named trusted header when configured", () => {
    expect(clientIpFrom(headers({ "x-forwarded-for": "6.6.6.6", "x-vercel-forwarded-for": "198.51.100.4" }), { VERCEL: "1" })).toBe("198.51.100.4");
    expect(clientIpFrom(headers({ "cf-connecting-ip": "198.51.100.7", "x-forwarded-for": "6.6.6.6" }), { TRUSTED_IP_HEADER: "CF-Connecting-IP" })).toBe("198.51.100.7");
  });
  it("falls back to x-real-ip, then 'unknown'", () => {
    expect(clientIpFrom(headers({ "x-real-ip": "192.0.2.1" }), {})).toBe("192.0.2.1");
    expect(clientIpFrom(headers({}), {})).toBe("unknown");
  });
});

describe("SVG upload check", () => {
  const svg = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${inner}</svg>`;
  it("accepts ordinary logos, internal references and embedded raster images", () => {
    expect(isSafeSvg(svg('<defs><linearGradient id="g"/></defs><rect fill="url(#g)"/><use xlink:href="#g"/>'))).toBe(true);
    expect(isSafeSvg(svg('<image href="data:image/png;base64,iVBORw0KGgo="/>'))).toBe(true);
  });
  it.each([
    ["script", "<script>alert(1)</script>"],
    ["event handler", '<rect onload="alert(1)"/>'],
    ["entity-encoded javascript: link", '<a href="jav&#x61;script:alert(1)"><rect/></a>'],
    ["decimal-encoded scheme in use", '<use href="&#106;avascript:alert(1)"/>'],
    ["external reference", '<use href="https://evil.example/sprite.svg#x"/>'],
    ["foreignObject", "<foreignObject><div/></foreignObject>"],
    ["entity declaration", '<!ENTITY x "y">'],
  ])("rejects %s", (_name, inner) => {
    expect(isSafeSvg(svg(inner))).toBe(false);
    expect(() => detectType(Buffer.from(svg(inner)))).toThrow(UploadError);
  });
});

describe("settings validation", () => {
  it("rejects javascript: URLs in social links and link fields", () => {
    expect(settingsSchemas.social.safeParse({ facebook: "javascript:alert(1)" }).success).toBe(false);
    expect(settingsSchemas.header.safeParse({ ctaHref: "javascript:alert(1)" }).success).toBe(false);
    expect(settingsSchemas.header.safeParse({ ctaHref: "//evil.example/" }).success).toBe(false);
    expect(settingsSchemas.privacy.safeParse({ privacyHref: "/privacy-policy/" }).success).toBe(true);
    expect(settingsSchemas.footerCta.safeParse({ buttonHref: "https://www.weezevent.com/x" }).success).toBe(true);
  });
  it("accepts the Google tag ID format used on the old site", () => {
    expect(settingsSchemas.analytics.safeParse({ gaMeasurementId: "GT-PJSNCJK7" }).success).toBe(true);
    expect(settingsSchemas.analytics.safeParse({ gaMeasurementId: "G-ABC123XYZ" }).success).toBe(true);
    expect(settingsSchemas.analytics.safeParse({ gaMeasurementId: "UA-1');alert(1);//" }).success).toBe(false);
  });
  it("only accepts a bare search-console verification code", () => {
    expect(settingsSchemas.seo.safeParse({ googleSiteVerification: "QNamKEFAiD7r3qW-Mp0yOL3ceJqIYb835GCD_8MQwc4" }).success).toBe(true);
    expect(settingsSchemas.seo.safeParse({ googleSiteVerification: '<meta name="google-site-verification" content="x">' }).success).toBe(false);
  });
});
