import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { mediaUrl } from "@/lib/media-url";
import { PageHeader } from "@/components/admin/ui";
import { EventEditor } from "@/components/admin/events/event-editor";
import { EventStatusBadges } from "@/components/admin/events/event-list";
import { utcToLocal } from "@/components/admin/events/tz";
import type { EventDetails, EventPartnerDraft, SessionDraft, SessionKind, SessionRole } from "@/components/admin/events/types";

export const metadata = { title: "Edit event" };

export default async function EventEditPage(props: PageProps<"/admin/events/[id]">) {
  await requireUser("events.manage");
  const { id } = await props.params;
  const event = await db.event.findUnique({
    where: { id },
    include: {
      sessions: {
        orderBy: [{ day: "asc" }, { order: "asc" }],
        include: { speakers: { orderBy: { order: "asc" }, include: { speaker: { include: { photo: { select: { storageKey: true } } } } } } },
      },
      partners: { orderBy: { order: "asc" }, include: { partner: { include: { logo: { select: { storageKey: true } } } } } },
    },
  });
  if (!event) notFound();

  const details: EventDetails = {
    id: event.id,
    title: event.title,
    titleFr: event.titleFr ?? "",
    slug: event.slug,
    edition: event.edition,
    year: event.year,
    timezone: event.timezone,
    startsAtLocal: utcToLocal(event.startsAt, event.timezone),
    endsAtLocal: utcToLocal(event.endsAt, event.timezone),
    venueName: event.venueName ?? "",
    venueAddress: event.venueAddress ?? "",
    theme: event.theme ?? "",
    themeFr: event.themeFr ?? "",
    description: event.description ?? "",
    descriptionFr: event.descriptionFr ?? "",
    registrationUrl: event.registrationUrl ?? "",
    status: event.status === "PENDING_REVIEW" ? "DRAFT" : event.status,
    isCurrent: event.isCurrent,
    bannerId: event.bannerId,
    galleryIds: event.galleryIds,
  };
  const sessions: SessionDraft[] = event.sessions.map((s) => ({
    key: s.id,
    dbId: s.id,
    day: s.day,
    startTime: s.startTime ?? "",
    endTime: s.endTime ?? "",
    title: s.title,
    titleFr: s.titleFr ?? "",
    theme: s.theme ?? "",
    themeFr: s.themeFr ?? "",
    description: s.description ?? "",
    descriptionFr: s.descriptionFr ?? "",
    location: s.location ?? "",
    hidden: s.hidden,
    kind: (["session", "plenary", "panel", "break", "networking"].includes(s.kind) ? s.kind : "session") as SessionKind,
    speakers: s.speakers.map((sp) => ({
      role: sp.role as SessionRole,
      label: sp.label ?? "",
      labelFr: sp.labelFr ?? "",
      speaker: {
        id: sp.speaker.id,
        name: sp.speaker.name,
        jobTitle: sp.speaker.jobTitle,
        organization: sp.speaker.organization,
        photoUrl: sp.speaker.photo ? mediaUrl(sp.speaker.photo.storageKey) : null,
      },
    })),
  }));
  const partners: EventPartnerDraft[] = event.partners.map((p) => ({
    key: p.partnerId,
    tier: p.tier,
    partner: { id: p.partner.id, name: p.partner.name, tier: p.partner.tier, logoUrl: p.partner.logo ? mediaUrl(p.partner.logo.storageKey) : null },
  }));

  return (
    <>
      <PageHeader
        back={
          <Link href="/admin/events/" className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800">
            <ChevronLeft className="size-4" /> Events
          </Link>
        }
        title={event.title}
        description={
          <span className="inline-flex items-center gap-2">
            <EventStatusBadges status={event.status} isCurrent={event.isCurrent} startsAt={event.startsAt?.toISOString() ?? null} endsAt={event.endsAt?.toISOString() ?? null} />
          </span>
        }
      />
      <EventEditor details={details} sessions={sessions} hiddenDays={event.hiddenDays} partners={partners} />
    </>
  );
}
