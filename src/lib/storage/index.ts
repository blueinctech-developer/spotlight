import "server-only";
import path from "node:path";
import { promises as fs } from "node:fs";
import { Readable } from "node:stream";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream; contentType?: string; size?: number } | null>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}

function assertSafeKey(key: string) {
  if (!/^[a-z0-9][a-z0-9/_.-]*$/i.test(key) || key.includes("..")) {
    throw new Error(`Unsafe storage key: ${key}`);
  }
}

/** Development driver: files under .data/uploads. Not for production (ephemeral disks, no replication). */
class LocalDriver implements StorageDriver {
  constructor(private root: string) {}
  private file(key: string) {
    assertSafeKey(key);
    return path.join(this.root, ...key.split("/"));
  }
  async put(key: string, body: Buffer) {
    const f = this.file(key);
    await fs.mkdir(path.dirname(f), { recursive: true });
    await fs.writeFile(f, body);
  }
  async get(key: string) {
    try {
      const f = this.file(key);
      const stat = await fs.stat(f);
      const { createReadStream } = await import("node:fs");
      return { body: Readable.toWeb(createReadStream(f)) as ReadableStream, size: stat.size };
    } catch {
      return null;
    }
  }
  async exists(key: string) {
    try {
      await fs.access(this.file(key));
      return true;
    } catch {
      return false;
    }
  }
  async delete(key: string) {
    await fs.rm(this.file(key), { force: true });
  }
}

class S3Driver implements StorageDriver {
  private client: S3Client;
  constructor(private bucket: string) {
    this.client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: Boolean(process.env.S3_ENDPOINT),
      credentials:
        process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
          ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
          : undefined,
    });
  }
  async put(key: string, body: Buffer, contentType: string) {
    assertSafeKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
        // Served straight from the bucket/CDN there is no sandbox CSP, so an SVG opened on its
        // own is downloaded rather than rendered as a page. <img> tags are unaffected.
        ...(contentType === "image/svg+xml" ? { ContentDisposition: "attachment" } : {}),
      }),
    );
  }
  async get(key: string) {
    assertSafeKey(key);
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!res.Body) return null;
      return {
        body: res.Body.transformToWebStream(),
        contentType: res.ContentType,
        size: res.ContentLength,
      };
    } catch {
      return null;
    }
  }
  async exists(key: string) {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
  async delete(key: string) {
    assertSafeKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

let driver: StorageDriver | null = null;

export function storage(): StorageDriver {
  if (driver) return driver;
  const kind = process.env.STORAGE_DRIVER || "local";
  if (kind === "s3") {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) throw new Error("S3_BUCKET is required when STORAGE_DRIVER=s3");
    driver = new S3Driver(bucket);
  } else {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_STORAGE !== "true") {
      throw new Error(
        "Local media storage is disabled in production. Configure STORAGE_DRIVER=s3 (see docs/DEPLOYMENT.md).",
      );
    }
    driver = new LocalDriver(process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), ".data", "uploads"));
  }
  return driver;
}
