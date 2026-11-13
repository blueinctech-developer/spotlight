/**
 * Import form submissions exported from the old WordPress site (Elementor → Submissions → Export,
 * one CSV per Elementor form) into FormSubmission, flagged source = "wordpress-import".
 *
 *   npm run migrate:submissions -- <folder-with-csvs>            dry run: reads the database, writes nothing
 *   npm run migrate:submissions -- <folder-with-csvs> --write    imports
 *   option --tz=Europe/Paris                                      timezone of the "Created At" column
 *
 * Idempotent: each row gets dedupeKey "wp:" + sha256(form, email, original timestamp), which is
 * unique in the database, so rows that already exist are skipped and the script can be re-run.
 * Imported rows never trigger emails (see notifySubmission) and arrive with status READ.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { FORMS } from "@/lib/forms/definitions";

const SOURCE = "wordpress-import";

// ── Reviewed by hand (export of 2026-11-13, Elementor submission IDs) ──────────────────────────
// Spam: bots, adverts, scams, adult/casino/SEO content. Test: the team testing the forms.
const EXCLUDE: Record<number, "spam" | "test"> = {
  ...Object.fromEntries(
    [117, 107, 106, 105, 104, 99, 95, 94, 92, 90, 89, 88, 87, 83, 78, 71, 70, 69, 64, 63, 62, 61, 58, 57, 56, 55, 54, 53,
     52, 51, 50, 48, 47, 46, 43, 42, 39, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 10, 9, 6, 5, 4, 3, // contact
     86, 85, 84, // sponsorship: throwaway address, "Sponsor" only
    ].map((id) => [id, "spam" as const]),
  ),
  // john@friendsofnigeria.net / okoro.jon@gmail.com ("Hello", "1 Billion USD") and the launch-day tests.
  ...Object.fromEntries([31, 30, 32, 33, 29, 2, 1].map((id) => [id, "test" as const])),
};

/** Elementor form ID → form on the new site. One form (dc9487e) was reused on several pages. */
function routeForm(formId: string, referrer: string): string {
  if (formId === "c4e8047") return "sponsorship";
  if (formId === "2cf2898") return "newsletter";
  if (formId === "0df6e2f") return "exhibition"; // no such form on the new site (yet)
  if (referrer.includes("/previous-editions")) return "report-download";
  if (referrer.includes("/press-registration")) return "press";
  return "contact";
}

// ── CSV ────────────────────────────────────────────────────────────────────────────────────────
/** RFC 4180 parser. Elementor writes \" inside quoted fields instead of "", so that is fixed first. */
function parseCsv(text: string): Record<string, string>[] {
  const s = text.replace(/^﻿/, "").replace(/\\"/g, '""');
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.some((v) => v !== ""));
  return body.map((r) => {
    if (r.length !== header.length) throw new Error(`Malformed CSV row (${r.length} columns, expected ${header.length}): ${r.slice(0, 3).join(" | ")}`);
    return Object.fromEntries(header.map((h, i) => [h.trim(), r[i]]));
  });
}

/** Elementor stores values JSON-escaped: literal \r\n, \/ … Turn them back into real characters. */
const unescape = (v: string | undefined) =>
  (v ?? "")
    .replace(/\\r\\n|\\n|\\r/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\//g, "/")
    .replace(/\\\\/g, "\\")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

/** "2024-03-12 22:53:25" in the given timezone → UTC Date. */
function zonedToUtc(local: string, tz: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(local.trim());
  if (!m) throw new Error(`Unexpected date: ${local}`);
  const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  const offsetAt = (t: number) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
        .formatToParts(new Date(t)).map((x) => [x.type, x.value]),
    );
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - t;
  };
  let t = asUtc - offsetAt(asUtc);
  t = asUtc - offsetAt(t); // second pass settles daylight-saving boundaries
  return new Date(t);
}

// ── Mapping to the new forms' field names ──────────────────────────────────────────────────────
const norm = (v: string) => v.toLowerCase().replace(/\s*\/\s*/g, "/").replace(/\s+/g, " ").trim();
const ALIASES: Record<string, string> = { "entrepreneur/entrepreneur/startup": "entrepreneur", goverment: "government" };
/** Old option label → value of the matching option on the new form (raw label if none matches). */
function selectValue(formKey: string, field: string, label: string): string {
  if (!label) return "";
  const n = norm(label);
  const f = FORMS[formKey as keyof typeof FORMS]?.fields.find((x) => x.name === field);
  const hit = f?.options?.find((o) => norm(o.label.en) === n || o.value === n || o.value === ALIASES[n]);
  return hit?.value ?? label;
}

