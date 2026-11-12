import "server-only";
import { z } from "zod";

/**
 * Server environment. Read lazily so that `next build` works without secrets;
 * each feature validates the variables it needs when it is first used.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  SITE_URL: z.string().url().default("http://localhost:3000"),
  /** Secret used to hash IPs for submissions and rate limits. */
  APP_SECRET: z.string().min(32).optional(),
  // Storage: "local" (development only) or "s3" (any S3-compatible service: AWS, R2, B2, MinIO...)
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  /** Public base URL that serves bucket objects (CDN or bucket public URL). If unset, media is proxied via /media/. */
  NEXT_PUBLIC_MEDIA_BASE_URL: z.string().url().optional(),
  // Email. Amazon SES (API keys) is used when SES_* are set, otherwise SMTP.
  // If neither is set, submissions are stored but notification emails are not sent.
  EMAIL_FROM: z.string().optional(),
  SES_ACCESS_KEY_ID: z.string().optional(),
  SES_SECRET_ACCESS_KEY: z.string().optional(),
  SES_REGION: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  NOTIFY_EMAIL: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;
export function env(): Env {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}

export function siteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function appSecret(): string {
  const s = process.env.APP_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_SECRET must be set (at least 32 characters) in production");
  }
  return "development-only-secret-do-not-use-in-production!!";
}
