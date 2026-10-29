"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, Eye, History, Languages, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import {
  autosavePost, discardAutosave, duplicatePost, getRevision, savePost, trashPost, type PostFields,
} from "@/app/admin/actions/posts";
import {
  Badge, Button, Card, ConfirmDialog, Dialog, DropdownContent, DropdownItem, DropdownMenu, DropdownTrigger, Field, Input,
  Kbd, StatusBadge, Switch, Textarea, buttonVariants, cn, effectiveStatus,
} from "@/components/admin/ui";
import { RichTextEditor } from "@/components/admin/rich-text";
import { MediaField } from "@/components/admin/media-picker";
import { CategoryPicker, TagInput } from "./taxonomy-inputs";
import { SeoPanel } from "./seo-panel";

export type EditorFields = {
  title: string; slug: string; excerpt: string; content: string; featuredImageId: string | null;
  categoryIds: string[]; tagIds: string[]; authorDisplayName: string; seoTitle: string; seoDescription: string;
  canonicalUrl: string; ogTitle: string; ogDescription: string; ogImageId: string | null; noindex: boolean;
};

export type EditorInitial = {
  id: string | null;
  locale: "en" | "fr";
  status: string;
  publishedAt: string | null;
  updatedAt: string | null;
  fields: EditorFields;
  autosave: { savedAt: string; data: Partial<EditorFields> } | null;
  revisions: { id: string; createdAt: string; note: string | null; author: string }[];
  translation: { id: string; locale: "en" | "fr"; title: string } | null;
  translationOf: string | null;
};

type Term = { id: string; name: string };
type Intent = "draft" | "review" | "publish" | "update" | "unpublish";

function slugify(v: string) {
  return v.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}