function mapRow(form: string, r: Record<string, string>): { name: string | null; data: Record<string, string> } {
  const v = (k: string) => unescape(r[k]);
  const person = { firstName: v("Name"), lastName: v("Last Name *"), phone: v("Phone Number *"), email: v("Email") };
  const full = [person.firstName, person.lastName].filter(Boolean).join(" ") || null;
  switch (form) {
    case "contact":
      return { name: full, data: { ...person, profile: selectValue("contact", "profile", v("Which best describes you? *")), inquiryType: selectValue("contact", "inquiryType", v("Inquiry Type *")), message: v("Message") } };
    case "report-download":
      return { name: full, data: { ...person, industry: selectValue("report-download", "industry", v("Which best describes you? *")) } };
    case "press":
      // Same Elementor fields reused: that column held "Fluent in English?", Message held the terms checkbox.
      return { name: full, data: { ...person, "Fluent in English?": v("Which best describes you? *"), "Accepted terms": v("Message") === "on" ? "Yes" : v("Message") } };
    case "sponsorship":
      return { name: v("Your Name") || null, data: { name: v("Your Name"), company: v("Company name"), email: v("Email"), message: v("Message") } };
    case "newsletter":
      return { name: null, data: { email: v("Email") } };
    case "exhibition":
      return { name: v("Name") || null, data: { Name: v("Name"), Company: v("Company name"), Email: v("Email"), Phone: v("Phone Number"), "Exhibition category": v("Exhibition Category") } };
    default:
      throw new Error(`No mapping for form ${form}`);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith("--"));
  const write = args.includes("--write");
  const tz = args.find((a) => a.startsWith("--tz="))?.slice(5) || "Europe/Paris";
  if (!dir) throw new Error("Usage: npm run migrate:submissions -- <folder-with-csvs> [--write] [--tz=Europe/Paris]");

  type Item = { id: number; form: string; createdAt: Date; local: string; locale: "en" | "fr"; email: string; name: string | null; data: Record<string, string>; key: string; skip?: string };
  const items: Item[] = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".csv")).sort()) {
    for (const r of parseCsv(fs.readFileSync(path.join(dir, file), "utf8"))) {
      const formId = /\(([0-9a-f]+)\)/.exec(r["Form Name (ID)"] ?? "")?.[1] ?? "";
      const referrer = r["Referrer"] ?? "";
      const form = routeForm(formId, referrer);
      const { name, data } = mapRow(form, r);
      const email = (data.email ?? data.Email ?? "").trim();
      const createdAt = zonedToUtc(r["Created At"], tz);
      const clean = Object.fromEntries(Object.entries(data).filter(([, x]) => x !== "")) as Record<string, string>;
      items.push({
        id: Number(r["Submission ID"]), form, createdAt, local: r["Created At"], email, name, data: clean,
        locale: /\/fr\//.test(referrer) ? "fr" : "en",
        key: "wp:" + createHash("sha256").update(JSON.stringify([form, email.toLowerCase(), createdAt.toISOString()])).digest("hex"),
      });
    }
  }

  // Excluded by review, then repeats: same form + same email + same answers → keep the earliest.
  const unknown = Object.keys(EXCLUDE).map(Number).filter((id) => !items.some((i) => i.id === id));
  if (unknown.length) console.warn(`Note: excluded IDs not found in these files: ${unknown.join(", ")}`);
  const seen = new Map<string, number>();
  for (const it of [...items].sort((a, b) => +a.createdAt - +b.createdAt)) {
    if (EXCLUDE[it.id]) { it.skip = EXCLUDE[it.id]; continue; }
    const sig = JSON.stringify([it.form, it.email.toLowerCase(), Object.entries(it.data).filter(([k]) => k.toLowerCase() !== "email").map(([k, x]) => [k, norm(x)])]);
    if (seen.has(sig)) it.skip = `duplicate of #${seen.get(sig)}`;
    else seen.set(sig, it.id);
  }

  const toImport = items.filter((i) => !i.skip);
  const existing = new Set(
    (await db.formSubmission.findMany({ where: { dedupeKey: { in: toImport.map((i) => i.key) } }, select: { dedupeKey: true } })).map((r) => r.dedupeKey),
  );
  const fresh = toImport.filter((i) => !existing.has(i.key));

  // Report
  console.log(`\n${write ? "IMPORT" : "DRY RUN (nothing is written; add --write to import)"} · timezone ${tz} · ${items.length} rows read\n`);
  const forms = [...new Set(items.map((i) => i.form))].sort();
  console.log("form              rows  spam  test  dupes  import  already-there");
  for (const f of forms) {
    const of = items.filter((i) => i.form === f);
    const n = (p: (i: Item) => boolean) => String(of.filter(p).length).padStart(5);
    console.log(`${f.padEnd(16)}${n(() => true)} ${n((i) => i.skip === "spam")} ${n((i) => i.skip === "test")} ${n((i) => !!i.skip?.startsWith("duplicate"))}  ${n((i) => !i.skip && !existing.has(i.key))}  ${n((i) => !i.skip && existing.has(i.key))}`);
  }
  const missing = forms.filter((f) => !(f in FORMS));
  if (missing.length) console.log(`\nForms with no equivalent on the new site (imported anyway, shown under their key): ${missing.join(", ")}`);
  console.log("\nTo import:");
  for (const i of toImport.sort((a, b) => a.form.localeCompare(b.form) || +a.createdAt - +b.createdAt)) {
    console.log(`  #${String(i.id).padEnd(4)} ${i.form.padEnd(16)} ${i.local} ${i.locale}  ${(i.name ?? "").slice(0, 26).padEnd(26)} ${i.email}${existing.has(i.key) ? "  (already imported)" : ""}`);
    if (args.includes("--show")) console.log(`        stored as ${i.createdAt.toISOString()} UTC, data ${JSON.stringify(i.data)}`);
  }
  console.log("\nSkipped:");
  for (const i of items.filter((x) => x.skip).sort((a, b) => b.id - a.id)) console.log(`  #${String(i.id).padEnd(4)} ${i.form.padEnd(16)} ${i.skip}`);

  if (!write) return;
  const res = await db.formSubmission.createMany({
    skipDuplicates: true,
    data: fresh.map((i) => ({
      formKey: i.form, locale: i.locale, name: i.name, email: i.email || null, data: i.data,
      status: "READ" as const, source: SOURCE, createdAt: i.createdAt, dedupeKey: i.key,
    })),
  });
  console.log(`\nImported ${res.count} submission(s); ${toImport.length - res.count} already existed.`);
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
