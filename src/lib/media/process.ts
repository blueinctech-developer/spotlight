import "server-only";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import sharp from "sharp";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Allowed uploads, identified by content (magic bytes), never by the client-supplied type. */
const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", ext: ".jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: ".png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/gif", ext: ".gif", test: (b) => b.subarray(0, 6).toString("ascii").startsWith("GIF8") },
  { mime: "image/webp", ext: ".webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
  { mime: "image/avif", ext: ".avif", test: (b) => b.subarray(4, 12).toString("ascii").startsWith("ftypavi") },
  { mime: "application/pdf", ext: ".pdf", test: (b) => b.subarray(0, 5).toString("ascii") === "%PDF-" },
];

export class UploadError extends Error {}

export function detectType(buf: Buffer): { mime: string; ext: string } | null {
  const sig = SIGNATURES.find((s) => s.test(buf));
  if (sig) return { mime: sig.mime, ext: sig.ext };
  // SVG: text-based. Accepted only when it contains no scripts or event handlers.
  const head = buf.subarray(0, 2048).toString("utf8").trim();
  if (/^(<\?xml[^>]*>\s*)?(<!DOCTYPE[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(head)) {
    if (!isSafeSvg(buf.toString("utf8"))) {
      throw new UploadError("This SVG contains scripts, links or external references and cannot be uploaded.");
    }
    return { mime: "image/svg+xml", ext: ".svg" };
  }
  return null;
}

/**
 * Conservative SVG check: logos and icons need none of these features. Character references
 * are decoded first so that e.g. "jav&#x61;script:" cannot slip through.
 */
export function isSafeSvg(raw: string): boolean {
  const decoded = raw
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&(colon|tab|newline);/gi, (_, n: string) => ({ colon: ":", tab: "\t", newline: "\n" })[n.toLowerCase() as "colon"]);
  const compact = decoded.replace(/[\s\u0000-\u001f]+/g, "");
  if (/<script|<foreignobject|<iframe|<embed|<object|<a[\s>/]|<!entity|<use[^>]+href=["'](?!#)/i.test(decoded)) return false;
  if (/\son[a-z]+\s*=/i.test(decoded)) return false;
  if (/javascript:|vbscript:|data:text\/html/i.test(compact)) return false;
  // Only internal (#id) and embedded raster image references are allowed.
  for (const m of decoded.matchAll(/(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi)) {
    const v = m[1].trim();
    if (!(v.startsWith("#") || /^data:image\/(png|jpe?g|gif|webp);/i.test(v))) return false;
  }
  return true;
}

function slugifyFilename(name: string): string {
  const base = path.basename(name, path.extname(name)).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  return base.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "file";
}

/** Validate, store and register an uploaded file. */
export async function storeUpload(input: { buffer: Buffer; filename: string; userId: string; alt?: string }) {
  if (input.buffer.length === 0) throw new UploadError("The file is empty.");
  if (input.buffer.length > MAX_UPLOAD_BYTES) throw new UploadError(`Files must be smaller than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);
  const type = detectType(input.buffer);
  if (!type) throw new UploadError("Unsupported file type. Upload JPG, PNG, GIF, WebP, AVIF, SVG or PDF files.");

  let width: number | null = null;
  let height: number | null = null;
  if (type.mime.startsWith("image/") && type.mime !== "image/svg+xml") {
    try {
      const meta = await sharp(input.buffer).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
    } catch {
      throw new UploadError("This image could not be read. It may be corrupted.");
    }
  }
  const now = new Date();
  const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const storageKey = `uploads/${folder}/${slugifyFilename(input.filename)}-${randomBytes(6).toString("hex")}${type.ext}`;
  await storage().put(storageKey, input.buffer, type.mime);
  return db.mediaAsset.create({
    data: {
      storageKey,
      filename: path.basename(input.filename).slice(0, 200),
      mimeType: type.mime,
      size: input.buffer.length,
      width,
      height,
      alt: input.alt ?? "",
      title: path.basename(input.filename, path.extname(input.filename)).slice(0, 200),
      sha256: createHash("sha256").update(input.buffer).digest("hex"),
      uploadedById: input.userId,
    },
  });
}

/** Replace the file behind an existing asset, keeping its id (and therefore every reference). */
export async function replaceUpload(id: string, buffer: Buffer, filename: string) {
  const asset = await db.mediaAsset.findUnique({ where: { id } });
  if (!asset) throw new UploadError("Media not found.");
  if (buffer.length > MAX_UPLOAD_BYTES) throw new UploadError("File too large.");
  const type = detectType(buffer);
  if (!type) throw new UploadError("Unsupported file type.");
  if (type.mime.split("/")[0] !== asset.mimeType.split("/")[0]) {
    throw new UploadError("The replacement must be the same kind of file (image for image, document for document).");
  }
  let width: number | null = null;
  let height: number | null = null;
  if (type.mime.startsWith("image/") && type.mime !== "image/svg+xml") {
    const meta = await sharp(buffer).metadata();
    width = meta.width ?? null;
    height = meta.height ?? null;
  }
  // New key so CDNs and browsers never serve the old cached file.
  const storageKey = asset.storageKey.replace(/(-[0-9a-f]{6,12})?\.\w+$/, `-${randomBytes(6).toString("hex")}${type.ext}`);
  await storage().put(storageKey, buffer, type.mime);
  // Records that point at the asset by id follow automatically; rich text and block JSON hold
  // the file's URL, so those are rewritten in the same transaction as the key change.
  const updated = await db.$transaction(async (tx) => {
    const row = await tx.mediaAsset.update({
      where: { id },
      data: { storageKey, mimeType: type.mime, size: buffer.length, width, height, filename: path.basename(filename).slice(0, 200), sha256: createHash("sha256").update(buffer).digest("hex") },
    });
    await rewriteMediaReferences(tx, asset.storageKey, storageKey);
    return row;
  });
  await storage().delete(asset.storageKey).catch(() => {});
  return updated;
}

type RawTx = { $executeRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<number> };

/** Replace every textual reference to an old storage key (URLs in rich text and block JSON). */
export async function rewriteMediaReferences(tx: RawTx, oldKey: string, newKey: string) {
  const like = `%${oldKey.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  let n = 0;
  n += await tx.$executeRaw`UPDATE "Post" SET "content" = replace("content", ${oldKey}, ${newKey}) WHERE "content" LIKE ${like}`;
  n += await tx.$executeRaw`UPDATE "Page" SET "blocks" = replace("blocks"::text, ${oldKey}, ${newKey})::jsonb WHERE "blocks"::text LIKE ${like}`;
  n += await tx.$executeRaw`UPDATE "Revision" SET "data" = replace("data"::text, ${oldKey}, ${newKey})::jsonb WHERE "data"::text LIKE ${like}`;
  n += await tx.$executeRaw`UPDATE "Speaker" SET "bio" = replace("bio", ${oldKey}, ${newKey}), "bioFr" = replace("bioFr", ${oldKey}, ${newKey}) WHERE "bio" LIKE ${like} OR "bioFr" LIKE ${like}`;
  n += await tx.$executeRaw`UPDATE "Event" SET "description" = replace("description", ${oldKey}, ${newKey}), "descriptionFr" = replace("descriptionFr", ${oldKey}, ${newKey}) WHERE "description" LIKE ${like} OR "descriptionFr" LIKE ${like}`;
  n += await tx.$executeRaw`UPDATE "EventSession" SET "description" = replace("description", ${oldKey}, ${newKey}), "descriptionFr" = replace("descriptionFr", ${oldKey}, ${newKey}) WHERE "description" LIKE ${like} OR "descriptionFr" LIKE ${like}`;
  n += await tx.$executeRaw`UPDATE "Setting" SET "value" = replace("value"::text, ${oldKey}, ${newKey})::jsonb WHERE "value"::text LIKE ${like}`;
  return n;
}
