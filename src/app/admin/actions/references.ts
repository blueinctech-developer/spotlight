"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { adminAction } from "@/lib/admin/action";
import { mediaUrl } from "@/lib/media-url";
import { localizePath } from "@/lib/i18n";

export type RefOption = { id: string; label: string; sublabel?: string; image?: string | null };
export type ReferenceOptions = {
  partners: RefOption[];
  speakers: RefOption[];
  testimonials: RefOption[];
  events: RefOption[];
  links: { label: string; href: string }[];
};

/** Everything the block editor's pickers need, loaded once when the editor opens. */
export const getReferenceOptions = adminAction("pages.manage", z.object({ locale: z.enum(["en", "fr"]).default("en") }), async ({ locale }) => {
  const [partners, speakers, testimonials, events, pages, categories] = await Promise.all([
    db.partner.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }], include: { logo: { select: { storageKey: true } } } }),
    db.speaker.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }], include: { photo: { select: { storageKey: true } } } }),
    db.testimonial.findMany({ orderBy: [{ order: "asc" }] }),
    db.event.findMany({ orderBy: { year: "desc" } }),
    db.page.findMany({ where: { deletedAt: null, locale }, orderBy: { path: "asc" }, select: { title: true, path: true } }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true } }),
  ]);
  const result: ReferenceOptions = {
    partners: partners.map((p) => ({ id: p.id, label: p.name, sublabel: p.published ? undefined : "Hidden", image: p.logo ? mediaUrl(p.logo.storageKey) : null })),
    speakers: speakers.map((s) => ({ id: s.id, label: s.name, sublabel: [s.jobTitle, s.organization].filter(Boolean).join(", "), image: s.photo ? mediaUrl(s.photo.storageKey) : null })),
    testimonials: testimonials.map((t) => ({ id: t.id, label: t.name, sublabel: t.quote.slice(0, 80) })),
    events: events.map((e) => ({ id: e.id, label: e.title, sublabel: `${e.year} · ${e.status.toLowerCase()}` })),
    links: [
      ...pages.map((p) => ({ label: p.title, href: localizePath(p.path, "en") })),
      { label: "Speakers", href: "/speakers/" },
      ...categories.map((c) => ({ label: `Category: ${c.name}`, href: `/category/${c.slug}/` })),
    ],
  };
  return result;
});

/** Pages that can be chosen as a parent (same language, not trashed, not the page itself). */
export const getParentOptions = adminAction(
  "pages.manage",
  z.object({ locale: z.enum(["en", "fr"]), excludeId: z.string().max(64).optional() }),
  async ({ locale, excludeId }) => {
    const pages = await db.page.findMany({
      where: { locale, deletedAt: null, NOT: [{ path: "" }, ...(excludeId ? [{ id: excludeId }] : [])] },
      orderBy: { path: "asc" },
      select: { id: true, title: true, path: true },
    });
    // Exclude descendants of the page itself (would create a loop).
    if (!excludeId) return pages;
    const self = await db.page.findUnique({ where: { id: excludeId }, select: { path: true } });
    return self?.path ? pages.filter((p) => !p.path.startsWith(`${self.path}/`)) : pages;
  },
);