/** ISO → value for <input type="datetime-local"> in the editor's local time zone. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fmt = (iso: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

function normalize(f: EditorFields): PostFields {
  return {
    ...f,
    excerpt: f.excerpt || null,
    authorDisplayName: f.authorDisplayName || null,
    seoTitle: f.seoTitle || null,
    seoDescription: f.seoDescription || null,
    canonicalUrl: f.canonicalUrl || null,
    ogTitle: f.ogTitle || null,
    ogDescription: f.ogDescription || null,
  };
}

export function PostEditor({
  initial, categories: initialCats, tags: initialTags, canPublish,
}: {
  initial: EditorInitial; categories: Term[]; tags: Term[]; canPublish: boolean; canDelete?: boolean;
}) {
  const router = useRouter();
  const [fields, setFields] = useState<EditorFields>(initial.fields);
  const [saved, setSaved] = useState(JSON.stringify(initial.fields));
  const [postId, setPostId] = useState(initial.id);
  const [status, setStatus] = useState(initial.status);
  const [publishedAt, setPublishedAt] = useState(toLocalInput(initial.publishedAt));
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [categories, setCategories] = useState(initialCats);
  const [tags, setTags] = useState(initialTags);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autosaveBanner, setAutosaveBanner] = useState(initial.autosave);
  const [lastAutosave, setLastAutosave] = useState<string | null>(null);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [pending, start] = useTransition();
  const [pendingIntent, setPendingIntent] = useState<Intent | null>(null);

  const dirty = JSON.stringify(fields) !== saved;
  const isPublished = status === "PUBLISHED";
  const eff = effectiveStatus({ status, publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null });
  const scheduledFuture = Boolean(publishedAt && new Date(publishedAt).getTime() > Date.now());
  const publicUrl = `${initial.locale === "fr" ? "/fr" : ""}/${fields.slug || slugify(fields.title) || "…"}/`;

  const set = <K extends keyof EditorFields>(key: K, value: EditorFields[K]) => {
    setFields((f) => {
      const next = { ...f, [key]: value };
      if (key === "title" && !slugTouched) next.slug = slugify(String(value));
      return next;
    });
    if (errors[key as string]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  // ───── Save ─────
  const save = useCallback(
    (intent: Intent) => {
      if (!fields.title.trim()) {
        setErrors({ title: "Add a title." });
        toast.error("Add a title before saving.");
        return;
      }
      setPendingIntent(intent);
      start(async () => {
        const res = await savePost({
          ...normalize(fields),
          id: postId ?? undefined,
          locale: initial.locale,
          translationOf: postId ? undefined : initial.translationOf ?? undefined,
          intent,
          publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
        });
        setPendingIntent(null);
        if (!res.ok) {
          setErrors(res.fieldErrors ?? {});
          toast.error(res.error);
          return;
        }
        const d = res.data;
        setSaved(JSON.stringify({ ...fields, slug: d.slug }));
        setFields((f) => ({ ...f, slug: d.slug }));
        setStatus(d.status);
        setPublishedAt(toLocalInput(d.publishedAt));
        setSlugTouched(true);
        setAutosaveBanner(null);
        setErrors({});
        toast.success(d.message === "Created" ? "Draft created" : d.message);
        if (!postId) {
          setPostId(d.id);
          router.replace(`/admin/posts/${d.id}/`);
        } else router.refresh();
      });
    },
    [fields, postId, publishedAt, initial.locale, initial.translationOf, router],
  );

  const primaryIntent: Intent = canPublish ? (isPublished ? "update" : "publish") : "review";
  const quickIntent: Intent = isPublished ? (canPublish ? "update" : "draft") : "draft";

  // Ctrl/Cmd+S saves (as draft, or updates a published post).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!pending) save(quickIntent);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, quickIntent, pending]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [dirty]);

  // Autosave every 15 seconds while there are unsaved changes (existing posts only).
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;
  useEffect(() => {
    if (!postId || !dirty) return;
    const t = setInterval(async () => {
      const res = await autosavePost({ ...normalize(fieldsRef.current), id: postId });
      if (res.ok) setLastAutosave(res.data.savedAt);
    }, 15_000);
    return () => clearInterval(t);
  }, [postId, dirty]);

  const restoreRevision = (revisionId: string) =>
    start(async () => {
      const res = await getRevision({ revisionId });
      if (!res.ok) return void toast.error(res.error);
      const d = res.data;
      setFields((f) => ({
        ...f,
        ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v ?? (typeof f[k as keyof EditorFields] === "string" ? "" : v)])),
      }) as EditorFields);
      setRevisionsOpen(false);
      toast.info("Revision loaded into the editor. Save to keep it.");
    });

  const backLink = (
    <Link href="/admin/posts/" className="mb-2 inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-800">
      <ArrowLeft className="size-3.5" /> All posts
    </Link>
  );

  const words = useMemo(() => fields.content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length, [fields.content]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {backLink}
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900">{postId ? "Edit post" : initial.translationOf ? "Translate post" : "New post"}</h1>
            <Badge tone={initial.locale === "fr" ? "blue" : "neutral"}>{initial.locale === "fr" ? "Français" : "English"}</Badge>
            <StatusBadge status={eff} />
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {dirty ? "Unsaved changes" : postId ? "All changes saved" : "Not saved yet"}
            {lastAutosave && dirty && ` · autosaved ${fmt(lastAutosave)}`}
            {" · "}
            <Kbd>Ctrl</Kbd> + <Kbd>S</Kbd> to save
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {postId && (
            <a href={`/admin/preview/post/${postId}/${dirty ? "?autosave=1" : ""}`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "ghost" })}
              onClick={async (e) => {
                if (!dirty) return;
                e.preventDefault();
                const res = await autosavePost({ ...normalize(fields), id: postId });
                if (res.ok) window.open(`/admin/preview/post/${postId}/?autosave=1`, "_blank", "noopener");
                else toast.error(res.error);
              }}
            >
              <Eye /> Preview
            </a>
          )}
          {!isPublished && (
            <Button onClick={() => save("draft")} loading={pending && pendingIntent === "draft"} disabled={pending}>Save draft</Button>
          )}
          <Button variant="primary" onClick={() => save(primaryIntent)} loading={pending && pendingIntent === primaryIntent} disabled={pending}>
            {primaryIntent === "update" ? "Update" : primaryIntent === "review" ? "Submit for review" : scheduledFuture ? "Schedule" : "Publish"}
          </Button>
          {postId && (
            <DropdownMenu>
              <DropdownTrigger className={buttonVariants({ variant: "secondary", size: "icon" })} aria-label="More actions"><MoreHorizontal /></DropdownTrigger>
              <DropdownContent>
                <DropdownItem onSelect={() => setRevisionsOpen(true)}><History /> Revisions ({initial.revisions.length})</DropdownItem>
                <DropdownItem
                  onSelect={() => start(async () => {
                    const res = await duplicatePost({ id: postId });
                    if (!res.ok) return void toast.error(res.error);
                    toast.success("Duplicated as a new draft");
                    router.push(`/admin/posts/${res.data.id}/`);
                  })}
                >
                  <Copy /> Duplicate
                </DropdownItem>
                {canPublish && isPublished && <DropdownItem onSelect={() => save("unpublish")}><RotateCcw /> Unpublish</DropdownItem>}
                <DropdownItem destructive onSelect={() => setTrashOpen(true)}><Trash2 /> Move to trash</DropdownItem>
              </DropdownContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {autosaveBanner && (
        <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>There is an autosave of this post from {fmt(autosaveBanner.savedAt)} that is newer than the saved version.</span>
          <span className="flex gap-2">
            <Button size="sm" variant="primary" onClick={() => {
              setFields((f) => ({ ...f, ...Object.fromEntries(Object.entries(autosaveBanner.data).map(([k, v]) => [k, v ?? (typeof f[k as keyof EditorFields] === "string" ? "" : v)])) }) as EditorFields);
              setAutosaveBanner(null);
              toast.info("Autosave restored. Save to keep it.");
            }}>Restore autosave</Button>
            <Button size="sm" onClick={() => { if (postId) void discardAutosave({ id: postId }); setAutosaveBanner(null); }}>Discard</Button>
          </span>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          <Card className="p-5">
            <label htmlFor="post-title" className="sr-only">Title</label>
            <input
              id="post-title"
              value={fields.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Add title"
              aria-invalid={errors.title ? true : undefined}
              className="w-full border-0 bg-transparent text-[26px] font-semibold tracking-tight text-zinc-900 outline-none placeholder:text-zinc-300"
            />
            {errors.title && <p className="text-xs text-red-600">{errors.title}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px] text-zinc-500">
              <span>Permalink:</span>
              <span className="text-zinc-500">{initial.locale === "fr" ? "/fr/" : "/"}</span>
              <input
                aria-label="URL slug"
                value={fields.slug}
                onChange={(e) => { setSlugTouched(true); set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")); }}
                onBlur={() => set("slug", slugify(fields.slug))}
                className={cn("min-w-[160px] flex-1 rounded border border-transparent bg-zinc-50 px-1.5 py-0.5 text-zinc-800 outline-none focus:border-brand", errors.slug && "border-red-400")}
              />
              <span className="text-zinc-500">/</span>
              {isPublished && !scheduledFuture && (
                <a href={publicUrl} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">View</a>
              )}
            </div>
            {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug}</p>}
          </Card>

          <div>
            <RichTextEditor value={fields.content} onChange={(html) => set("content", html)} placeholder="Write your article…" className="[&_.ProseMirror]:min-h-[420px]" />
            <p className="mt-1.5 text-right text-xs text-zinc-500">{words} words</p>
          </div>

          <Card className="p-5">
            <Field label="Excerpt" hint="Shown on post cards and used as the meta description when none is set.">
              {(p) => <Textarea {...p} value={fields.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={3} maxLength={1000} />}
            </Field>
          </Card>

          <SeoPanel
            fields={fields}
            onChange={set}
            url={publicUrl}
            errors={errors}
          />
        </div>

        <aside className="space-y-4">
          <Card>
            <div className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900">Publish</div>
            <div className="space-y-3 px-4 py-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Status</span>
                <StatusBadge status={eff} />
              </div>
              <Field
                label={isPublished ? "Published on" : "Publish date"}
                hint={canPublish ? "Leave empty to publish immediately. A future date schedules the post." : "Editors decide the final publication date."}
              >
                {(p) => (
                  <Input {...p} type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
                )}
              </Field>
              {scheduledFuture && <p className="rounded-md bg-sky-50 px-2.5 py-1.5 text-xs text-sky-800">Scheduled for {fmt(new Date(publishedAt).toISOString())}.</p>}
              {status === "PENDING_REVIEW" && <p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">Waiting for an editor to review and publish.</p>}
              {!canPublish && <p className="text-xs text-zinc-500">As an author you can save drafts and submit posts for review.</p>}
              {canPublish && status === "PENDING_REVIEW" && (
                <Button size="sm" className="w-full" onClick={() => save("draft")} disabled={pending}>Return to draft</Button>
              )}
            </div>
          </Card>

          <Card>
            <div className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900">Language</div>
            <div className="space-y-2 px-4 py-4 text-sm">
              <p className="text-zinc-600">This is the <strong>{initial.locale === "fr" ? "French" : "English"}</strong> version.</p>
              {initial.translation ? (
                <Link href={`/admin/posts/${initial.translation.id}/`} className="inline-flex items-center gap-1.5 text-brand-700 hover:underline">
                  <Languages className="size-4" /> {initial.translation.locale === "fr" ? "French" : "English"} version: {initial.translation.title}
                </Link>
              ) : postId ? (
                <Link href={`/admin/posts/new/?translationOf=${postId}&locale=${initial.locale === "en" ? "fr" : "en"}`} className="inline-flex items-center gap-1.5 text-amber-700 hover:underline">
                  <Languages className="size-4" /> Add {initial.locale === "en" ? "French" : "English"} version
                </Link>
              ) : (
                <p className="text-xs text-zinc-500">Save this post to add a translation.</p>
              )}
            </div>
          </Card>

          <Card>
            <div className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900">Categories</div>
            <div className="px-4 py-4">
              <CategoryPicker
                all={categories}
                value={fields.categoryIds}
                onChange={(ids) => set("categoryIds", ids)}
                onCreated={(c) => setCategories((list) => [...list, c].sort((a, b) => a.name.localeCompare(b.name)))}
              />
            </div>
          </Card>

          <Card>
            <div className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900">Tags</div>
            <div className="px-4 py-4">
              <TagInput
                all={tags}
                value={fields.tagIds}
                onChange={(ids) => set("tagIds", ids)}
                onCreated={(tg) => setTags((list) => [...list, tg])}
              />
            </div>
          </Card>

          <Card>
            <div className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900">Featured image</div>
            <div className="px-4 py-4">
              <MediaField value={fields.featuredImageId} onChange={(id) => set("featuredImageId", id)} />
            </div>
          </Card>

          <Card>
            <div className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900">Byline</div>
            <div className="space-y-3 px-4 py-4">
              <Field label="Author name shown on the site" hint="For example “Spotlight Nigeria Press Team”.">
                {(p) => <Input {...p} value={fields.authorDisplayName} onChange={(e) => set("authorDisplayName", e.target.value)} maxLength={150} />}
              </Field>
              <Switch checked={fields.noindex} onCheckedChange={(v) => set("noindex", v)} label="Hide from search engines" />
            </div>
          </Card>
        </aside>
      </div>

      <Dialog open={revisionsOpen} onOpenChange={setRevisionsOpen} title="Revisions" description="Each save keeps a snapshot. Loading one replaces the editor content; nothing changes until you save." size="md">
        {initial.revisions.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">No revisions yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {initial.revisions.map((r, i) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-800">{fmt(r.createdAt)} {i === 0 && <Badge tone="green" className="ml-1">Current</Badge>}</p>
                  <p className="truncate text-xs text-zinc-500">{r.author}{r.note ? ` · ${r.note}` : ""}</p>
                </div>
                {i > 0 && <Button size="sm" onClick={() => restoreRevision(r.id)} disabled={pending}><RotateCcw /> Load</Button>}
              </li>
            ))}
          </ul>
        )}
      </Dialog>

      <ConfirmDialog
        open={trashOpen}
        onOpenChange={setTrashOpen}
        title="Move this post to the trash?"
        description={isPublished ? "It will be removed from the website immediately. You can restore it from the trash." : "You can restore it from the trash later."}
        confirmLabel="Move to trash"
        destructive
        loading={pending}
        onConfirm={() => start(async () => {
          if (!postId) return;
          const res = await trashPost({ id: postId });
          if (!res.ok) return void toast.error(res.error);
          setSaved(JSON.stringify(fields));
          toast.success("Moved to trash");
          router.push("/admin/posts/");
        })}
      />
    </div>
  );
}
