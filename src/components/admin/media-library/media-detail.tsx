"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import { deleteMedia, getMediaDetail, updateMediaMeta, type LibraryItem, type MediaDetail } from "@/app/admin/actions/media";
import { Button, ConfirmDialog, Dialog, Field, Input, Spinner, Textarea } from "@/components/admin/ui";
import { Thumb, formatBytes, uploadFile } from "@/components/admin/media-picker";

export function MediaDetailDialog({
  id, canManage, onClose, onChanged, onDeleted,
}: {
  id: string | null;
  canManage: boolean;
  onClose: () => void;
  onChanged: (item: Partial<LibraryItem> & { id: string }) => void;
  onDeleted: (id: string) => void;
}) {
  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [form, setForm] = useState({ title: "", alt: "", altFr: "", caption: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (mid: string) => {
    const res = await getMediaDetail({ id: mid });
    if (!res.ok) {
      toast.error(res.error);
      onClose();
      return;
    }
    const d = res.data;
    setDetail(d);
    setForm({ title: d.title ?? "", alt: d.alt, altFr: d.altFr ?? "", caption: d.caption ?? "", description: d.description ?? "" });
  };

  useEffect(() => {
    setDetail(null);
    if (id) void load(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const dirty =
    detail &&
    (form.title !== (detail.title ?? "") || form.alt !== detail.alt || form.altFr !== (detail.altFr ?? "") || form.caption !== (detail.caption ?? "") || form.description !== (detail.description ?? ""));

  const save = async () => {
    if (!detail) return;
    setSaving(true);
    const res = await updateMediaMeta({ id: detail.id, ...form });
    setSaving(false);
    if (!res.ok) return void toast.error(res.error);
    toast.success("Details saved.");
    setDetail({ ...detail, ...form, title: form.title || null, altFr: form.altFr || null, caption: form.caption || null, description: form.description || null });
    onChanged({ id: detail.id, title: form.title || null, alt: form.alt });
  };

  const replace = async (file: File | undefined) => {
    if (!file || !detail) return;
    setReplacing(true);
    try {
      const item = await uploadFile(file, { replace: detail.id });
      toast.success("File replaced. Every page using it now shows the new file.");
      onChanged({ id: detail.id, url: item.url, filename: item.filename, width: item.width, height: item.height, size: item.size, mimeType: item.mimeType });
      await load(detail.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Replace failed");
    } finally {
      setReplacing(false);
    }
  };

  const remove = async () => {
    if (!detail) return;
    setDeleting(true);
    const res = await deleteMedia({ id: detail.id });
    setDeleting(false);
    setConfirmDelete(false);
    if (!res.ok) return void toast.error(res.error);
    toast.success(`Deleted ${detail.filename}.`);
    onDeleted(detail.id);
    onClose();
  };

  const copyUrl = async () => {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(new URL(detail.url, window.location.origin).href);
      toast.success("URL copied.");
    } catch {
      toast.error("Could not copy. Select the URL and copy it manually.");
    }
  };

  const isImage = detail?.mimeType.startsWith("image/");
  const inUse = (detail?.usage.length ?? 0) > 0;

  return (
    <>
      <Dialog
        open={Boolean(id)}
        onOpenChange={(v) => !v && onClose()}
        size="xl"
        title={detail?.filename ?? "Loading…"}
        footer={
          detail && canManage ? (
            <>
              <Button variant="danger-ghost" className="mr-auto" onClick={() => setConfirmDelete(true)}><Trash2 /> Delete</Button>
              <Button onClick={onClose}>Close</Button>
              <Button variant="primary" disabled={!dirty} loading={saving} onClick={() => void save()}>Save details</Button>
            </>
          ) : (
            <Button onClick={onClose}>Close</Button>
          )
        }
      >
        {!detail ? (
          <div className="flex justify-center py-16"><Spinner className="size-6" /></div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div className="space-y-4">
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-[repeating-conic-gradient(#f4f4f5_0%_25%,#fff_0%_50%)] bg-[length:20px_20px]">
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={detail.url} alt={detail.alt} className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="size-40"><Thumb item={detail} /></div>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                <dt className="text-zinc-500">Type</dt><dd className="text-zinc-800">{detail.mimeType}</dd>
                <dt className="text-zinc-500">Dimensions</dt><dd className="text-zinc-800">{detail.width && detail.height ? `${detail.width} × ${detail.height} px` : "—"}</dd>
                <dt className="text-zinc-500">File size</dt><dd className="text-zinc-800">{formatBytes(detail.size)}</dd>
                <dt className="text-zinc-500">Uploaded</dt><dd className="text-zinc-800">{new Date(detail.createdAt).toLocaleString()}{detail.uploadedBy ? ` by ${detail.uploadedBy}` : ""}</dd>
              </dl>
              <div className="flex gap-2">
                <Input readOnly value={detail.url} aria-label="Public URL" onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
                <Button size="icon" aria-label="Copy URL" onClick={() => void copyUrl()}><Copy /></Button>
                <a href={detail.url} target="_blank" rel="noreferrer" className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50" aria-label="Open file"><ExternalLink className="size-4" /></a>
              </div>
              {canManage && (
                <div>
                  <Button size="sm" loading={replacing} onClick={() => fileRef.current?.click()}><RefreshCw /> Replace file</Button>
                  <p className="mt-1 text-xs text-zinc-500">Keeps every link to this file; the new file must be the same kind.</p>
                  <input ref={fileRef} type="file" className="sr-only" aria-label="Choose a replacement file" tabIndex={-1} accept={isImage ? "image/*,.svg" : "application/pdf"} onChange={(e) => { void replace(e.target.files?.[0]); e.target.value = ""; }} />
                </div>
              )}
            </div>
            <div className="space-y-4">
              <Field label="Alt text (English)" hint="Describe the image for screen readers. Leave empty only for decorative images.">
                {(p) => <Textarea {...p} rows={2} value={form.alt} onChange={(e) => setForm({ ...form, alt: e.target.value })} disabled={!canManage} />}
              </Field>
              <Field label="Alt text (French)" hint={form.alt && !form.altFr ? "Missing translation — the English text is used on French pages." : undefined}>
                {(p) => <Textarea {...p} rows={2} value={form.altFr} onChange={(e) => setForm({ ...form, altFr: e.target.value })} disabled={!canManage} />}
              </Field>
              <Field label="Title">{(p) => <Input {...p} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} disabled={!canManage} />}</Field>
              <Field label="Caption">{(p) => <Input {...p} value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} disabled={!canManage} />}</Field>
              <Field label="Description">{(p) => <Textarea {...p} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={!canManage} />}</Field>
              <div>
                <p className="text-[13px] font-medium text-zinc-700">Where it’s used</p>
                {inUse ? (
                  <ul className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-200 text-[13px]">
                    {detail.usage.map((u, i) => (
                      <li key={i} className="px-3 py-2">
                        {u.href ? <Link href={u.href} className="text-zinc-800 hover:text-brand-700 hover:underline">{u.label}</Link> : u.label}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-[13px] text-zinc-500">Not used anywhere. It can be deleted safely.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={inUse ? "This file is in use" : "Delete this file?"}
        description={
          inUse
            ? `It is used in ${detail?.usage.length} place(s). Remove it from those places before deleting, so no page shows a broken image.`
            : "The file is permanently removed from storage. This cannot be undone."
        }
        confirmLabel={inUse ? "OK" : "Delete"}
        destructive={!inUse}
        loading={deleting}
        onConfirm={() => (inUse ? setConfirmDelete(false) : void remove())}
      />
    </>
  );
}
