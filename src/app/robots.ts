import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { getSetting } from "@/lib/settings";

export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const seo = await getSetting("seo");
  if (seo.discourageIndexing) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/api/", "/search/", "/fr/search/"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
