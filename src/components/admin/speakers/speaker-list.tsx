"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Mic2, Plus } from "lucide-react";
import { reorderSpeakers, saveSpeaker, setSpeakerPublished } from "@/app/admin/actions/speakers";
import { Badge, Button, Card, Dialog, EmptyState, Field, Input, Switch } from "@/components/admin/ui";
import { SortableList } from "@/components/admin/events/sortable";
import { Avatar, SearchInput } from "@/components/admin/events/pickers";

type Row = {
  id: string; name: string; slug: string; jobTitle: string | null; organization: string | null;
  published: boolean; sessions: number; photoUrl: string | null; hasFr: boolean;
};

export function SpeakerList({ speakers }: { speakers: Row[] }) {
  const router = useRouter();
  const [items, setItems] = useState(speakers);
  useEffect(() => setItems(speakers), [speakers]);
  const [q, setQ] = useState("");
  const [, start] = useTransition();
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((r) => [r.name, r.jobTitle, r.organization].some((v) => v?.toLowerCase().includes(s))) : items;
  }, [items, q]);

  const reorder = (next: Row[]) => {
    setItems(next);
    start(async () => {
      const res = await reorderSpeakers({ ids: next.map((r) => r.id) });
      if (!res.ok) {
        toast.error(res.error);
        setItems(items);
      } else toast.success("Order saved");
    });
  };
  const togglePublished = (row: Row, published: boolean) => {
    setItems((l) => l.map((r) => (r.id === row.id ? { ...r, published } : r)));
    start(async () => {
      const res = await setSpeakerPublished({ id: row.id, published });
      if (!res.ok) {
        toast.error(res.error);
        setItems((l) => l.map((r) => (r.id === row.id ? { ...r, published: !published } : r)));
      } else router.refresh();
    });
  };

  const row = (r: Row, handle?: React.ReactNode) => (
    <div className="flex items-center gap-3 bg-white px-3 py-2.5 sm:px-4">
      {handle}
      <Avatar url={r.photoUrl} name={r.name} className="size-10" />
      <div className="min-w-0 flex-1">
        <Link href={`/admin/speakers/${r.id}/`} className="block truncate font-medium text-zinc-900 hover:text-brand-700">{r.name}</Link>
        <span className="block truncate text-[13px] text-zinc-500">{[r.jobTitle, r.organization].filter(Boolean).join(", ") || "No job title"}</span>
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        {!r.hasFr && <Badge>No FR</Badge>}
        <Badge tone={r.sessions ? "blue" : "neutral"}>{r.sessions} session{r.sessions === 1 ? "" : "s"}</Badge>
      </div>
      <Switch checked={r.published} onCheckedChange={(v) => togglePublished(r, v)} label={<span className="hidden text-xs text-zinc-500 md:inline">{r.published ? "Published" : "Hidden"}</span>} />
      <a href={`/speakers/${r.slug}/`} target="_blank" rel="noreferrer" className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700" aria-label={`View ${r.name} on the site`}>
        <ExternalLink className="size-4" />
      </a>
    </div>
  );

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 p-3">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search speakers…" aria-label="Search speakers" />
        <span className="text-sm text-zinc-500">{items.length} speakers</span>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<Mic2 />} title="No speakers yet" description="Add speakers to show them on the site and assign them to sessions." action={<NewSpeakerButton />} />
      ) : q ? (
        filtered.length ? (
          <ul className="divide-y divide-zinc-100">{filtered.map((r) => <li key={r.id}>{row(r)}</li>)}</ul>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-zinc-500">No speakers match “{q}”.</p>
        )
      ) : (
        <SortableList items={items} onReorder={reorder} className="divide-y divide-zinc-100" render={(r, handle) => row(r, handle)} />
      )}
      {q && <p className="border-t border-zinc-100 px-5 py-2 text-xs text-zinc-500">Clear the search to reorder speakers.</p>}
    </Card>
  );
}

export function NewSpeakerButton({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const submit = () =>
    start(async () => {
      const res = await saveSpeaker({ name, published: false });
      if (!res.ok) return setError(res.fieldErrors?.name ?? res.error);
      toast.success("Speaker created (hidden until you publish it)");
      router.push(`/admin/speakers/${res.data.id}/`);
    });
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}><Plus /> New speaker</Button>
      <Dialog open={open} onOpenChange={setOpen} title="New speaker" size="sm" footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" loading={pending} onClick={submit}>Create</Button></>}>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <Field label="Full name" required error={error}>{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} autoFocus />}</Field>
        </form>
      </Dialog>
    </>
  );
}
