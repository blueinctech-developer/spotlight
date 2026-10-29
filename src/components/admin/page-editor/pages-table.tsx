"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Copy, Eye, ExternalLink, FileText, Languages, MoreHorizontal, Pencil, RotateCcw, Search, Trash2, Upload, EyeOff } from "lucide-react";
import {
  Badge, Button, Card, ConfirmDialog, DropdownContent, DropdownItem, DropdownMenu, DropdownSeparator, DropdownTrigger,
  EmptyState, Input, Select, StatusBadge, Table, Td, Th, cn, effectiveStatus,
} from "@/components/admin/ui";
import { bulkPages, createPage, deletePagePermanently, duplicatePage, restorePage, trashPage } from "@/app/admin/actions/pages";
import { localizePath } from "@/lib/i18n";

export type PageRow = {
  id: string; title: string; path: string; locale: "en" | "fr"; status: string; publishedAt: string | null; updatedAt: string;
  deletedAt: string | null; author: string | null; translationGroup: string; translationId: string | null; depth: number;
};

const fmt = (iso: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

export function PagesTable(props: {
  rows: PageRow[]; total: number; page: number; perPage: number;
  filters: { q: string; status: string; lang: string; sort: string; dir: string };
  tabs: { key: string; label: string; count?: number }[];
  canDelete: boolean; canPublish: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<null | { title: string; description: string; run: () => Promise<void>; destructive?: boolean; label: string }>(null);
  const [search, setSearch] = useState(props.filters.q);
  const isTrash = props.filters.status === "trash";

  const setParam = (updates: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "" || (k === "status" && v === "all") || (k === "lang" && v === "all")) p.delete(k);
      else p.set(k, v);
    }
    if (!("page" in updates)) p.delete("page");
    setSelected([]);
    router.push(`${pathname}?${p.toString()}`);
  };

  const run = (fn: () => Promise<{ ok: boolean; error?: string } | { ok: true; data: unknown }>, success: string) =>
    start(async () => {
      const res = (await fn()) as { ok: boolean; error?: string };
      if (res.ok) {
        toast.success(success);
        setSelected([]);
        router.refresh();
      } else toast.error(res.error ?? "Failed");
    });

  const bulk = (action: "publish" | "unpublish" | "trash" | "restore" | "delete") => {
    const exec = async () =>
      run(async () => {
        const r = await bulkPages({ ids: selected, action });
        if (r.ok && r.data.skipped.length) toast.message(`Skipped: ${r.data.skipped.join(", ")}`);
        return r;
      }, `${action[0].toUpperCase()}${action.slice(1)}: done`);
    if (action === "delete") {
      setConfirm({ title: `Delete ${selected.length} page(s) permanently?`, description: "This cannot be undone. Revisions are deleted too.", destructive: true, label: "Delete permanently", run: async () => exec() });
    } else exec();
  };

  const sortHeader = (key: string, label: string) => {
    const active = props.filters.sort === key;
    const nextDir = active && props.filters.dir === "asc" ? "desc" : "asc";
    return (
      <button type="button" className="inline-flex items-center gap-1 hover:text-zinc-900" onClick={() => setParam({ sort: key, dir: nextDir })} aria-label={`Sort by ${label}`}>
        {label}
        {active && (props.filters.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    );
  };

  const totalPages = Math.max(1, Math.ceil(props.total / props.perPage));
  const allSelected = props.rows.length > 0 && selected.length === props.rows.length;

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-100 px-3 pt-2">
        {props.tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setParam({ status: t.key })}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-[13px] font-medium",
              props.filters.status === t.key ? "border-brand text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800",
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 text-zinc-500">{t.count}</span>}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <form
          className="relative min-w-[220px] flex-1"
          onSubmit={(e) => { e.preventDefault(); setParam({ q: search }); }}
          role="search"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or URL…" className="pl-9" aria-label="Search pages" />
        </form>
        <Select value={props.filters.lang} onChange={(e) => setParam({ lang: e.target.value })} className="w-40" aria-label="Language">
          <option value="all">All languages</option>
          <option value="en">English</option>
          <option value="fr">French</option>
        </Select>
        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-zinc-100 px-2 py-1">
            <span className="px-1 text-[13px] text-zinc-600">{selected.length} selected</span>
            {isTrash ? (
              <>
                {props.canDelete && <Button size="sm" onClick={() => bulk("restore")} loading={pending}><RotateCcw /> Restore</Button>}
                {props.canDelete && <Button size="sm" variant="danger" onClick={() => bulk("delete")}><Trash2 /> Delete</Button>}
              </>
            ) : (
              <>
                {props.canPublish && <Button size="sm" onClick={() => bulk("publish")} loading={pending}><Upload /> Publish</Button>}
                {props.canPublish && <Button size="sm" onClick={() => bulk("unpublish")}><EyeOff /> Unpublish</Button>}
                {props.canDelete && <Button size="sm" variant="danger-ghost" onClick={() => bulk("trash")}><Trash2 /> Trash</Button>}
              </>
            )}
          </div>
        )}
      </div>

      {props.rows.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title={isTrash ? "The trash is empty" : "No pages found"}
          description={props.filters.q ? "Try a different search or filter." : isTrash ? "Pages you move to the trash appear here." : "Create your first page."}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th className="w-10">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allSelected}
                  onChange={(e) => setSelected(e.target.checked ? props.rows.map((r) => r.id) : [])}
                  className="size-4 accent-brand"
                />
              </Th>
              <Th>{sortHeader("title", "Title")}</Th>
              <Th>{sortHeader("path", "URL")}</Th>
              <Th>Status</Th>
              <Th className="hidden md:table-cell">{sortHeader("published", "Published")}</Th>
              <Th className="hidden lg:table-cell">{sortHeader("updated", "Last updated")}</Th>
              <Th className="w-12"><span className="sr-only">Actions</span></Th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((r) => {
              const status = effectiveStatus(r);
              const url = localizePath(r.path, r.locale);
              return (
                <tr key={r.id} className={cn("hover:bg-zinc-50/70", selected.includes(r.id) && "bg-brand/5")}>
                  <Td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.title}`}
                      checked={selected.includes(r.id)}
                      onChange={(e) => setSelected((s) => (e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id)))}
                      className="size-4 accent-brand"
                    />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2" style={{ paddingLeft: r.depth * 20 }}>
                      {r.depth > 0 && <span className="text-zinc-300">└</span>}
                      <Badge tone={r.locale === "fr" ? "blue" : "neutral"}>{r.locale}</Badge>
                      {isTrash ? (
                        <span className="font-medium text-zinc-500">{r.title}</span>
                      ) : (
                        <Link href={`/admin/pages/${r.id}/`} className="font-medium text-zinc-900 hover:text-brand-700">{r.title}</Link>
                      )}
                      {!r.translationId && !isTrash && (
                        <Badge tone="amber" title="No translation yet">{r.locale === "en" ? "FR" : "EN"} missing</Badge>
                      )}
                    </div>
                    {r.author && <p className="mt-0.5 pl-0 text-xs text-zinc-500" style={{ paddingLeft: r.depth * 20 }}>by {r.author}</p>}
                  </Td>
                  <Td className="font-mono text-xs text-zinc-500">{url}</Td>
                  <Td><StatusBadge status={status} /></Td>
                  <Td className="hidden whitespace-nowrap text-xs text-zinc-500 md:table-cell">{r.publishedAt ? fmt(r.publishedAt) : "—"}</Td>
                  <Td className="hidden whitespace-nowrap text-xs text-zinc-500 lg:table-cell">{fmt(r.updatedAt)}</Td>
                  <Td>
                    <DropdownMenu>
                      <DropdownTrigger asChild>
                        <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${r.title}`}><MoreHorizontal /></Button>
                      </DropdownTrigger>
                      <DropdownContent>
                        {isTrash ? (
                          <>
                            <DropdownItem disabled={!props.canDelete} onSelect={() => run(() => restorePage({ id: r.id }), "Page restored as draft")}><RotateCcw /> Restore</DropdownItem>
                            <DropdownItem
                              destructive
                              disabled={!props.canDelete}
                              onSelect={() => setConfirm({ title: `Delete “${r.title}” permanently?`, description: "This cannot be undone.", destructive: true, label: "Delete permanently", run: async () => run(() => deletePagePermanently({ id: r.id }), "Page deleted") })}
                            >
                              <Trash2 /> Delete permanently
                            </DropdownItem>
                          </>
                        ) : (
                          <>
                            <DropdownItem asChild><Link href={`/admin/pages/${r.id}/`}><Pencil /> Edit</Link></DropdownItem>
                            <DropdownItem asChild><a href={`/admin/preview/page/${r.id}/`} target="_blank" rel="noreferrer"><Eye /> Preview</a></DropdownItem>
                            {status === "PUBLISHED" && <DropdownItem asChild><a href={url} target="_blank" rel="noreferrer"><ExternalLink /> View live</a></DropdownItem>}
                            <DropdownItem
                              onSelect={() => start(async () => {
                                const res = await duplicatePage({ id: r.id });
                                if (res.ok) { toast.success("Page duplicated"); router.push(`/admin/pages/${res.data.id}/`); } else toast.error(res.error);
                              })}
                            >
                              <Copy /> Duplicate
                            </DropdownItem>
                            {r.translationId ? (
                              <DropdownItem asChild><Link href={`/admin/pages/${r.translationId}/`}><Languages /> Edit {r.locale === "en" ? "French" : "English"} version</Link></DropdownItem>
                            ) : (
                              <DropdownItem
                                onSelect={() => start(async () => {
                                  const target = r.locale === "en" ? "fr" : "en";
                                  const slug = r.path.split("/").pop() ?? "";
                                  const res = await createPage({ title: r.title, slug, locale: target, translationOf: r.translationGroup });
                                  if (res.ok) { toast.success("Translation created as a draft (content copied for translation)"); router.push(`/admin/pages/${res.data.id}/`); } else toast.error(res.error);
                                })}
                              >
                                <Languages /> Add {r.locale === "en" ? "French" : "English"} version
                              </DropdownItem>
                            )}
                            {props.canDelete && r.path !== "" && (
                              <>
                                <DropdownSeparator />
                                <DropdownItem destructive onSelect={() => run(() => trashPage({ id: r.id }), "Moved to trash")}><Trash2 /> Move to trash</DropdownItem>
                              </>
                            )}
                          </>
                        )}
                      </DropdownContent>
                    </DropdownMenu>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-[13px] text-zinc-500">
          <span>
            {(props.page - 1) * props.perPage + 1}–{Math.min(props.total, props.page * props.perPage)} of {props.total}
          </span>
          <span className="flex gap-2">
            <Button size="sm" disabled={props.page <= 1} onClick={() => setParam({ page: String(props.page - 1) })}>Previous</Button>
            <Button size="sm" disabled={props.page >= totalPages} onClick={() => setParam({ page: String(props.page + 1) })}>Next</Button>
          </span>
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(v) => !v && setConfirm(null)}
          title={confirm.title}
          description={confirm.description}
          destructive={confirm.destructive}
          confirmLabel={confirm.label}
          loading={pending}
          onConfirm={async () => { await confirm.run(); setConfirm(null); }}
        />
      )}
    </Card>
  );
}
