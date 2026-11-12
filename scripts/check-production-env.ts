/**
 * Read-only connectivity check for a production env file (default: .env.neon-production).
 * Prints which variables are set and whether the database and bucket answer. Never prints
 * values and never writes anything.
 *
 *   npx tsx scripts/check-production-env.ts [path-to-env-file]
 */
import fs from "node:fs";
import { parse } from "dotenv";
import pg from "pg";
import { S3Client, HeadBucketCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const file = process.argv[2] ?? ".env.neon-production";
const env = parse(fs.readFileSync(file));
const required = ["DATABASE_URL", "SITE_URL", "APP_SECRET", "SETUP_TOKEN", "CRON_SECRET", "STORAGE_DRIVER", "S3_BUCKET", "S3_ENDPOINT", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];
const optional = ["EMAIL_FROM", "SES_ACCESS_KEY_ID", "SES_SECRET_ACCESS_KEY", "SES_REGION", "SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM", "NOTIFY_EMAIL", "ADMIN_EMAIL", "ADMIN_NAME", "ADMIN_PASSWORD"];

console.log(`Checking ${file}`);
for (const k of [...required, ...optional]) console.log(`  ${required.includes(k) ? "required" : "optional"}  ${k.padEnd(22)} ${env[k] ? "set" : "MISSING"}`);

async function main() {
  try {
    const client = new pg.Client({ connectionString: env.DATABASE_URL });
    await client.connect();
    const r = await client.query("select current_database() db, version() v, (select count(*) from information_schema.tables where table_schema='public')::int tables");
    console.log(`Database: OK (${r.rows[0].db}, ${String(r.rows[0].v).split(" ").slice(0, 2).join(" ")}, ${r.rows[0].tables} tables in public)`);
    await client.end();
  } catch (e) {
    console.log("Database: FAILED -", e instanceof Error ? e.message : e);
  }
  try {
    const s3 = new S3Client({
      region: env.S3_REGION || "auto",
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: true,
      credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
    });
    await s3.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
    const list = await s3.send(new ListObjectsV2Command({ Bucket: env.S3_BUCKET, MaxKeys: 5 }));
    console.log(`Bucket: OK (${env.S3_BUCKET}, ${list.KeyCount ?? 0} object(s) in first page)`);
  } catch (e) {
    console.log("Bucket: FAILED -", e instanceof Error ? `${e.name}: ${e.message}` : e);
  }
}
main();
