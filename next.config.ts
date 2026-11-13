import type { NextConfig } from "next";

const mediaBase = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
const mediaHost = (() => {
  try {
    return mediaBase ? new URL(mediaBase) : null;
  } catch {
    return null;
  }
})();

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Baseline policy: no plugins, no <base> hijacking, no framing by other sites, and any stray
  // http:// asset is upgraded (the old site relied on this too). Script sources are not
  // restricted yet because embeds (YouTube, Google Forms, Weezevent) and analytics need them.
  {
    key: "Content-Security-Policy",
    value: [
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      ...((process.env.SITE_URL ?? "").startsWith("https://") ? ["upgrade-insecure-requests"] : []),
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // WordPress URLs end with a slash; keeping it avoids a redirect on every legacy link.
  trailingSlash: true,
  poweredByHeader: false,
  // Classic ISR caching model (see docs/ARCHITECTURE.md, "Caching").
  cacheComponents: false,
  partialPrefetching: false,
  serverExternalPackages: ["@node-rs/argon2", "sharp"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // 90 is used for photos (crisper detail, fewer compression artefacts); 75 stays the default.
    qualities: [75, 90],
    // Optimised images are cached for a month (originals are immutable: new uploads get new keys).
    minimumCacheTTL: 2592000,
    remotePatterns: [
      ...(mediaHost
        ? [{ protocol: mediaHost.protocol.replace(":", "") as "http" | "https", hostname: mediaHost.hostname }]
        : []),
      { protocol: "https", hostname: "img.youtube.com" },
    ],
    localPatterns: [{ pathname: "/media/**" }, { pathname: "/brand/**" }],
  },
  // Legacy WordPress URLs (see docs/MIGRATION_MAP.md). Editor-managed redirects live in the database.
  async redirects() {
    const rules: [string, string][] = [
      ["/events/spotlight-nigeria-2023", "/2023-programme2/"],
      ["/events/:slug*", "/programme/"],
      ["/events_cat/:slug*", "/programme/"],
      ["/events_tag/:slug*", "/programme/"],
      ["/organizers/:slug*", "/about/"],
      ["/speakers/ralph-edwards", "/speakers/"],
      ["/speakers/ralph-edwards-2", "/speakers/"],
      ["/schedule-list", "/2023-programme2/"],
      ["/schedule-horizontal-tab", "/programme/"],
      ["/schedule-timeline", "/programme/"],
      ["/digital-conference", "/programme/"],
      ["/education-webinar", "/programme/"],
      ["/new/sponsorship-registration", "/sponsorship-registration/"],
      ["/home", "/"],
    ];
    const withSlash = (s: string) => (s.endsWith("*") ? s : `${s}/`);
    return [
      ...rules.flatMap(([from, to]) => [
        { source: withSlash(from), destination: to, permanent: true },
        { source: withSlash(`/fr${from}`), destination: to === "/" ? "/fr/" : `/fr${to}`, permanent: true },
      ]),
      { source: "/:path*/page/1/", destination: "/:path*/", permanent: true },
      // WordPress/Yoast sitemap URLs (the index may be registered in Search Console).
      ...[
        "sitemap_index", "wp-sitemap", "post-sitemap", "page-sitemap", "speakers-sitemap", "category-sitemap",
        "post_tag-sitemap", "author-sitemap", "organizers-sitemap", "events-sitemap", "events_cat-sitemap",
        "events_tag-sitemap", "hf_template-sitemap",
      ].map((name) => ({ source: `/${name}.xml`, destination: "/sitemap.xml", permanent: true })),
      { source: "/index.php", destination: "/", permanent: true },
      // Old image/document links (Google Images, shared posts, emails). Migrated files keep their
      // WordPress path under /media/uploads/. WordPress resized copies ("photo-300x200.jpg") were not
      // migrated, so they go to the original file.
      {
        source: "/wp-content/uploads/:dir(.*)/:name([^/]+)-:size(\\d+x\\d+).:ext(jpe?g|png|gif|webp|JPE?G|PNG)",
        destination: "/media/uploads/:dir/:name.:ext",
        permanent: true,
      },
      { source: "/wp-content/uploads/:path(.*)", destination: "/media/uploads/:path", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
