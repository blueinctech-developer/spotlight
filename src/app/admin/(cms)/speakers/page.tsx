import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { mediaUrl } from "@/lib/media-url";
import { PageHeader } from "@/components/admin/ui";
import { SpeakerList, NewSpeakerButton } from "@/components/admin/speakers/speaker-list";

export const metadata = { title: "Speakers" };

export default async function SpeakersPage(props: PageProps<"/admin/speakers">) {
  await requireUser("events.manage");
  const sp = await props.searchParams;
  const rows = await db.speaker.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { photo: { select: { storageKey: true } }, _count: { select: { sessions: true } } },
  });
  return (
    <>
      <PageHeader
        title="Speakers"
        description="Speaker profiles appear on /speakers/, in programmes and in speaker blocks. Drag to set the display order."
        actions={<NewSpeakerButton defaultOpen={sp.new === "1"} />}
      />
      <SpeakerList
        speakers={rows.map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          jobTitle: s.jobTitle,
          organization: s.organization,
          published: s.published,
          sessions: s._count.sessions,
          photoUrl: s.photo ? mediaUrl(s.photo.storageKey) : null,
          hasFr: Boolean(s.jobTitleFr || s.bioFr),
        }))}
      />
    </>
  );
}
