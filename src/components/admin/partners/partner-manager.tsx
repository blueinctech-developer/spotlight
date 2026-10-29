"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, EyeOff, Handshake, Pencil, Plus, Trash2 } from "lucide-react";
import { deletePartner, reorderPartners, savePartner, setPartnerPublished } from "@/app/admin/actions/partners";
import { Badge, Button, Card, ConfirmDialog, Dialog, EmptyState, Field, Input, Select, Switch } from "@/components/admin/ui";
import { MediaField } from "@/components/admin/media-picker";
import { SortableList } from "@/components/admin/events/sortable";
import { SearchInput } from "@/components/admin/events/pickers";
import { TIER_LABELS } from "@/components/admin/events/types";

export type PartnerRow = {
  id: string; name: string; slug: string; logoId: string | null; logoUrl: string | null; websiteUrl: string; tier: string;
  order: number; published: boolean; pages: string[]; events: { id: string; title: string; tier: string }[];
};

const TIERS = Object.keys(TIER_LABELS);

export function PartnerManager({ partners }: { partners: PartnerRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState(partners);
  useEffect(() => setItems(partners), [partners]);
  const [q, setQ] = useState("");
  const [tier, setTier] = useState("all");
  const [editing, setEditing] = useState<PartnerRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<PartnerRow | null>(null);
  const [pendingDelete, startDelete] = useTransition();
  const [, start] = useTransition();
  const filtering = q.trim() !== "" || tier !== "all";
  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((p) => (tier === "all" || p.tier === tier) && (!s || p.name.toLowerCase().includes(s)));
  }, [items, q, tier]);

  const reorder = (next: PartnerRow[]) => {
    const prev = items;
    setItems(next);
    start(async () => {
      const res = await reorderPartners({ ids: next.map((p) => p.id) });
      if (!res.ok) {
        toast.error(res.error);
        setItems(prev);
      }
    });
  };
  const toggle = (p: PartnerRow, published: boolean) => {
    setItems((l) => l.map((x) => (x.id === p.id ? { ...x, published } : x)));
    start(async () => {
      const res = await setPartnerPublished({ id: p.id, published });
      if (!res.ok) {
        toast.error(res.error);
        setItems((l) => l.map((x) => (x.id === p.id ? { ...x, published: !published } : x)));
      }
    });
  };

  const tile = (p: PartnerRow, handle?: React.ReactNode) => (
    <div className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between px-2 pt-2">
        {handle ?? <span />}
        <Badge tone={p.tier === "SPONSOR" ? "green" : p.tier === "MEDIA_PARTNER" ? "violet" : p.tier === "CO_ORGANIZER" ? "blue" : "neutral"}>{TIER_LABELS[p.tier]}</Badge>
      </div>
      <button type="button" onClick={() => setEditing(p)} className="flex h-24 items-center justify-center px-4" aria-label={`Edit ${p.name}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.logoUrl ? <img src={p.logoUrl} alt="" className={`max-h-20 max-w-full object-contain ${p.published ? "" : "opacity-40 grayscale"}`} /> : <span className="text-sm text-zinc-500">No logo</span>}
      </button>
      <div className="mt-auto border-t border-zinc-100 px-3 py-2">
        <p className="truncate text-sm font-medium text-zinc-900" title={p.name}>{p.name}</p>
        <p className="truncate text-xs text-zinc-500">
          {p.pages.length || p.events.length ? `${p.pages.length} page${p.pages.length === 1 ? "" : "s"} · ${p.events.length} event${p.events.length === 1 ? "" : "s"}` : "Not used"}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <Switch checked={p.published} onCheckedChange={(v) => toggle(p, v)} label={<span className="text-xs text-zinc-500">{p.published ? "Visible" : "Hidden"}</span>} />
          <span className="flex">
            {p.websiteUrl && (
              <a href={p.websiteUrl} target="_blank" rel="noreferrer" className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700" aria-label="Open website"><ExternalLink className="size-4" /></a>
            )}
            <Button size="icon-sm" variant="ghost" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)}><Pencil /></Button>
            <Button size="icon-sm" variant="danger-ghost" aria-label={`Delete ${p.name}`} onClick={() => setDeleting(p)}><Trash2 /></Button>
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 p-3">
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search partners…" aria-label="Search partners" />
          <Select value={tier} onChange={(e) => setTier(e.target.value)} className="w-44" aria-label="Filter by tier">
            <option value="all">All tiers</option>
            {TIERS.map((t) => <option key={t} value={t}>{TIER_LABELS[t]}</option>)}
          </Select>
          <Button variant="primary" onClick={() => setEditing("new")}><Plus /> New partner</Button>
        </div>
        <div className="p-4">
          {items.length === 0 ? (
            <EmptyState icon={<Handshake />} title="No partners yet" description="Add sponsor and partner logos to use them on pages and events." />
          ) : visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">No partners match your filters.</p>
          ) : filtering ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{visible.map((p) => <li key={p.id}>{tile(p)}</li>)}</ul>
          ) : (
            <SortableList grid items={items} onReorder={reorder} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" render={(p, handle) => tile(p, handle)} />
          )}
          {filtering && items.length > 0 && <p className="mt-3 text-xs text-zinc-500">Clear search and filters to reorder by dragging.</p>}
        </div>
      </Card>

      {editing && (
        <PartnerDialog
          key={editing === "new" ? "new" : editing.id}
          partner={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        destructive
        confirmLabel="Delete partner"
        loading={pendingDelete}
        description={
          deleting && (deleting.pages.length || deleting.events.length) ? (
            <>
              <p className="font-medium text-zinc-800">This logo is in use and will be removed from:</p>
              <ul className="mt-2 list-disc pl-5">
                {deleting.pages.map((p) => <li key={p}>Page: {p}</li>)}
                {deleting.events.map((e) => <li key={e.id}>Event: {e.title} ({TIER_LABELS[e.tier]})</li>)}
              </ul>
              <p className="mt-2">Hiding the partner keeps it in place but stops it from showing.</p>
            </>
          ) : (
            "This partner is not used anywhere and will be permanently deleted."
          )
        }
        onConfirm={() =>
          startDelete(async () => {
            const res = await deletePartner({ id: deleting!.id });
            if (!res.ok) return void toast.error(res.error);
            setItems((l) => l.filter((x) => x.id !== deleting!.id));
            setDeleting(null);
            toast.success("Partner deleted");
            router.refresh();
          })
        }
      />
    </>
  );
}

function PartnerDialog({ partner, onClose, onSaved }: { partner: PartnerRow | null; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState({
    name: partner?.name ?? "",
    slug: partner?.slug ?? "",
    logoId: partner?.logoId ?? null,
    websiteUrl: partner?.websiteUrl ?? "",
    tier: partner?.tier ?? "PARTNER",
    order: partner?.order ?? 0,
    published: partner?.published ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }));
  const save = () =>
    start(async () => {
      const res = await savePartner({ ...v, id: partner?.id, tier: v.tier as "PARTNER" });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        return void toast.error(res.error);
      }
      toast.success(partner ? "Partner saved" : "Partner created");
      onSaved();
    });
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={partner ? `Edit ${partner.name}` : "New partner"}
      size="md"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={pending} onClick={save}>Save</Button></>}
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div><p className="mb-1.5 text-[13px] font-medium text-zinc-700">Logo</p><MediaField value={v.logoId} onChange={(id) => set("logoId", id)} aspect="aspect-[3/1]" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required error={errors.name}>{(p) => <Input {...p} value={v.name} onChange={(e) => set("name", e.target.value)} autoFocus />}</Field>
          <Field label="Slug" error={errors.slug} hint="Generated from the name when empty.">{(p) => <Input {...p} value={v.slug} onChange={(e) => set("slug", e.target.value)} />}</Field>
          <Field label="Website" error={errors.websiteUrl} className="sm:col-span-2" hint="When set, the logo links to this site.">{(p) => <Input {...p} value={v.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} placeholder="https://" />}</Field>
          <Field label="Default tier">
            {(p) => <Select {...p} value={v.tier} onChange={(e) => set("tier", e.target.value)}>{TIERS.map((t) => <option key={t} value={t}>{TIER_LABELS[t]}</option>)}</Select>}
          </Field>
          <Field label="Display order">{(p) => <Input {...p} type="number" min={0} value={v.order} onChange={(e) => set("order", Number(e.target.value) || 0)} />}</Field>
        </div>
        <Switch checked={v.published} onCheckedChange={(c) => set("published", c)} label="Visible on the site" />
        {partner && (partner.pages.length > 0 || partner.events.length > 0) && (
          <div className="rounded-lg bg-zinc-50 p-3 text-[13px] text-zinc-600">
            <p className="mb-1 flex items-center gap-1.5 font-medium text-zinc-800"><EyeOff className="size-3.5" /> Where this logo appears</p>
            <ul className="space-y-0.5">
              {partner.pages.map((p) => <li key={p}>Page: {p}</li>)}
              {partner.events.map((e) => <li key={e.id}>Event: <Link href={`/admin/events/${e.id}/`} className="underline">{e.title}</Link> ({TIER_LABELS[e.tier]})</li>)}
            </ul>
          </div>
        )}
      </form>
    </Dialog>
  );
}
