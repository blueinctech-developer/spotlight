"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { createEvent } from "@/app/admin/actions/events";
import { Badge, Button, Dialog, Field, Input, Select } from "@/components/admin/ui";

export function EventStatusBadges({ status, isCurrent, startsAt, endsAt }: { status: string; isCurrent: boolean; startsAt: string | null; endsAt: string | null }) {
  const now = Date.now();
  const end = endsAt ? new Date(endsAt).getTime() : startsAt ? new Date(startsAt).getTime() + 86400_000 : null;
  const timing = startsAt ? (new Date(startsAt).getTime() > now ? "upcoming" : end && end < now ? "past" : "ongoing") : null;
  return (
    <span className="flex flex-wrap gap-1">
      <Badge tone={status === "PUBLISHED" ? "green" : status === "ARCHIVED" ? "violet" : "neutral"}>
        {status === "PUBLISHED" ? "Published" : status === "ARCHIVED" ? "Archived" : "Draft"}
      </Badge>
      {isCurrent && <Badge tone="blue">Current</Badge>}
      {timing === "upcoming" && <Badge tone="amber">Upcoming</Badge>}
      {timing === "ongoing" && <Badge tone="green">On now</Badge>}
      {timing === "past" && <Badge>Past</Badge>}
    </span>
  );
}

export function EventFilters({ q, status }: { q: string; status: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(q);
  const go = (next: { q?: string; status?: string }) => {
    const p = new URLSearchParams();
    const nq = next.q ?? query;
    const ns = next.status ?? status;
    if (nq) p.set("q", nq);
    if (ns && ns !== "all") p.set("status", ns);
    router.replace(`${pathname}${p.size ? `?${p}` : ""}`);
  };
  return (
    <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); go({}); }}>
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search events…" className="pl-9" aria-label="Search events" />
      </div>
      <Select value={status} onChange={(e) => go({ status: e.target.value })} className="w-44" aria-label="Filter by status">
        <option value="all">All events</option>
        <option value="upcoming">Upcoming</option>
        <option value="past">Past</option>
        <option value="PUBLISHED">Published</option>
        <option value="DRAFT">Draft</option>
        <option value="ARCHIVED">Archived</option>
      </Select>
    </form>
  );
}

export function NewEventButton({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear() + 1));
  const [error, setError] = useState<string | undefined>();
  const [pending, start] = useTransition();
  const submit = () =>
    start(async () => {
      const res = await createEvent({ title, year: Number(year) });
      if (!res.ok) {
        setError(res.fieldErrors?.title ?? res.error);
        return;
      }
      toast.success("Event created");
      router.push(`/admin/events/${res.data.id}/`);
    });
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}><Plus /> New event</Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="New event"
        description="You can fill in dates, venue and the programme next."
        size="sm"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={pending} onClick={submit}>Create event</Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <Field label="Title" required error={error}>
            {(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Spotlight Nigeria 2027" autoFocus />}
          </Field>
          <Field label="Year" required>
            {(p) => <Input {...p} type="number" min={2000} max={2100} value={year} onChange={(e) => setYear(e.target.value)} />}
          </Field>
        </form>
      </Dialog>
    </>
  );
}
