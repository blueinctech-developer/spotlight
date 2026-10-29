import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/admin/ui";
import { SpeakerForm } from "@/components/admin/speakers/speaker-form";

export const metadata = { title: "Edit speaker" };

export default async function SpeakerEditPage(props: PageProps<"/admin/speakers/[id]">) {
  await requireUser("events.manage");
  const { id } = await props.params;
  const s = await db.speaker.findUnique({
    where: { id },
    include: { sessions: { include: { session: { include: { event: { select: { id: true, title: true } } } } } } },
  });
  if (!s) notFound();
  return (
    <>
      <PageHeader
        back={<Link href="/admin/speakers/" className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"><ChevronLeft className="size-4" /> Speakers</Link>}
        title={s.name}
        description={<a href={`/speakers/${s.slug}/`} target="_blank" rel="noreferrer" className="hover:underline">/speakers/{s.slug}/</a>}
      />
      <SpeakerForm
        initial={{
          id: s.id, name: s.name, slug: s.slug, jobTitle: s.jobTitle ?? "", jobTitleFr: s.jobTitleFr ?? "", organization: s.organization ?? "",
          bio: s.bio ?? "", bioFr: s.bioFr ?? "", photoId: s.photoId, website: s.website ?? "", linkedin: s.linkedin ?? "", twitter: s.twitter ?? "",
          order: s.order, published: s.published,
        }}
        sessions={s.sessions.map((x) => ({
          id: x.session.id, title: x.session.title, role: x.role, day: x.session.day,
          time: [x.session.startTime, x.session.endTime].filter(Boolean).join("–"), eventId: x.session.event.id, eventTitle: x.session.event.title,
        }))}
      />
    </>
  );
}
