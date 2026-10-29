"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { FolderTree, Pencil, Plus, Search, Tags, Trash2 } from "lucide-react";
import { deleteTerm, saveTerm } from "@/app/admin/actions/taxonomies";
import { Button, Card, ConfirmDialog, Dialog, EmptyState, Field, Input, Table, Td, Textarea, Th } from "@/components/admin/ui";

export type TermRow = { id: string; name: string; nameFr: string | null; slug: string; description?: string | null; count: number };

export function TermsManager({ kind, rows }: { kind: "category" | "tag"; rows: TermRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<TermRow> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<TermRow | null>(null);
  const [pending, start] = useTransition();
  const label = kind === "category" ? "category" : "tag";
  const base = kind === "category" ? "/category/" : "/tag/";

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r) => [r.name, r.nameFr ?? "", r.slug].some((v) => v.toLowerCase().includes(s))) : rows;
  }, [q, rows]);

  const save = () =>
    start(async () => {
      if (!editing) return;
      const res = await saveTerm({
        kind,
        id: editing.id,
        name: editing.name ?? "",
        nameFr: editing.nameFr ?? null,
        slug: editing.slug ?? "",
        description: editing.description ?? null,
      });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        return void toast.error(res.error);
      }
      toast.success(editing.id ? "Saved" : `${label[0].toUpperCase()}${label.slice(1)} created`);
      setEditing(null);
      setErrors({});
      router.refresh();
    });

  const remove = () =>
    start(async () => {
      if (!deleting) return;
      const res = await deleteTerm({ kind, id: deleting.id });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Deleted");
      setDeleting(null);
      router.refresh();
    });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${label === "category" ? "categories" : "tags"}…`} className="pl-9" aria-label="Search" />
        </div>
        <Button variant="primary" onClick={() => { setErrors({}); setEditing({ name: "", nameFr: "", slug: "", description: "" }); }}>
          <Plus /> New {label}
        </Button>
      </div>
      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon={kind === "category" ? <FolderTree /> : <Tags />} title={q ? "Nothing matches your search." : `No ${label === "category" ? "categories" : "tags"} yet.`} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th className="hidden md:table-cell">French name</Th>
                <Th>Slug</Th>
                <Th className="text-right">Posts</Th>
                <Th className="w-24"><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50/60">
                  <Td>
                    <button type="button" className="font-medium text-zinc-900 hover:text-brand-700" onClick={() => { setErrors({}); setEditing(r); }}>{r.name}</button>
                    {r.description && <p className="line-clamp-1 text-xs text-zinc-500">{r.description}</p>}
                  </Td>
                  <Td className="hidden md:table-cell text-zinc-600">{r.nameFr || <span className="text-xs text-amber-600">Missing</span>}</Td>
                  <Td>
                    <a href={`${base}${r.slug}/`} target="_blank" rel="noreferrer" className="font-mono text-xs text-zinc-500 hover:text-brand-700">{r.slug}</a>
                  </Td>
                  <Td className="text-right tabular-nums">{r.count}</Td>
                  <Td>
                    <span className="flex justify-end gap-1">
                      <Button size="icon-sm" variant="ghost" aria-label={`Edit ${r.name}`} onClick={() => { setErrors({}); setEditing(r); }}><Pencil /></Button>
                      <Button size="icon-sm" variant="danger-ghost" aria-label={`Delete ${r.name}`} onClick={() => setDeleting(r)}><Trash2 /></Button>
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Dialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        title={editing?.id ? `Edit ${label}` : `New ${label}`}
        footer={
          <>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" loading={pending} onClick={save} disabled={!editing?.name?.trim()}>Save</Button>
          </>
        }
      >
        {editing && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <Field label="Name" required error={errors.name}>
              {(p) => <Input {...p} value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus maxLength={120} />}
            </Field>
            <Field label="French name" hint="Shown on the French site. Falls back to the English name when empty.">
              {(p) => <Input {...p} value={editing.nameFr ?? ""} onChange={(e) => setEditing({ ...editing, nameFr: e.target.value })} maxLength={120} />}
            </Field>
            <Field label="Slug" hint={`Used in the URL: ${base}${editing.slug || "…"}/ — changing it breaks existing links.`} error={errors.slug}>
              {(p) => <Input {...p} value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="generated from the name" maxLength={100} />}
            </Field>
            {kind === "category" && (
              <Field label="Description">
                {(p) => <Textarea {...p} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={3} maxLength={1000} />}
              </Field>
            )}
            <button type="submit" className="hidden" />
          </form>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`Delete ${label} “${deleting?.name ?? ""}”?`}
        description={deleting?.count ? `It will be removed from ${deleting.count} post${deleting.count > 1 ? "s" : ""}. The posts themselves are not deleted. Its archive page will stop working.` : "This cannot be undone."}
        confirmLabel="Delete"
        destructive
        loading={pending}
        onConfirm={remove}
      />
    </>
  );
}
