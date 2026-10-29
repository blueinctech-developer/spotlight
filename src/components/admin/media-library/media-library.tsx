"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Grid2X2, ImageOff, List, Search, Trash2 } from "lucide-react";
import { bulkDeleteMedia, listLibrary, type LibraryItem } from "@/app/admin/actions/media";
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Select, Spinner, Switch, Table, Td, Th, cn } from "@/components/admin/ui";
import { Thumb, UploadZone, formatBytes } from "@/components/admin/media-picker";
import { MediaDetailDialog } from "./media-detail";

type View = "grid" | "list";
const VIEW_KEY = "snf-admin-media-view";

export function MediaLibrary({ canManage }: { canManage: boolean }) {
  const [view, setView] = useState<View>("grid");
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | "image" | "document" | "svg">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "name" | "size">("newest");
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [pending, start] = useTransition();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "grid" || v === "list") setView(v);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  };

  const load = useCallback(
    (p: number, append: boolean) => {
      start(async () => {
        const res = await listLibrary({ search, type, sort, unusedOnly, page: p });
        if (!res.ok) return void toast.error(res.error);
        setItems((prev) => (append ? [...prev, ...res.data.items] : res.data.items));
        setTotal(res.data.total);
        setHasMore(res.data.hasMore);
        setPage(p);
      });
    },
    [search, type, sort, unusedOnly],
  );

  useEffect(() => {
    const t = setTimeout(() => load(1, false), search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const runBulkDelete = async () => {
    setDeleting(true);
    const res = await bulkDeleteMedia({ ids: [...selected] });
    setDeleting(false);
    setConfirmBulk(false);
    if (!res.ok) return void toast.error(res.error);
    if (res.data.deleted) toast.success(`Deleted ${res.data.deleted} file${res.data.deleted === 1 ? "" : "s"}.`);
    if (res.data.skipped.length) toast.warning(`Skipped ${res.data.skipped.length} file(s) still in use: ${res.data.skipped.slice(0, 3).join(", ")}${res.data.skipped.length > 3 ? "…" : ""}`);
    setSelected(new Set());
    load(1, false);
  };

  return (
    <div className="space-y-5">
      <UploadZone compact onUploaded={(item) => setItems((s) => [{ ...item, title: null, usageCount: 0 }, ...s])} />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search file name, title or alt text…" className="pl-9" aria-label="Search media" />
          </div>
          <Select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="w-auto" aria-label="File type">
            <option value="all">All types</option>
            <option value="image">Images</option>
            <option value="svg">SVG</option>
            <option value="document">Documents</option>
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="w-auto" aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="size">Largest first</option>
          </Select>
          <Switch checked={unusedOnly} onCheckedChange={setUnusedOnly} label="Unused only" />
          <div className="ml-auto flex rounded-lg border border-zinc-200 p-0.5">
            <button type="button" aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => changeView("grid")} className={cn("rounded-md p-1.5", view === "grid" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100")}>
              <Grid2X2 className="size-4" />
            </button>
            <button type="button" aria-label="List view" aria-pressed={view === "list"} onClick={() => changeView("list")} className={cn("rounded-md p-1.5", view === "list" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100")}>
              <List className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex min-h-11 items-center gap-3 border-b border-zinc-100 px-4 py-2 text-sm text-zinc-500">
          <span>{total} file{total === 1 ? "" : "s"}</span>
          {pending && <Spinner />}
          {canManage && selected.size > 0 && (
            <span className="ml-auto flex items-center gap-2">
              <span>{selected.size} selected</span>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
              <Button size="sm" variant="danger" onClick={() => setConfirmBulk(true)}><Trash2 /> Delete selected</Button>
            </span>
          )}
        </div>

        {items.length === 0 && !pending ? (
          <EmptyState icon={<ImageOff />} title="No media found" description={search || unusedOnly || type !== "all" ? "Try clearing the filters." : "Upload images or documents to get started."} />
        ) : view === "grid" ? (
          <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-6">
            {items.map((item) => (
              <li key={item.id} className="group relative">
                <button
                  type="button"
                  onClick={() => setDetailId(item.id)}
                  className={cn("relative block aspect-square w-full overflow-hidden rounded-lg border bg-[repeating-conic-gradient(#f4f4f5_0%_25%,#fff_0%_50%)] bg-[length:16px_16px] outline-none focus-visible:ring-2 focus-visible:ring-brand", selected.has(item.id) ? "border-brand ring-2 ring-brand" : "border-zinc-200 hover:border-zinc-400")}
                  title={item.filename}
                >
                  <Thumb item={item} className="object-contain" />
                </button>
                {canManage && (
                  <label className={cn("absolute left-2 top-2 flex size-6 items-center justify-center rounded-md border border-zinc-300 bg-white/95 shadow-sm transition", selected.has(item.id) ? "opacity-100" : "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100")}>
                    <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} aria-label={`Select ${item.filename}`} className="accent-[var(--color-brand)]" />
                  </label>
                )}
                {item.usageCount === 0 && <span className="absolute right-2 top-2 rounded bg-white/90 px-1 text-[10px] font-medium text-zinc-500 shadow-sm">unused</span>}
                <p className="mt-1.5 truncate text-xs text-zinc-600">{item.filename}</p>
              </li>
            ))}
          </ul>
        ) : (
          <Table>
            <thead>
              <tr>
                {canManage && <Th className="w-10"><span className="sr-only">Select</span></Th>}
                <Th className="w-16">Preview</Th>
                <Th>File</Th>
                <Th>Type</Th>
                <Th>Dimensions</Th>
                <Th>Size</Th>
                <Th>Used</Th>
                <Th>Uploaded</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50">
                  {canManage && (
                    <Td><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} aria-label={`Select ${item.filename}`} /></Td>
                  )}
                  <Td><span className="block size-10 overflow-hidden rounded border border-zinc-200"><Thumb item={item} /></span></Td>
                  <Td>
                    <button type="button" className="text-left font-medium text-zinc-900 hover:text-brand-700" onClick={() => setDetailId(item.id)}>{item.filename}</button>
                    {!item.alt && item.mimeType.startsWith("image/") && <span className="ml-2"><Badge tone="amber">No alt text</Badge></span>}
                  </Td>
                  <Td className="text-xs">{item.mimeType}</Td>
                  <Td className="text-xs">{item.width && item.height ? `${item.width}×${item.height}` : "—"}</Td>
                  <Td className="text-xs">{formatBytes(item.size)}</Td>
                  <Td>{item.usageCount ? <Badge tone="green">{item.usageCount}</Badge> : <Badge>unused</Badge>}</Td>
                  <Td className="text-xs">{new Date(item.createdAt).toLocaleDateString()}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {hasMore && (
          <div className="flex justify-center border-t border-zinc-100 p-4">
            <Button size="sm" loading={pending} onClick={() => load(page + 1, true)}>Load more</Button>
          </div>
        )}
      </Card>

      <MediaDetailDialog
        id={detailId}
        canManage={canManage}
        onClose={() => setDetailId(null)}
        onChanged={(updated) => setItems((s) => s.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)))}
        onDeleted={(id) => {
          setItems((s) => s.filter((i) => i.id !== id));
          setTotal((t) => t - 1);
        }}
      />
      <ConfirmDialog
        open={confirmBulk}
        onOpenChange={setConfirmBulk}
        title={`Delete ${selected.size} file${selected.size === 1 ? "" : "s"}?`}
        description="Files that are still used on the site will be skipped. Deleted files cannot be recovered."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={() => void runBulkDelete()}
      />
    </div>
  );
}
