import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { mediaUrl } from "@/lib/media-url";
import { PageHeader } from "@/components/admin/ui";
import { PartnerManager, type PartnerRow } from "@/components/admin/partners/partner-manager";

export const metadata = { title: "Partners" };

type BlockLike = { type?: string; hidden?: boolean; groups?: { heading?: string; partnerIds?: string[] }[]; columns?: { blocks?: BlockLike[] }[] };

export default async function PartnersPage() {
  await requireUser("events.manage");
  const [partners, pages] = await Promise.all([
    db.partner.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: { logo: { select: { storageKey: true } }, events: { include: { event: { select: { id: true, title: true } } } } },
    }),
    db.page.findMany({ where: { deletedAt: null }, select: { id: true, title: true, locale: true, blocks: true } }),
  ]);

  // Which pages show each partner (server-side scan of "partners" blocks, including inside columns).
  const usage = new Map<string, Set<string>>();
  for (const page of pages) {
    const visit = (blocks: BlockLike[]) => {
      for (const b of blocks) {
        if (b.type === "partners") {
          for (const g of b.groups ?? []) {
            for (const id of g.partnerIds ?? []) {
              if (!usage.has(id)) usage.set(id, new Set());
              usage.get(id)!.add(`${page.title} (${page.locale.toUpperCase()})${b.hidden ? " – hidden block" : ""}`);
            }
          }
        }
        if (b.type === "columns") (b.columns ?? []).forEach((c) => visit(c.blocks ?? []));
      }
    };
    visit(Array.isArray(page.blocks) ? (page.blocks as BlockLike[]) : []);
  }

  const rows: PartnerRow[] = partners.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    logoId: p.logoId,
    logoUrl: p.logo ? mediaUrl(p.logo.storageKey) : null,
    websiteUrl: p.websiteUrl ?? "",
    tier: p.tier,
    order: p.order,
    published: p.published,
    pages: [...(usage.get(p.id) ?? [])],
    events: p.events.map((e) => ({ id: e.event.id, title: e.event.title, tier: e.tier })),
  }));

  return (
    <>
      <PageHeader
        title="Partners & sponsors"
        description="Shared logo records used by partner blocks on pages and by each event edition."
      />
      <PartnerManager partners={rows} />
    </>
  );
}
