import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/admin/ui";
import { EventStatusBadges, NewEventButton, EventFilters } from "@/components/admin/events/event-list";
import { formatInZone } from "@/components/admin/events/tz";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Events" };

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default async function EventsPage(props: PageProps<"/admin/events">) {
  await requireUser("events.manage");
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const status = typeof sp.status === "string" ? sp.status : "all";
  const now = new Date();
  const where: Prisma.EventWhereInput = {
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { venueName: { contains: q, mode: "insensitive" } }] } : {}),
    ...(status === "DRAFT" || status === "PUBLISHED" || status === "ARCHIVED" ? { status } : {}),
    ...(status === "upcoming" ? { startsAt: { gte: now } } : {}),
    ...(status === "past" ? { startsAt: { lt: now } } : {}),
  };
  const events = await db.event.findMany({
    where,
    orderBy: [{ year: "desc" }, { startsAt: "desc" }],
    include: { _count: { select: { sessions: true, partners: true } } },
  });

  return (
    <>
      <PageHeader
        title="Events"
        description="Editions of the forum, their programme, speakers and partners."
        actions={<NewEventButton defaultOpen={sp.new === "1"} />}
      />
      <Card>
        <div className="border-b border-zinc-100 p-3">
          <EventFilters q={q} status={status} />
        </div>
        {events.length === 0 ? (
          <EmptyState icon={<CalendarDays />} title={q || status !== "all" ? "No events match" : "No events yet"} description="Create an edition to manage its programme and partners." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Event</Th>
                <Th>Edition</Th>
                <Th>Date</Th>
                <Th>Venue</Th>
                <Th className="text-right">Sessions</Th>
                <Th className="text-right">Partners</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="hover:bg-zinc-50/60">
                  <Td>
                    <Link href={`/admin/events/${e.id}/`} className="font-medium text-zinc-900 hover:text-brand-700">{e.title}</Link>
                    <div className="text-xs text-zinc-500">{e.slug}</div>
                  </Td>
                  <Td>{e.edition ? `${ordinal(e.edition)} · ${e.year}` : e.year}</Td>
                  <Td className="whitespace-nowrap">{formatInZone(e.startsAt, e.timezone)}</Td>
                  <Td className="max-w-[220px] truncate">{e.venueName ?? "—"}</Td>
                  <Td className="text-right tabular-nums">{e._count.sessions}</Td>
                  <Td className="text-right tabular-nums">{e._count.partners}</Td>
                  <Td>
                    <EventStatusBadges status={e.status} isCurrent={e.isCurrent} startsAt={e.startsAt?.toISOString() ?? null} endsAt={e.endsAt?.toISOString() ?? null} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
