/**
 * Import the visible 2026 programme from the live WordPress /programme/ page into the
 * "Spotlight Nigeria 2026" event: one session per visible time slot, speaker cards with
 * their tag text (e.g. "Goodwill Message") and portraits.
 *
 *   npm run migrate:programme-2026            # local database
 *   node scripts/with-env.cjs .env.neon-production -- npm run migrate:programme-2026
 *
 * Safe to re-run: it does nothing if the event already has sessions (edit them in the CMS).
 * Existing speakers are matched by name and reused; new ones are created with their photo.
 * Needs the migration cache (`npm run migrate:fetch`) for the media index.
 */
import "dotenv/config";
import * as cheerio from "cheerio";
import type { CheerioAPI, Cheerio } from "cheerio";
import type { Element } from "domhandler";
import { db } from "@/lib/db";
import { slugify } from "@/components/admin/events/slug";
import { SITE, clean, hiddenEverywhere, imgSrc, importMedia } from "./context";

const EVENT_SLUG = "spotlight-nigeria-2026";
const PLACEHOLDER_PHOTO = /\/Mystery\.png$/i;

type Card = { tag: string; name: string; job: string; photo: string | null };
type Slot = { id: string; start: string; end: string; title: string; theme: string; cards: Card[] };

async function load(path: string): Promise<CheerioAPI> {
  const res = await fetch(`${SITE}${path}`, { headers: { "user-agent": "SpotlightMigration/1.0" } });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return cheerio.load(await res.text());
}

/**
 * Time slots. By default only visible ones (hidden Elementor sections are leftovers from earlier
 * editions); `onlyIds` picks specific sections, visible or not (the French page hides them).
 */
function slots($: CheerioAPI, onlyIds?: string[]): Slot[] {
  const out: Slot[] = [];
  const doc = $('[data-elementor-id="11439"]').first();
  for (const el of doc.children(".elementor-top-section").toArray()) {
    const sec = $(el);
    const id = sec.attr("data-id") ?? "";
    if (onlyIds ? !onlyIds.includes(id) : hiddenEverywhere(sec)) continue;
    const heads = sec.find("h4").toArray().map((h) => clean($(h).text())).filter(Boolean);
    const m = heads[0]?.match(/^\(\s*([^)]+?)\s*\)\s*(.+)$/);
    if (!m) continue;
    const [start = "", end = ""] = m[1].split(/\s*-\s*/);
    const cards: Card[] = [];
    // Card columns are the innermost columns that hold a name (h5).
    sec.find(".elementor-column").each((_, c) => {
      const col = $(c) as Cheerio<Element>;
      if (col.find(".elementor-column").length || !col.find("h5").length || (!onlyIds && hiddenEverywhere(col))) return;
      cards.push({
        tag: clean(col.find(".elementor-button-text").first().text()),
        name: clean(col.find("h5").first().text()),
        job: clean(col.find("h6").first().text()).replace(/^\((.*)\)$/, "$1"),
        photo: imgSrc(col.find(".elementor-widget-image").first()),
      });
    });
    out.push({
      id,
      start: start.trim(), end: end.trim(), title: m[2].trim(),
      theme: heads.find((h) => /^theme\s*:/i.test(h))?.replace(/^theme\s*:\s*/i, "") ?? "",
      cards,
    });
  }
  return out;
}

/** "Mr. Guillaume NIARFEIX" → "guillaume niarfeix" (honorifics dropped) for matching. */
const HONORIFIC = /^(mr|mrs|ms|dr|amb|ambassador|hon|honou?rable|barr|prince|princess|chief|prof)\.?\s+/i;
function nameKey(name: string): string {
  let n = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\(.*?\)/g, "");
  while (HONORIFIC.test(n)) n = n.replace(HONORIFIC, "");
  return n.replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim();
}
function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
/** "NIARFEIX" → "Niarfeix"; mixed-case words are left alone. */
const tidyName = (name: string) => name.replace(/\b[A-Z]{3,}\b/g, (w) => w[0] + w.slice(1).toLowerCase());

function roleFor(tag: string): "SPEAKER" | "MODERATOR" | "PANELIST" | "KEYNOTE" {
  if (/moderat/i.test(tag)) return "MODERATOR";
  if (/panel/i.test(tag)) return "PANELIST";
  if (/keynote/i.test(tag)) return "KEYNOTE";
  return "SPEAKER";
}
const ROLE_NAME = { SPEAKER: "speaker", MODERATOR: "moderator", PANELIST: "panelist", KEYNOTE: "keynote" } as const;

