"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, FileText, ImagePlus, Search, Trash2, Upload, X } from "lucide-react";
import { getMediaByIds, listMediaForPicker, type PickerItem } from "@/app/admin/actions/media-picker";
import { Button, Dialog, Input, Spinner, cn } from "./ui";

export async function uploadFile(file: File, opts: { alt?: string; replace?: string } = {}): Promise<PickerItem> {
  const fd = new FormData();
  fd.append("file", file);
  if (opts.alt) fd.append("alt", opts.alt);
  if (opts.replace) fd.append("replace", opts.replace);
  const res = await fetch("/api/admin/media/upload/", { method: "POST", body: fd });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Upload failed");
  const a = json.asset;
  return { id: a.id, url: a.url, filename: a.filename, alt: a.alt, mimeType: a.mimeType, width: a.width, height: a.height, size: a.size, createdAt: a.createdAt };
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function Thumb({ item, className }: { item: Pick<PickerItem, "url" | "mimeType" | "alt" | "filename">; className?: string }) {
  if (item.mimeType.startsWith("image/")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.url} alt={item.alt || item.filename} className={cn("size-full object-cover", className)} loading="lazy" />;
  }
  return (
    <span className={cn("flex size-full flex-col items-center justify-center gap-1 bg-zinc-100 p-2 text-center text-[11px] text-zinc-500", className)}>
      <FileText className="size-6" />
      <span className="line-clamp-2 break-all">{item.filename}</span>
    </span>
  );
}

