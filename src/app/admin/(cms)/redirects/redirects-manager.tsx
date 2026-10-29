"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Info, MoreHorizontal, Pencil, Plus, Search, Shuffle, Trash2 } from "lucide-react";
import { deleteRedirect, saveRedirect } from "@/app/admin/actions/redirects";
import {
  Badge, Button, Card, ConfirmDialog, Dialog, DropdownContent, DropdownItem, DropdownMenu, DropdownTrigger, EmptyState, Field, Input, Select, Table, Td, Textarea, Th,
} from "@/components/admin/ui";

type Row = { id: string; fromPath: string; toPath: string; statusCode: number; hits: number; note: string | null; updatedAt: string };
type FormState = { id?: string; fromPath: string; toPath: string; statusCode: 301 | 302 | 410; note: string };
const EMPTY: FormState = { fromPath: "", toPath: "", statusCode: 301, note: "" };

export function RedirectsManager({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r) => r.fromPath.toLowerCase().includes(s) || r.toPath.toLowerCase().includes(s) || (r.note ?? "").toLowerCase().includes(s)) : rows;
  }, [rows, q]);

  const chains = useMemo(() => {
    const from = new Set(rows.map((r) => r.fromPath));
    return new Set(rows.filter((r) => r.statusCode !== 410 && from.has(r.toPath.endsWith("/") ? r.toPath : `${r.toPath}/`)).map((r) => r.id));
  }, [rows]);

  const submit = async () => {
    if (!form) return;
    setSaving(true);
    const res = await saveRedirect(form);
    setSaving(false);
    if (!res.ok) {
      setErrors(res.fieldErrors ?? {});
      return void toast.error(res.error);
    }
    if (res.data.warning) toast.warning(res.data.warning, { duration: 8000 });
    else toast.success("Redirect saved.");
    setForm(null);
    setErrors({});
    const saved = res.data.row;
    setRows((prev) => [...prev.filter((r) => r.id !== saved.id), saved].sort((a, b) => a.fromPath.localeCompare(b.fromPath)));
  };

  const remove = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const res = await deleteRedirect({ id: toDelete.id });
    setDeleting(false);
    if (!res.ok) return void toast.error(res.error);
    setRows((r) => r.filter((x) => x.id !== toDelete.id));
    setToDelete(null);
    toast.success("Redirect deleted.");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          Legacy WordPress addresses (old events, theme demo pages, <code className="font-mono text-xs">/page/1/</code> URLs) are redirected in code
          (<code className="font-mono text-xs">next.config.ts</code>) and are not listed here. Rules here are checked only when no page exists at the old address.
        </p>
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search paths or notes…" className="pl-9" aria-label="Search redirects" />
          </div>
          <Button variant="primary" onClick={() => { setForm(EMPTY); setErrors({}); }}><Plus /> Add redirect</Button>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={<Shuffle />} title={rows.length ? "No matching redirects" : "No redirects yet"} description="Add a redirect when a page moves, so old links keep working." />
        ) : (
          <Table>
            <thead>
              <tr><Th>From</Th><Th /><Th>To</Th><Th>Type</Th><Th className="text-right">Hits</Th><Th>Note</Th><Th className="w-10"><span className="sr-only">Actions</span></Th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50">
                  <Td className="font-mono text-xs text-zinc-900">{r.fromPath}</Td>
                  <Td className="px-0 text-zinc-300"><ArrowRight className="size-4" /></Td>
                  <Td className="font-mono text-xs">
                    {r.statusCode === 410 ? <span className="text-zinc-500">—</span> : r.toPath}
                    {chains.has(r.id) && <span className="ml-2"><Badge tone="amber">Chain</Badge></span>}
                  </Td>
                  <Td><Badge tone={r.statusCode === 301 ? "green" : r.statusCode === 302 ? "blue" : "red"}>{r.statusCode === 410 ? "410 Gone" : r.statusCode === 301 ? "301 Permanent" : "302 Temporary"}</Badge></Td>
                  <Td className="text-right tabular-nums">{r.hits}</Td>
                  <Td className="max-w-[220px] truncate text-xs text-zinc-500">{r.note}</Td>
                  <Td>
                    <DropdownMenu>
                      <DropdownTrigger asChild><Button size="icon-sm" variant="ghost" aria-label={`Actions for ${r.fromPath}`}><MoreHorizontal /></Button></DropdownTrigger>
                      <DropdownContent>
                        <DropdownItem onSelect={() => { setForm({ id: r.id, fromPath: r.fromPath, toPath: r.toPath, statusCode: r.statusCode as 301 | 302 | 410, note: r.note ?? "" }); setErrors({}); }}><Pencil /> Edit</DropdownItem>
                        <DropdownItem destructive onSelect={() => setToDelete(r)}><Trash2 /> Delete</DropdownItem>
                      </DropdownContent>
                    </DropdownMenu>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Dialog
        open={Boolean(form)}
        onOpenChange={(v) => !v && setForm(null)}
        title={form?.id ? "Edit redirect" : "Add redirect"}
        footer={<><Button onClick={() => setForm(null)}>Cancel</Button><Button variant="primary" loading={saving} onClick={() => void submit()}>Save redirect</Button></>}
      >
        {form && (
          <div className="space-y-4">
            <Field label="Old path" hint="E.g. /old-page/ or /fr/ancienne-page/. A trailing slash is added automatically." error={errors.fromPath} required>
              {(p) => <Input {...p} value={form.fromPath} onChange={(e) => setForm({ ...form, fromPath: e.target.value })} className="font-mono" placeholder="/old-page/" />}
            </Field>
            <Field label="Type">
              {(p) => (
                <Select {...p} value={form.statusCode} onChange={(e) => setForm({ ...form, statusCode: Number(e.target.value) as 301 | 302 | 410 })}>
                  <option value={301}>301 — Moved permanently (recommended)</option>
                  <option value={302}>302 — Temporary</option>
                  <option value={410}>410 — Gone (removed on purpose)</option>
                </Select>
              )}
            </Field>
            {form.statusCode !== 410 && (
              <Field label="New destination" hint="A path on this site (/new-page/) or a full https:// address." error={errors.toPath} required>
                {(p) => <Input {...p} value={form.toPath} onChange={(e) => setForm({ ...form, toPath: e.target.value })} className="font-mono" placeholder="/new-page/" />}
              </Field>
            )}
            {form.statusCode === 410 && <p className="text-xs text-zinc-500">Visitors see the “page not found” page and search engines drop the address.</p>}
            <Field label="Note" hint="Optional — why this redirect exists." error={errors.note}>
              {(p) => <Textarea {...p} rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />}
            </Field>
          </div>
        )}
      </Dialog>
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Delete this redirect?"
        description={toDelete ? `Visitors to ${toDelete.fromPath} will see “page not found”.` : undefined}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