async function main() {
  const event = await db.event.findUnique({ where: { slug: EVENT_SLUG }, include: { _count: { select: { sessions: true } } } });
  if (!event) throw new Error(`Event ${EVENT_SLUG} not found. Run the main import first.`);
  if (event._count.sessions > 0) {
    console.log(`${event.title} already has ${event._count.sessions} sessions; nothing imported. Edit them in Events → Programme.`);
    return;
  }

  const en = slots(await load("/programme/"));
  if (!en.length) throw new Error("No visible programme sections found on /programme/.");
  const fr = new Map(slots(await load("/fr/programme/"), en.map((s) => s.id)).map((s) => [s.id, s]));

  const speakers = await db.speaker.findMany({ select: { id: true, name: true, slug: true, photoId: true } });
  const byKey = new Map(speakers.map((s) => [nameKey(s.name), s]));
  const findSpeaker = (name: string) => {
    const key = nameKey(name);
    if (byKey.has(key)) return byKey.get(key)!;
    // Tolerate one-letter spelling variants ("Arnauld" / "Arnaud").
    for (const [k, s] of byKey) if (Math.abs(k.length - key.length) <= 1 && editDistance(k, key) <= 1) return s;
    return null;
  };
  let maxOrder = (await db.speaker.aggregate({ _max: { order: true } }))._max.order ?? 0;

  const summary: string[] = [];
  await db.$transaction(async (tx) => {
    for (const [i, slot] of en.entries()) {
      // French text comes from the same Elementor section on /fr/programme/ (cards in the same order).
      const frCandidate = fr.get(slot.id);
      const frSlot = frCandidate && frCandidate.cards.length === slot.cards.length ? frCandidate : null;
      const session = await tx.eventSession.create({
        data: {
          eventId: event.id, day: 1, order: i, kind: "session",
          startTime: slot.start || null, endTime: slot.end || null,
          title: slot.title, titleFr: frSlot && frSlot.title !== slot.title ? frSlot.title : null,
          theme: slot.theme || null, themeFr: frSlot?.theme && frSlot.theme !== slot.theme ? frSlot.theme : null,
        },
      });
      summary.push(`(${slot.start} – ${slot.end}) ${slot.title}`);

      // The live page repeats some people (copy-paste); keep the first card, but its best photo.
      const seen = new Map<string, { card: Card; frTag: string }>();
      slot.cards.forEach((card, j) => {
        const key = nameKey(card.name);
        const prev = seen.get(key);
        if (!prev) seen.set(key, { card: { ...card }, frTag: frSlot?.cards[j]?.tag ?? "" });
        else if ((!prev.card.photo || PLACEHOLDER_PHOTO.test(prev.card.photo)) && card.photo && !PLACEHOLDER_PHOTO.test(card.photo)) prev.card.photo = card.photo;
      });

      let order = 0;
      for (const { card, frTag } of seen.values()) {
        const photoUrl = card.photo && !PLACEHOLDER_PHOTO.test(card.photo) ? card.photo : null;
        let sp = findSpeaker(card.name);
        if (sp) {
          if (!sp.photoId && photoUrl) {
            const photoId = await importMedia(photoUrl, { alt: sp.name });
            if (photoId) await tx.speaker.update({ where: { id: sp.id }, data: { photoId } });
          }
          summary.push(`   linked   ${sp.name}`);
        } else {
          const name = tidyName(card.name);
          let slug = slugify(name) || "speaker";
          for (let n = 2; await tx.speaker.findUnique({ where: { slug }, select: { id: true } }); n++) slug = `${slugify(name)}-${n}`;
          const photoId = photoUrl ? await importMedia(photoUrl, { alt: name }) : null;
          const row = await tx.speaker.create({
            data: { slug, name, jobTitle: card.job || null, photoId, order: ++maxOrder, published: true },
            select: { id: true, name: true, slug: true, photoId: true },
          });
          byKey.set(nameKey(row.name), row);
          sp = row;
          summary.push(`   created  ${row.name}${photoId ? "" : " (no photo)"}`);
        }
        const role = roleFor(card.tag);
        const isRoleName = (t: string) => !t || t.toLowerCase() === ROLE_NAME[role];
        await tx.sessionSpeaker.create({
          data: {
            sessionId: session.id, speakerId: sp.id, role, order: order++,
            label: isRoleName(card.tag) ? null : card.tag,
            labelFr: frTag && frTag !== card.tag ? frTag : null,
          },
        });
      }
    }
  }, { timeout: 120_000 });
  console.log(`Imported ${en.length} sessions into ${event.title}:\n${summary.join("\n")}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
