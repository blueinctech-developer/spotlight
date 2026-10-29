import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { mediaUrl } from "@/lib/media-url";
import { PageHeader } from "@/components/admin/ui";
import { TestimonialManager } from "@/components/admin/testimonials/testimonial-manager";

export const metadata = { title: "Testimonials" };

export default async function TestimonialsPage() {
  await requireUser("events.manage");
  const rows = await db.testimonial.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: { photo: { select: { storageKey: true } }, logo: { select: { storageKey: true } } },
  });
  return (
    <>
      <PageHeader title="Testimonials" description="Quotes from participants, shown by testimonial blocks (all visible ones, in this order, unless a block picks specific quotes)." />
      <TestimonialManager
        items={rows.map((t) => ({
          id: t.id, quote: t.quote, quoteFr: t.quoteFr ?? "", name: t.name, role: t.role ?? "", roleFr: t.roleFr ?? "",
          organization: t.organization ?? "", photoId: t.photoId, logoId: t.logoId, visible: t.visible, order: t.order,
          photoUrl: t.photo ? mediaUrl(t.photo.storageKey) : null, logoUrl: t.logo ? mediaUrl(t.logo.storageKey) : null,
        }))}
      />
    </>
  );
}
