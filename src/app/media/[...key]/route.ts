import { storage } from "@/lib/storage";
import { db } from "@/lib/db";

/**
 * Serves stored media when no public bucket/CDN URL is configured (NEXT_PUBLIC_MEDIA_BASE_URL).
 * Only keys registered in the media library are served.
 */
export async function GET(_req: Request, ctx: RouteContext<"/media/[...key]">) {
  const { key } = await ctx.params;
  const storageKey = key.map(decodeURIComponent).join("/");
  if (!/^[a-z0-9][a-z0-9/_.-]*$/i.test(storageKey) || storageKey.includes("..")) {
    return new Response("Not found", { status: 404 });
  }
  const asset = await db.mediaAsset.findUnique({ where: { storageKey }, select: { mimeType: true, size: true, filename: true } });
  if (!asset) return new Response("Not found", { status: 404 });
  const obj = await storage().get(storageKey);
  if (!obj) return new Response("Not found", { status: 404 });
  const isDoc = !asset.mimeType.startsWith("image/") && !asset.mimeType.startsWith("video/");
  return new Response(obj.body, {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(obj.size ?? asset.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      // SVGs and documents are never rendered inline as active content on our origin.
      ...(asset.mimeType === "image/svg+xml" ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" } : {}),
      ...(isDoc ? { "Content-Disposition": `inline; filename="${asset.filename.replace(/[^\w.-]/g, "_")}"` } : {}),
    },
  });
}
