import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { MAX_UPLOAD_BYTES, replaceUpload, storeUpload, UploadError } from "@/lib/media/process";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { mediaUrl } from "@/lib/media-url";
import { revalidatePublic } from "@/lib/admin/action";

function sameOrigin(origin: string | null, host: string | null): boolean {
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false; // e.g. "Origin: null"
  }
}

/**
 * Multipart upload: field "file" (and optional "alt"), or "replace=<id>" to swap a file.
 * Authenticated, capability-checked, rate limited and same-origin only.
 */
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!sameOrigin(origin, host)) {
    return NextResponse.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!can(user.role, "media.upload")) return NextResponse.json({ error: "You cannot upload media." }, { status: 403 });

  const limit = await rateLimit(`upload:${user.id}`, 120, 3600);
  if (!limit.allowed) return NextResponse.json({ error: "Upload limit reached. Try again later." }, { status: 429 });

  // A declared length is required: without it (chunked encoding) the body could be any size.
  const length = Number(req.headers.get("content-length") ?? NaN);
  if (!Number.isFinite(length) || length <= 0) return NextResponse.json({ error: "Upload size is missing." }, { status: 411 });
  if (length > MAX_UPLOAD_BYTES + 1024 * 64) return NextResponse.json({ error: "File too large (max 15 MB)." }, { status: 413 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const replaceId = form.get("replace");
    if (typeof replaceId === "string" && replaceId) {
      if (!can(user.role, "media.manage")) return NextResponse.json({ error: "You cannot replace media." }, { status: 403 });
      const asset = await replaceUpload(replaceId, buffer, file.name);
      revalidatePublic();
      await audit({ userId: user.id, action: "media.replace", entityType: "MEDIA", entityId: asset.id, summary: `Replaced file of ${asset.filename}` });
      return NextResponse.json({ asset: { ...asset, url: mediaUrl(asset.storageKey) } });
    }
    const alt = typeof form.get("alt") === "string" ? String(form.get("alt")).slice(0, 300) : "";
    const asset = await storeUpload({ buffer, filename: file.name, userId: user.id, alt });
    await audit({ userId: user.id, action: "media.upload", entityType: "MEDIA", entityId: asset.id, summary: `Uploaded ${asset.filename}` });
    return NextResponse.json({ asset: { ...asset, url: mediaUrl(asset.storageKey) } }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) return NextResponse.json({ error: err.message }, { status: 422 });
    console.error("upload failed", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
