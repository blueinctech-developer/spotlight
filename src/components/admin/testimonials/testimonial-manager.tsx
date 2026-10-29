"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquareQuote, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteTestimonial, reorderTestimonials, saveTestimonial, setTestimonialVisible } from "@/app/admin/actions/testimonials";
import { Badge, Button, Card, ConfirmDialog, Dialog, EmptyState, Field, Input, Switch, Textarea } from "@/components/admin/ui";
import { MediaField } from "@/components/admin/media-picker";
import { SortableList } from "@/components/admin/events/sortable";
import { Avatar } from "@/components/admin/events/pickers";

type Item = {
  id: string; quote: string; quoteFr: string; name: string; role: string; roleFr: string; organization: string;
  photoId: string | null; logoId: string | null; visible: boolean; order: number; photoUrl: string | null; logoUrl: string | null;
};

export function TestimonialManager({ items: initial }: { items: Item[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  useEffect(() => setItems(initial), [initial]);
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [pendingDelete, startDelete] = useTransition();
  const [, start] = useTransition();

  const reorder = (next: Item[]) => {
    const prev = items;
    setItems(next);
    start(async () => {
      const res = await reorderTestimonials({ ids: next.map((t) => t.id) });
      if (!res.ok) {
        toast.error(res.error);
        setItems(prev);
      }
    });
  };
  const toggle = (t: Item, visible: boolean) => {
    setItems((l) => l.map((x) => (x.id === t.id ? { ...x, visible } : x)));
    start(async () => {
      const res = await setTestimonialVisible({ id: t.id, visible });
      if (!res.ok) {
        toast.error(res.error);
        setItems((l) => l.map((x) => (x.id === t.id ? { ...x, visible: !visible } : x)));
      }
    });
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button variant="primary" onClick={() => setEditing("new")}><Plus /> New testimonial</Button>
      </div>
      {items.length === 0 ? (
        <Card><EmptyState icon={<MessageSquareQuote />} title="No testimonials yet" description="Add quotes from participants to show on the home page." /></Card>
      ) : (
        <SortableList
          items={items}
          onReorder={reorder}
          className="space-y-3"
          render={(t, handle) => (
            <Card className="flex gap-3 p-4">
              <div className="pt-0.5">{handle}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {t.logoUrl && <img src={t.logoUrl} alt="" className="h-6 w-auto max-w-[90px] object-contain" />}
                  {!t.quoteFr && <Badge>No FR quote</Badge>}
                  {!t.visible && <Badge tone="amber">Hidden</Badge>}
                </div>
                <blockquote className="mt-2 line-clamp-3 text-sm text-zinc-700">“{t.quote}”</blockquote>
                <div className="mt-3 flex items-center gap-2.5">
                  <Avatar url={t.photoUrl} name={t.name} />
                  <span className="text-sm">
                    <span className="font-medium text-zinc-900">{t.name}</span>
                    {t.role && <span className="block text-xs text-zinc-500">{t.role}</span>}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                <Switch checked={t.visible} onCheckedChange={(v) => toggle(t, v)} label={<span className="sr-only">Visible</span>} />
                <span className="flex">
                  <Button size="icon-sm" variant="ghost" aria-label={`Edit testimonial by ${t.name}`} onClick={() => setEditing(t)}><Pencil /></Button>
                  <Button size="icon-sm" variant="danger-ghost" aria-label={`Delete testimonial by ${t.name}`} onClick={() => setDeleting(t)}><Trash2 /></Button>
                </span>
              </div>
            </Card>
          )}
        />
      )}

      {editing && (
        <TestimonialDialog
          key={editing === "new" ? "new" : editing.id}
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this testimonial?"
        description={`The quote by ${deleting?.name} will be permanently deleted. Hide it instead to keep it for later.`}
        destructive
        confirmLabel="Delete"
        loading={pendingDelete}
        onConfirm={() =>
          startDelete(async () => {
            const res = await deleteTestimonial({ id: deleting!.id });
            if (!res.ok) return void toast.error(res.error);
            setItems((l) => l.filter((x) => x.id !== deleting!.id));
            setDeleting(null);
            toast.success("Testimonial deleted");
          })
        }
      />
    </>
  );
}

function TestimonialDialog({ item, onClose, onSaved }: { item: Item | null; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState({
    quote: item?.quote ?? "", quoteFr: item?.quoteFr ?? "", name: item?.name ?? "", role: item?.role ?? "", roleFr: item?.roleFr ?? "",
    organization: item?.organization ?? "", photoId: item?.photoId ?? null, logoId: item?.logoId ?? null, visible: item?.visible ?? true, order: item?.order ?? 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }));
  const save = () =>
    start(async () => {
      const res = await saveTestimonial({ ...v, id: item?.id });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        return void toast.error(res.error);
      }
      toast.success(item ? "Testimonial saved" : "Testimonial created");
      onSaved();
    });
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={item ? "Edit testimonial" : "New testimonial"}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={pending} onClick={save}>Save</Button></>}
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quote (English)" required error={errors.quote}>{(p) => <Textarea {...p} rows={5} value={v.quote} onChange={(e) => set("quote", e.target.value)} />}</Field>
          <Field label="Quote (French)" error={errors.quoteFr} hint="Falls back to English when empty.">{(p) => <Textarea {...p} rows={5} value={v.quoteFr} onChange={(e) => set("quoteFr", e.target.value)} />}</Field>
          <Field label="Name" required error={errors.name}>{(p) => <Input {...p} value={v.name} onChange={(e) => set("name", e.target.value)} />}</Field>
          <Field label="Organisation" error={errors.organization}>{(p) => <Input {...p} value={v.organization} onChange={(e) => set("organization", e.target.value)} />}</Field>
          <Field label="Role (English)" error={errors.role} hint='Shown under the name, e.g. "Co-founder & COO, KOOLBOKS".'>{(p) => <Input {...p} value={v.role} onChange={(e) => set("role", e.target.value)} />}</Field>
          <Field label="Role (French)" error={errors.roleFr}>{(p) => <Input {...p} value={v.roleFr} onChange={(e) => set("roleFr", e.target.value)} />}</Field>
          <div><p className="mb-1.5 text-[13px] font-medium text-zinc-700">Portrait</p><MediaField value={v.photoId} onChange={(id) => set("photoId", id)} aspect="aspect-square" /></div>
          <div><p className="mb-1.5 text-[13px] font-medium text-zinc-700">Company logo</p><MediaField value={v.logoId} onChange={(id) => set("logoId", id)} aspect="aspect-[3/1]" /></div>
        </div>
        <Switch checked={v.visible} onCheckedChange={(c) => set("visible", c)} label="Visible on the site" />
      </form>
    </Dialog>
  );
}
