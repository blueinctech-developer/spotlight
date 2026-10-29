"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowDownUp, Copy, ExternalLink, Eye, Languages, MoreHorizontal, Newspaper, Pencil, RotateCcw, Trash2, Upload, Undo2 } from "lucide-react";
import { bulkPosts, deletePost, duplicatePost, restorePost, setPostStatus, trashPost } from "@/app/admin/actions/posts";
import {
  Badge, Button, ConfirmDialog, DropdownContent, DropdownItem, DropdownMenu, DropdownSeparator, DropdownTrigger,
  EmptyState, Card, StatusBadge, Table, Td, Th, effectiveStatus, Select, buttonVariants,
} from "@/components/admin/ui";

export type PostRowData = {
  id: string; title: string; slug: string; locale: "en" | "fr"; status: string; publishedAt: string | null; updatedAt: string;
  deletedAt: string | null; author: string; categories: string[]; translationId: string | null; canEdit: boolean;
};

const fmt = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "—";

export function publicPostUrl(slug: string, locale: string) {
  return locale === "fr" ? `/fr/${slug}/` : `/${slug}/`;
}

export function PostsTable({
  rows, trashView, canPublish, canDelete, sortHref, sort, dir, emptyHint,
}: {
  rows: PostRowData[]; trashView: boolean; canPublish: boolean; canDelete: boolean;
  sortHref: Record<"title" | "date" | "updated", string>; sort: string; dir: string; emptyHint: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [bulk, setBulk] = useState("");
  const [confirm, setConfirm] = useState<{ title: string; description: string; run: () => Promise<void>; destructive?: boolean } | null>(null);
  const [pending, start] = useTransition();

  const allSelected = rows.length > 0 && selected.length === rows.length;
  const run = (fn: () => Promise<{ ok: boolean; error?: string } | { ok: true; data: unknown }>, success: string) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(success);
        setSelected([]);
        router.refresh();
      } else toast.error((res as { error: string }).error);
    });

  const applyBulk = () => {
    if (!bulk || !selected.length) return;
    const go = async () => {
      const res = await bulkPosts({ ids: selected, action: bulk as "trash" });
      if (!res.ok) return void toast.error(res.error);
      const { done, failed, firstError } = res.data;
      if (done) toast.success(`${done} post${done > 1 ? "s" : ""} updated`);
      if (failed) toast.error(`${failed} could not be changed: ${firstError}`);
      setSelected([]);
      setBulk("");
      router.refresh();
    };
    if (bulk === "delete") {
      setConfirm({ title: `Delete ${selected.length} post(s) permanently?`, description: "This cannot be undone. Revisions are deleted too.", destructive: true, run: go });
    } else start(go);
  };

  const sortIcon = (key: string) => (sort === key ? <span className="text-zinc-500">{dir === "asc" ? "↑" : "↓"}</span> : <ArrowDownUp className="size-3 text-zinc-300" />);

  return (
    <Card>
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 bg-brand/5 px-4 py-2.5 text-sm">
          <span className="font-medium text-zinc-700">{selected.length} selected</span>
          <Select value={bulk} onChange={(e) => setBulk(e.target.value)} className="h-8 w-auto" aria-label="Bulk action">
            <option value="">Bulk action…</option>
            {trashView ? (
              <>
                <option value="restore">Restore</option>
                {canDelete && <option value="delete">Delete permanently</option>}
              </>
            ) : (
              <>
                {canPublish && <option value="publish">Publish</option>}
                {canPublish && <option value="unpublish">Unpublish</option>}
                <option value="trash">Move to trash</option>
              </>
            )}
          </Select>
          <Button size="sm" variant="primary" disabled={!bulk} loading={pending} onClick={applyBulk}>Apply</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Clear</Button>
        </div>
      )}
      {rows.length === 0 ? (
        <EmptyState
          icon={<Newspaper />}
          title={emptyHint}
          description={trashView ? "Posts moved to the trash appear here and can be restored." : "Write a news article or press release."}
          action={!trashView && <Link href="/admin/posts/new/" className={buttonVariants({ variant: "primary" })}>New post</Link>}
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
                  onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])}
                  className="size-4 accent-[var(--color-brand)]"
                />
              </Th>
              <Th><Link href={sortHref.title} className="inline-flex items-center gap-1">Title {sortIcon("title")}</Link></Th>
              <Th className="hidden md:table-cell">Author</Th>
              <Th className="hidden lg:table-cell">Categories</Th>
              <Th>Status</Th>
              <Th className="hidden sm:table-cell"><Link href={sortHref.date} className="inline-flex items-center gap-1">Date {sortIcon("date")}</Link></Th>
              <Th className="hidden xl:table-cell"><Link href={sortHref.updated} className="inline-flex items-center gap-1">Updated {sortIcon("updated")}</Link></Th>
              <Th className="w-12"><span className="sr-only">Actions</span></Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const status = effectiveStatus(r);
              const live = status === "PUBLISHED";
              return (
                <tr key={r.id} className="group hover:bg-zinc-50/60">
                  <Td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.title}`}
                      checked={selected.includes(r.id)}
                      onChange={(e) => setSelected((s) => (e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id)))}
                      className="size-4 accent-[var(--color-brand)]"
                    />
                  </Td>
                  <Td className="max-w-[420px]">
                    <div className="flex items-start gap-2">
                      <Badge tone={r.locale === "fr" ? "blue" : "neutral"} className="mt-0.5 shrink-0">{r.locale}</Badge>
                      <div className="min-w-0">
                        {r.canEdit && !r.deletedAt ? (
                          <Link href={`/admin/posts/${r.id}/`} className="line-clamp-2 font-medium text-zinc-900 hover:text-brand-700">{r.title}</Link>
                        ) : (
                          <span className="line-clamp-2 font-medium text-zinc-900">{r.title}</span>
                        )}
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
                          <span className="truncate">{publicPostUrl(r.slug, r.locale)}</span>
                          {r.locale === "en" && !r.translationId && !r.deletedAt && (
                            <Link href={`/admin/posts/new/?translationOf=${r.id}&locale=fr`} className="inline-flex items-center gap-1 font-medium text-amber-700 hover:underline">
                              <Languages className="size-3" /> FR missing · Add French version
                            </Link>
                          )}
                          {r.translationId && (
                            <Link href={`/admin/posts/${r.translationId}/`} className="inline-flex min-h-6 items-center gap-1 py-1 hover:text-zinc-700">
                              <Languages className="size-3" /> {r.locale === "en" ? "FR" : "EN"} version
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </Td>
                  <Td className="hidden md:table-cell text-zinc-600">{r.author}</Td>
                  <Td className="hidden lg:table-cell text-xs text-zinc-500">{r.categories.join(", ") || "—"}</Td>
                  <Td><StatusBadge status={status} /></Td>
                  <Td className="hidden whitespace-nowrap text-xs text-zinc-500 sm:table-cell">{fmt(r.publishedAt)}</Td>
                  <Td className="hidden whitespace-nowrap text-xs text-zinc-500 xl:table-cell">{fmt(r.updatedAt)}</Td>
                  <Td>
                    <DropdownMenu>
                      <DropdownTrigger className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label={`Actions for ${r.title}`}>
                        <MoreHorizontal />
                      </DropdownTrigger>
                      <DropdownContent>
                        {r.deletedAt ? (
                          <>
                            <DropdownItem onSelect={() => run(() => restorePost({ id: r.id }), "Post restored")}><RotateCcw /> Restore</DropdownItem>
                            {canDelete && (
                              <DropdownItem
                                destructive
                                onSelect={() => setConfirm({ title: "Delete this post permanently?", description: `“${r.title}” and its revisions will be deleted. This cannot be undone.`, destructive: true, run: async () => run(() => deletePost({ id: r.id }), "Post deleted") })}
                              >
                                <Trash2 /> Delete permanently
                              </DropdownItem>
                            )}
                          </>
                        ) : (
                          <>
                            {r.canEdit && <DropdownItem asChild><Link href={`/admin/posts/${r.id}/`}><Pencil /> Edit</Link></DropdownItem>}
                            {live ? (
                              <DropdownItem asChild><a href={publicPostUrl(r.slug, r.locale)} target="_blank" rel="noreferrer"><ExternalLink /> View on site</a></DropdownItem>
                            ) : (
                              r.canEdit && <DropdownItem asChild><a href={`/admin/preview/post/${r.id}/`} target="_blank" rel="noreferrer"><Eye /> Preview</a></DropdownItem>
                            )}
                            <DropdownItem onSelect={() => run(() => duplicatePost({ id: r.id }), "Post duplicated as a draft")}><Copy /> Duplicate</DropdownItem>
                            {canPublish && !live && status !== "SCHEDULED" && (
                              <DropdownItem onSelect={() => run(() => setPostStatus({ id: r.id, action: "publish" }), "Post published")}><Upload /> Publish now</DropdownItem>
                            )}
                            {canPublish && (live || status === "SCHEDULED") && (
                              <DropdownItem onSelect={() => run(() => setPostStatus({ id: r.id, action: "unpublish" }), "Post unpublished")}><Undo2 /> Unpublish</DropdownItem>
                            )}
                            <DropdownSeparator />
                            {r.canEdit && <DropdownItem destructive onSelect={() => run(() => trashPost({ id: r.id }), "Moved to trash")}><Trash2 /> Move to trash</DropdownItem>}
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
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={confirm?.title ?? ""}
        description={confirm?.description}
        destructive={confirm?.destructive}
        confirmLabel="Delete"
        loading={pending}
        onConfirm={() => {
          const c = confirm;
          setConfirm(null);
          if (c) start(c.run);
        }}
      />
    </Card>
  );
}
