#!/usr/bin/env node
/**
 * Run one command with the variables from an env file (e.g. production), without printing them.
 * Values from the file override the shell and the local .env (dotenv never overrides set vars).
 *
 *   node scripts/with-env.cjs .env.neon-production -- npm run db:migrate
 *   node scripts/with-env.cjs .env.neon-production --use DATABASE_URL_UNPOOLED=DATABASE_URL -- npm run db:migrate
 *
 * --use A=B  copies variable A from the file into B for this run (e.g. a direct connection
 * for migrations).
 */
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const { parse } = require("dotenv");

const args = process.argv.slice(2);
const sep = args.indexOf("--");
if (sep < 1 || sep === args.length - 1) {
  console.error("Usage: node scripts/with-env.cjs <env-file> [--use A=B] -- <command> [args]");
  process.exit(2);
}
const file = args[0];
const vars = parse(fs.readFileSync(file));
for (let i = 1; i < sep; i++) {
  if (args[i] === "--use" && args[i + 1]) {
    const [from, to] = args[++i].split("=");
    if (!vars[from]) throw new Error(`${from} is not set in ${file}`);
    vars[to] = vars[from];
  }
}
// Empty values in the file must not leave a local value in place (e.g. NEXT_PUBLIC_MEDIA_BASE_URL).
const env = { ...process.env, ...vars };
const [cmd, ...rest] = args.slice(sep + 1);
console.error(`[with-env] ${Object.keys(vars).length} variables from ${file} → ${cmd} ${rest.join(" ")}`);
const r = spawnSync(cmd, rest, { stdio: "inherit", env, shell: process.platform === "win32" });
process.exit(r.status ?? 1);
