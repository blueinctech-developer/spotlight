import { describe, expect, it } from "vitest";
import { rewriteLinks, SITE, toSiteUrl } from "../../scripts/migration/context";

describe("migration link normalisation", () => {
  it("treats http, www and the old hosting mirror as the site itself", () => {
    expect(toSiteUrl("http://spotlightnigeria-france.com/about/")).toBe(`${SITE}/about/`);
    expect(toSiteUrl("https://www.spotlightnigeria-france.com/registration/")).toBe(`${SITE}/registration/`);
    expect(toSiteUrl("https://172.104.245.184/~friends1/spotlightnigeria-france.com/")).toBe(`${SITE}/`);
    expect(toSiteUrl("https://www.weezevent.com/x")).toBe("https://www.weezevent.com/x");
  });
  it("skips WordPress's own redirects, in both languages", () => {
    expect(toSiteUrl("/new/sponsorship-registration/")).toBe(`${SITE}/sponsorship-registration/`);
    expect(toSiteUrl("/fr/new/sponsorship-registration")).toBe(`${SITE}/fr/sponsorship-registration/`);
    expect(toSiteUrl("/about/")).toBe("/about/");
  });
  it("makes internal links in imported HTML site-relative", () => {
    const html = rewriteLinks('<p><a href="https://172.104.245.184/~friends1/spotlightnigeria-france.com/">here</a> <a href="https://example.org/">x</a></p>');
    expect(html).toContain('href="/"');
    expect(html).toContain('href="https://example.org/"');
  });
});