/** Drop zone + file input. Calls onUploaded for each successful upload. */
export function UploadZone({ onUploaded, accept = "image/*,application/pdf,.svg", compact }: { onUploaded: (item: PickerItem) => void; accept?: string; compact?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(0);
  const handle = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const f of Array.from(files)) {
      setBusy((b) => b + 1);
      try {
        onUploaded(await uploadFile(f));
        toast.success(`Uploaded ${f.name}`);
      } catch (e) {
        toast.error(`${f.name}: ${e instanceof Error ? e.message : "Upload failed"}`);
      } finally {
        setBusy((b) => b - 1);
      }
    }
  };
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); void handle(e.dataTransfer.files); }}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-colors",
        compact ? "gap-1 px-4 py-5" : "gap-2 px-6 py-10",
        dragging ? "border-brand bg-brand/5" : "border-zinc-200 bg-zinc-50/50",
      )}
    >
      {busy ? <Spinner className="size-6" /> : <Upload className="size-6 text-zinc-500" />}
      <p className="text-sm text-zinc-600">
        {busy ? `Uploading ${busy} file${busy > 1 ? "s" : ""}…` : "Drag files here, or"}{" "}
        {!busy && (
          <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => inputRef.current?.click()}>
            browse
          </button>
        )}
      </p>
      <p className="text-xs text-zinc-500">JPG, PNG, WebP, GIF, AVIF, SVG or PDF · up to 15 MB</p>
      <input ref={inputRef} type="file" multiple accept={accept} className="sr-only" aria-label="Choose files to upload" tabIndex={-1} onChange={(e) => { void handle(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

export function MediaPickerDialog({
  open, onOpenChange, onSelect, multiple, accept = "image",
}: {
  open: boolean; onOpenChange: (v: boolean) => void; onSelect: (items: PickerItem[]) => void; multiple?: boolean; accept?: "image" | "any" | "document";
}) {
  const [items, setItems] = useState<PickerItem[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<PickerItem[]>([]);
  const [pending, start] = useTransition();
  const type = accept === "image" ? "image" : accept === "document" ? "document" : "all";

  const load = useCallback((p: number, q: string, append: boolean) => {
    start(async () => {
      const res = await listMediaForPicker({ search: q, type, page: p });
      if (!res.ok) return void toast.error(res.error);
      setItems((prev) => (append ? [...prev, ...res.data.items] : res.data.items));
      setHasMore(res.data.hasMore);
      setPage(p);
    });
  }, [type]);

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    const t = setTimeout(() => load(1, search, false), search ? 250 : 0);
    return () => clearTimeout(t);
  }, [open, search, load]);

  const toggle = (item: PickerItem) => {
    if (!multiple) return setSelected([item]);
    setSelected((s) => (s.some((x) => x.id === item.id) ? s.filter((x) => x.id !== item.id) : [...s, item]));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={multiple ? "Choose media" : "Choose a file"}
      description="Pick from the media library or upload new files."
      footer={
        <>
          <span className="mr-auto self-center text-sm text-zinc-500">{selected.length ? `${selected.length} selected` : ""}</span>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" disabled={!selected.length} onClick={() => { onSelect(selected); onOpenChange(false); }}>
            {multiple ? "Insert selected" : "Use this file"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <UploadZone compact accept={accept === "image" ? "image/*,.svg" : undefined} onUploaded={(item) => { setItems((s) => [item, ...s]); toggle(item); }} />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by file name or alt text…" className="pl-9" aria-label="Search media" />
        </div>
        {items.length === 0 && !pending ? (
          <p className="py-10 text-center text-sm text-zinc-500">No media found.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
            {items.map((item) => {
              const isSel = selected.some((s) => s.id === item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggle(item)}
                    onDoubleClick={() => { onSelect([item]); onOpenChange(false); }}
                    aria-pressed={isSel}
                    title={item.filename}
                    className={cn("relative block aspect-square w-full overflow-hidden rounded-lg border bg-zinc-100 outline-none", isSel ? "border-brand ring-2 ring-brand" : "border-zinc-200 hover:border-zinc-400")}
                  >
                    <Thumb item={item} />
                    {isSel && <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">✓</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex justify-center">
          {pending ? <Spinner /> : hasMore && <Button size="sm" onClick={() => load(page + 1, search, true)}>Load more</Button>}
        </div>
      </div>
    </Dialog>
  );
}

/** Hook: keep preview data for a set of selected ids. */
export function useMediaPreviews(ids: (string | null | undefined)[]) {
  const [map, setMap] = useState<Record<string, PickerItem>>({});
  const key = ids.filter(Boolean).join(",");
  useEffect(() => {
    const missing = key.split(",").filter((id) => id && !map[id]);
    if (!missing.length) return;
    void getMediaByIds({ ids: missing }).then((res) => {
      if (res.ok) setMap((m) => ({ ...m, ...Object.fromEntries(res.data.map((d) => [d.id, d])) }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { map, add: (items: PickerItem[]) => setMap((m) => ({ ...m, ...Object.fromEntries(items.map((d) => [d.id, d])) })) };
}

/** Single media field (image or document). */
export function MediaField({
  value, onChange, accept = "image", aspect = "aspect-video",
}: {
  value: string | null; onChange: (id: string | null) => void; accept?: "image" | "any" | "document"; aspect?: string;
}) {
  const [open, setOpen] = useState(false);
  const { map, add } = useMediaPreviews([value]);
  const item = value ? map[value] : null;
  return (
    <div>
      {value ? (
        <div className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
          <div className={cn("relative w-full", aspect)}>{item ? <Thumb item={item} className="object-contain" /> : <span className="flex size-full items-center justify-center"><Spinner /></span>}</div>
          <div className="flex items-center justify-between gap-2 border-t border-zinc-200 bg-white px-2 py-1.5">
            <span className="truncate text-xs text-zinc-500">{item?.filename}</span>
            <span className="flex shrink-0 gap-1">
              <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Replace</Button>
              <Button size="icon-sm" variant="danger-ghost" aria-label="Remove" onClick={() => onChange(null)}><X /></Button>
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn("flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-zinc-200 text-sm text-zinc-500 transition hover:border-brand hover:text-brand-700", "py-6")}
        >
          <ImagePlus className="size-5" />
          {accept === "document" ? "Choose a document" : "Choose an image"}
        </button>
      )}
      <MediaPickerDialog open={open} onOpenChange={setOpen} accept={accept} onSelect={(items) => { add(items); onChange(items[0]?.id ?? null); }} />
    </div>
  );
}

/** Ordered list of media ids (galleries, collages). */
export function MediaListField({ value, onChange, max = 200 }: { value: string[]; onChange: (ids: string[]) => void; max?: number }) {
  const [open, setOpen] = useState(false);
  const { map, add } = useMediaPreviews(value);
  const move = (i: number, d: number) => {
    const next = [...value];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((id, i) => (
            <li key={`${id}-${i}`} className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
              {map[id] ? <Thumb item={map[id]} /> : <span className="flex size-full items-center justify-center"><Spinner /></span>}
              <span className="absolute inset-x-1 bottom-1 flex justify-between opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
                <span className="flex gap-0.5">
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded bg-white/90 p-1 shadow disabled:opacity-40" aria-label="Move earlier"><ArrowUp className="size-3 -rotate-90" /></button>
                  <button type="button" disabled={i === value.length - 1} onClick={() => move(i, 1)} className="rounded bg-white/90 p-1 shadow disabled:opacity-40" aria-label="Move later"><ArrowDown className="size-3 -rotate-90" /></button>
                </span>
                <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="rounded bg-white/90 p-1 text-red-600 shadow" aria-label="Remove"><Trash2 className="size-3" /></button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {value.length < max && (
        <Button size="sm" onClick={() => setOpen(true)}><ImagePlus /> Add images</Button>
      )}
      <MediaPickerDialog
        open={open}
        onOpenChange={setOpen}
        multiple={max > 1}
        onSelect={(items) => { add(items); onChange([...value, ...items.map((i) => i.id)].slice(0, max)); }}
      />
    </div>
  );
}
