// Build docs/REDIRECT_MAP.csv from the live crawl + local comparison (compare.json).
const fs = require("fs");
const [, , comparePath, outPath] = process.argv;
const rows = JSON.parse(fs.readFileSync(comparePath, "utf8"));
const why = (r) => {
  const p = r.path;
  if (/hf_template/.test(p)) return "Elementor header/footer template (theme internals, never a page). 410 Gone instead of the old blanket 301 to the homepage.";
  if (/\/(events|events_cat|events_tag)\//.test(p) && r.local_final.includes("2023-programme2")) return "Event CPT for the 2023 edition: content lives on the 2023 programme page.";
  if (/\/(events|events_cat|events_tag)\//.test(p)) return "Theme demo event content (returned HTTP 500 on WordPress). Redirected to the programme page.";
  if (/organizers/.test(p)) return "Theme demo organizers. Redirected to About (organizer section).";
  if (/ralph-edwards/.test(p)) return "Theme demo speaker. Redirected to the speakers archive.";
  if (/schedule-list/.test(p)) return "Demo schedule page; real 2023 schedule is on /2023-programme2/.";
  if (/schedule-|digital-conference|education-webinar/.test(p)) return "Theme demo page. Redirected to the programme page.";
  if (/new\/sponsorship-registration/.test(p)) return "Legacy URL already redirected on WordPress; single hop kept.";
  if (/sitemap/.test(p)) return "Yoast/WordPress sitemap URL (may be registered in Search Console).";
  if (p === "/index.php") return "WordPress front controller.";
  if (/^\/(fr\/)?\?s=/.test(p)) return "WordPress search.";
  if (/[A-Z]/.test(p)) return "Uppercase variant normalised to the lowercase slug.";
  if (/^\/(fr)$|\/registration$/.test(p)) return "Missing trailing slash (WordPress served a duplicate 200).";
  if (/feed/.test(p)) return "RSS feed recreated at the same URL.";
  return "";
};
const out = [["old_url", "wordpress_status", "new_status", "new_url", "redirect_type", "notes"]];
for (const r of rows) {
  if (["/wp-admin/", "/wp-login.php", "/xmlrpc.php", "/wp-json/"].includes(r.path)) continue;
  const status = r.local_chain ? r.local_chain.split(" ")[0].split("→")[0] : String(r.local_status);
  const target = r.local_chain ? r.local_final : r.local_status === 200 ? r.path : "";
  const type = r.local_chain ? "permanent" : r.local_status === 200 ? "preserved" : r.local_status === 410 ? "gone" : r.local_status === 404 ? "not found" : "";
  out.push([r.path, r.live_status, status, target, type, why(r)]);
}
// Rules that are not in the crawl sample.
out.push(["/en/*", "", "301", "/*", "permanent", "Internal English prefix is never public; duplicates redirect to the unprefixed URL."]);
out.push(["/*/page/1/", "", "308", "/*/", "permanent", "First page of a paginated archive."]);
out.push(["/category/uncategorized/", "200", "410", "", "gone", "Empty default WordPress category."]);
const csv = out.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))).join(",")).join("\n") + "\n";
fs.writeFileSync(outPath, csv);
const counts = {};
for (const r of out.slice(1)) counts[r[4]] = (counts[r[4]] ?? 0) + 1;
console.log(out.length - 1, "rows", counts);
