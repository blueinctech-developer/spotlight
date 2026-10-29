"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Clock, ExternalLink, Eye, History, Languages, MoreHorizontal, PanelRightClose, PanelRightOpen, Settings2, SlidersHorizontal, Trash2, Copy, Upload, EyeOff, Monitor } from "lucide-react";
import { createBlock, type Block, type BlockType } from "@/lib/blocks/schema";
import type { ReferenceOptions } from "@/app/admin/actions/references";
import { getParentOptions, getReferenceOptions } from "@/app/admin/actions/references";
import { autosavePage, discardAutosave, duplicatePage, publishPage, savePage, trashPage, unpublishPage } from "@/app/admin/actions/pages";
import {
  Badge, Button, ConfirmDialog, DropdownContent, DropdownItem, DropdownMenu, DropdownSeparator, DropdownTrigger, Kbd, Spinner, StatusBadge, cn, effectiveStatus,
} from "@/components/admin/ui";
import { localizePath } from "@/lib/i18n";
import { BlockLibrary, SortableBlockList, type ListActions } from "./block-list";
import { BlockSettings } from "./block-forms";
import { BLOCK_META } from "./catalog";
import { DocumentSettings, type PageDoc } from "./document-settings";
import { RevisionsPanel } from "./revisions-panel";
import { duplicateBlock, findBlock, findContainer, indexIn, insertBlock, moveBlock, removeBlock, reorder, updateBlock, type AnyBlock, type Container } from "./tree";
import { newBlockId } from "./util";

export type EditorProps = {
  page: PageDoc & { id: string; locale: "en" | "fr"; path: string; translationGroup: string; updatedAt: string };
  blocks: Block[];
  autosave: { savedAt: string; doc: Partial<PageDoc>; blocks: Block[] } | null;
  translation: { id: string | null; locale: "en" | "fr" };
  invalidBlocks: string[];
  canPublish: boolean;
  canDelete: boolean;
};

type Panel = "block" | "page" | "revisions";
const AUTOSAVE_MS = 15_000;

function blockErrorIds(blocks: Block[], fieldErrors: Record<string, string>): Set<string> {
  const ids = new Set<string>();
  for (const key of Object.keys(fieldErrors)) {
    const m = key.match(/^blocks\.(\d+)(?:\.columns\.(\d+)\.blocks\.(\d+))?/);
    if (!m) continue;
    const top = blocks[Number(m[1])];
    if (!top) continue;
    if (m[2] !== undefined && top.type === "columns") {
      const inner = top.columns[Number(m[2])]?.blocks[Number(m[3])];
      if (inner) ids.add(inner.id);
    } else ids.add(top.id);
  }
  return ids;
}

export function PageEditor(props: EditorProps) {
  const router = useRouter();
  const [doc, setDoc] = useState<PageDoc>(() => ({ ...props.page }));
  const [blocks, setBlocks] = useState<Block[]>(props.blocks);
  const [savedStatus, setSavedStatus] = useState(props.page.status);
  const [savedPublishedAt, setSavedPublishedAt] = useState(props.page.publishedAt);
  const [path, setPath] = useState(props.page.path);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autosavedAt, setAutosavedAt] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>("page");
  const [panelOpen, setPanelOpen] = useState(true);
  const [library, setLibrary] = useState<{ container: Container; index: number; leafOnly: boolean } | null>(null);
  const [refs, setRefs] = useState<ReferenceOptions>({ partners: [], speakers: [], testimonials: [], events: [], links: [] });
  const [parents, setParents] = useState<{ id: string; title: string; path: string }[]>([]);
  const [autosaveOffer, setAutosaveOffer] = useState(props.autosave);
  const [confirmTrash, setConfirmTrash] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [pending, start] = useTransition();
  const versionRef = useRef(0);
  const isHome = props.page.path === "";

  useEffect(() => {
    void getReferenceOptions({ locale: props.page.locale }).then((r) => r.ok && setRefs(r.data));
    void getParentOptions({ locale: props.page.locale, excludeId: props.page.id }).then((r) => r.ok && setParents(r.data));
  }, [props.page.locale, props.page.id]);

  useEffect(() => {
    if (props.invalidBlocks.length) toast.warning(`Some stored blocks were invalid and have been left out: ${props.invalidBlocks.join("; ")}`);
  }, [props.invalidBlocks]);

  const markDirty = () => {
    versionRef.current++;
    setDirty(true);
  };
  const updateDoc = (patch: Partial<PageDoc>) => { setDoc((d) => ({ ...d, ...patch })); markDirty(); };
  const updateBlocks = (fn: (b: Block[]) => Block[]) => { setBlocks((b) => fn(b)); markDirty(); };

  const payload = useCallback(
    (override?: Partial<PageDoc>) => {
      const d = { ...doc, ...override };
      return {
        id: props.page.id,
        title: d.title,
        slug: d.slug,
        parentId: d.parentId,
        excerpt: d.excerpt,
        featuredImageId: d.featuredImageId,
        blocks,
        status: d.status,
        publishedAt: d.publishedAt,
        menuOrder: d.menuOrder,
        headerVariant: d.headerVariant,
        footerVariant: d.footerVariant,
        seoTitle: d.seoTitle,
        seoDescription: d.seoDescription,
        canonicalUrl: d.canonicalUrl,
        ogTitle: d.ogTitle,
        ogDescription: d.ogDescription,
        ogImageId: d.ogImageId,
        noindex: d.noindex,
      };
    },
    [doc, blocks, props.page.id],
  );

  const save = useCallback(
    async (override?: Partial<PageDoc>, successMsg = "Saved") => {
      setSaving(true);
      const version = versionRef.current;
      const res = await savePage(payload(override));
      setSaving(false);
      if (!res.ok) {
        setFieldErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        const errIds = blockErrorIds(blocks, res.fieldErrors ?? {});
        if (errIds.size) {
          const first = [...errIds][0];
          setSelectedId(first);
          setPanel("block");
          setPanelOpen(true);
        } else if (res.fieldErrors && Object.keys(res.fieldErrors).some((k) => !k.startsWith("blocks"))) {
          setPanel("page");
          setPanelOpen(true);
        }
        return false;
      }
      setFieldErrors({});
      if (override) setDoc((d) => ({ ...d, ...override }));
      setDoc((d) => ({ ...d, status: res.data.status as PageDoc["status"], publishedAt: res.data.publishedAt }));
      setSavedStatus(res.data.status as PageDoc["status"]);
      setSavedPublishedAt(res.data.publishedAt);
      setPath(res.data.path);
      if (versionRef.current === version) setDirty(false);
      setAutosaveOffer(null);
      setPreviewKey((k) => k + 1);
      toast.success(successMsg);
      return true;
    },
    [payload, blocks],
  );

  const autosave = useCallback(async () => {
    const res = await autosavePage({ id: props.page.id, data: payload() as unknown as Record<string, unknown> });
    if (res.ok) setAutosavedAt(res.data.savedAt);
    return res.ok;
  }, [payload, props.page.id]);

  // Periodic autosave while there are unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => void autosave().then(() => setPreviewKey((k) => k + 1)), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [dirty, doc, blocks, autosave]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Ctrl/Cmd+S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving) void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, saving]);

  const openPreview = async () => {
    // Open the tab synchronously (popup blockers), then point it at the preview once autosaved.
    const win = window.open("about:blank", "_blank");
    const ok = await autosave();
    const url = `/admin/preview/page/${props.page.id}/?autosave=1`;
    if (win) win.location.href = ok ? url : `/admin/preview/page/${props.page.id}/`;
    else window.open(url, "_blank");
  };

  const errorIds = useMemo(() => blockErrorIds(blocks, fieldErrors), [blocks, fieldErrors]);
  const selected = selectedId ? findBlock(blocks, selectedId) : null;

  const actions: ListActions = {
    selectedId,
    errors: errorIds,
    onSelect: (id) => { setSelectedId(id); setPanel("block"); setPanelOpen(true); },
    onMove: (id, d) => updateBlocks((b) => moveBlock(b, id, d)),
    onReorder: (c, from, to) => updateBlocks((b) => reorder(b, c, from, to)),
    onDuplicate: (id) => {
      const res = duplicateBlock(blocks, id);
      setBlocks(res.blocks);
      markDirty();
      if (res.newId) setSelectedId(res.newId);
    },
    onDelete: (id) => {
      const block = findBlock(blocks, id);
      const container = findContainer(blocks, id);
      const index = indexIn(blocks, id);
      if (!block || !container) return;
      updateBlocks((b) => removeBlock(b, id));
      if (selectedId === id) setSelectedId(null);
      toast(`${BLOCK_META[block.type]?.label ?? "Block"} deleted`, {
        action: { label: "Undo", onClick: () => updateBlocks((b) => insertBlock(b, container, index, block)) },
      });
    },
    onToggleHidden: (id) => updateBlocks((b) => updateBlock(b, id, (x) => ({ ...x, hidden: !x.hidden }))),
    onInsertRequest: (container, index, leafOnly) => setLibrary({ container, index, leafOnly }),
  };

  const insertType = (type: BlockType) => {
    if (!library) return;
    const block = createBlock(type, newBlockId()) as AnyBlock;
    updateBlocks((b) => insertBlock(b, library.container, library.index, block));
    setSelectedId(block.id);
    setPanel("block");
    setPanelOpen(true);
  };

  const status = effectiveStatus({ status: savedStatus, publishedAt: savedPublishedAt });
  const liveUrl = localizePath(path, props.page.locale);
  const isPublished = savedStatus === "PUBLISHED";

  const runAction = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      if (dirty && !(await save(undefined, "Changes saved"))) return;
      const r = await fn();
      if (r.ok) { toast.success(msg); router.refresh(); } else toast.error(r.error);
    });

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col rounded-xl border border-zinc-200 bg-white">
      {/* Top bar */}
      <header className="sticky top-14 z-20 flex flex-wrap items-center gap-2 rounded-t-xl border-b border-zinc-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:top-0 lg:px-5">
        <Link href="/admin/pages/" className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900" aria-label="Back to pages">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge tone={props.page.locale === "fr" ? "blue" : "neutral"}>{props.page.locale}</Badge>
            <h1 className="truncate text-[15px] font-semibold text-zinc-900">{doc.title || "Untitled page"}</h1>
            <StatusBadge status={status} />
          </div>
          <p className="truncate font-mono text-[11px] text-zinc-500">{liveUrl}</p>
        </div>
        <span className="hidden items-center gap-1.5 text-xs text-zinc-500 md:flex" aria-live="polite">
          {saving ? (<><Spinner className="size-3" /> Saving…</>) : dirty ? (<><span className="size-1.5 rounded-full bg-amber-500" /> Unsaved changes{autosavedAt && " · autosaved"}</>) : (<><Check className="size-3.5 text-emerald-600" /> All changes saved</>)}
        </span>
        <Button size="sm" variant="ghost" onClick={() => setShowPreview((v) => !v)} className="hidden xl:inline-flex" aria-pressed={showPreview}>
          <Monitor /> {showPreview ? "Hide preview" : "Inline preview"}
        </Button>
        <Button size="sm" onClick={() => void openPreview()}><Eye /> Preview</Button>
        {isPublished ? (
          <Button size="sm" variant="primary" onClick={() => void save(undefined, "Page updated")} loading={saving}>Update</Button>
        ) : (
          <>
            <Button size="sm" onClick={() => void save(undefined, "Draft saved")} loading={saving}>Save draft</Button>
            {props.canPublish && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  const future = doc.publishedAt && new Date(doc.publishedAt).getTime() > Date.now();
                  void save({ status: "PUBLISHED" }, future ? "Page scheduled" : "Page published");
                }}
                disabled={saving}
              >
                <Upload /> {doc.publishedAt && new Date(doc.publishedAt).getTime() > Date.now() ? "Schedule" : "Publish"}
              </Button>
            )}
          </>
        )}
        <DropdownMenu>
          <DropdownTrigger asChild><Button size="icon-sm" variant="ghost" aria-label="More actions"><MoreHorizontal /></Button></DropdownTrigger>
          <DropdownContent>
            {isPublished && <DropdownItem asChild><a href={liveUrl} target="_blank" rel="noreferrer"><ExternalLink /> View live page</a></DropdownItem>}
            {props.translation.id ? (
              <DropdownItem asChild><Link href={`/admin/pages/${props.translation.id}/`}><Languages /> Edit {props.translation.locale === "fr" ? "French" : "English"} version</Link></DropdownItem>
            ) : (
              <DropdownItem disabled><Languages /> No {props.translation.locale === "fr" ? "French" : "English"} version yet (see Page settings)</DropdownItem>
            )}
            <DropdownItem onSelect={() => start(async () => { const r = await duplicatePage({ id: props.page.id }); if (r.ok) router.push(`/admin/pages/${r.data.id}/`); else toast.error(r.error); })}><Copy /> Duplicate</DropdownItem>
            {isPublished && props.canPublish && !isHome && (
              <DropdownItem onSelect={() => runAction(() => unpublishPage({ id: props.page.id }), "Page unpublished")}><EyeOff /> Unpublish</DropdownItem>
            )}
            {!isPublished && props.canPublish && (
              <DropdownItem onSelect={() => runAction(() => publishPage({ id: props.page.id }), "Page published")}><Upload /> Publish saved version</DropdownItem>
            )}
            {props.canDelete && !isHome && (
              <>
                <DropdownSeparator />
                <DropdownItem destructive onSelect={() => setConfirmTrash(true)}><Trash2 /> Move to trash</DropdownItem>
              </>
            )}
          </DropdownContent>
        </DropdownMenu>
        <Button size="icon-sm" variant="ghost" onClick={() => setPanelOpen((v) => !v)} aria-label={panelOpen ? "Hide settings panel" : "Show settings panel"}>
          {panelOpen ? <PanelRightClose /> : <PanelRightOpen />}
        </Button>
      </header>

      {autosaveOffer && (
        <div className="flex flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-6 py-2 text-[13px] text-amber-900" role="status">
          <Clock className="size-4" />
          <span className="flex-1">You have unsaved changes from {new Date(autosaveOffer.savedAt).toLocaleString()} that are newer than this version.</span>
          <Button
            size="sm"
            onClick={() => {
              setDoc((d) => ({ ...d, ...autosaveOffer.doc }));
              setBlocks(autosaveOffer.blocks);
              markDirty();
              setAutosaveOffer(null);
              toast.success("Autosaved changes restored — review and save.");
            }}
          >
            Restore them
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setAutosaveOffer(null); void discardAutosave({ id: props.page.id }); }}>Discard</Button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Canvas: block list */}
        <section className="min-w-0 flex-1 rounded-bl-xl bg-zinc-50 px-4 py-6 lg:px-8" aria-label="Page content">
          <div className={cn("mx-auto", showPreview ? "max-w-xl" : "max-w-3xl")}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-zinc-700">Content blocks <span className="font-normal text-zinc-500">({blocks.length})</span></h2>
              <p className="hidden text-xs text-zinc-500 sm:block">Drag to reorder · <Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> to save</p>
            </div>
            <SortableBlockList blocks={blocks} container={{ kind: "root" }} actions={actions} />
          </div>
        </section>

        {showPreview && (
          <section className="hidden min-w-0 flex-1 border-l border-zinc-200 bg-white xl:block" aria-label="Preview">
            <iframe key={previewKey} title="Page preview" src={`/admin/preview/page/${props.page.id}/?autosave=1&embed=1`} className="size-full min-h-[70vh]" />
          </section>
        )}

        {/* Settings panel */}
        {panelOpen && (
          <aside className="fixed inset-y-0 right-0 z-30 flex w-[min(420px,100vw)] flex-col border-l border-zinc-200 bg-white shadow-xl lg:sticky lg:top-[57px] lg:z-0 lg:h-[calc(100vh-57px)] lg:w-[400px] lg:shrink-0 lg:self-start lg:shadow-none" aria-label="Settings">
            <div className="flex items-center gap-1 border-b border-zinc-100 px-2 pt-2">
              {([
                ["block", "Block", SlidersHorizontal],
                ["page", "Page", Settings2],
                ["revisions", "History", History],
              ] as const).map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPanel(key)}
                  className={cn("-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium", panel === key ? "border-brand text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800")}
                  aria-pressed={panel === key}
                >
                  <Icon className="size-3.5" /> {label}
                </button>
              ))}
              <button type="button" onClick={() => setPanelOpen(false)} className="ml-auto rounded p-1.5 text-zinc-500 hover:bg-zinc-100 lg:hidden" aria-label="Close panel">
                <PanelRightClose className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {panel === "block" &&
                (selected ? (
                  <>
                    <div className="mb-4 flex items-center gap-2">
                      {(() => { const M = BLOCK_META[selected.type]; return <M.icon className="size-4 text-brand" />; })()}
                      <h2 className="text-sm font-semibold text-zinc-900">{BLOCK_META[selected.type].label}</h2>
                    </div>
                    {errorIds.has(selected.id) && (
                      <ul className="mb-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                        {Object.entries(fieldErrors)
                          .filter(([k]) => blockErrorIds(blocks, { [k]: "x" }).has(selected.id))
                          .map(([k, v]) => <li key={k}><span className="font-mono">{k.split(".").slice(-1)[0]}</span>: {v}</li>)}
                      </ul>
                    )}
                    <BlockSettings key={selected.id} block={selected} refs={refs} onChange={(nb) => updateBlocks((b) => updateBlock(b, selected.id, () => nb))} />
                  </>
                ) : (
                  <p className="py-10 text-center text-sm text-zinc-500">Select a block to edit its settings.</p>
                ))}
              {panel === "page" && (
                <DocumentSettings
                  doc={doc}
                  onChange={updateDoc}
                  locale={props.page.locale}
                  isHome={isHome}
                  parents={parents}
                  errors={fieldErrors}
                  translation={props.translation}
                  translationGroup={props.page.translationGroup}
                  canPublish={props.canPublish}
                />
              )}
              {panel === "revisions" && <RevisionsPanel pageId={props.page.id} dirty={dirty} onRestored={() => { setDirty(false); router.refresh(); }} />}
            </div>
          </aside>
        )}
      </div>

      <BlockLibrary open={!!library} onOpenChange={(v) => !v && setLibrary(null)} onPick={insertType} leafOnly={library?.leafOnly ?? false} />
      <ConfirmDialog
        open={confirmTrash}
        onOpenChange={setConfirmTrash}
        title="Move this page to the trash?"
        description="It will be unpublished immediately. You can restore it from the trash."
        destructive
        confirmLabel="Move to trash"
        loading={pending}
        onConfirm={() => start(async () => {
          const r = await trashPage({ id: props.page.id });
          if (r.ok) { setDirty(false); toast.success("Moved to trash"); router.push("/admin/pages/"); } else toast.error(r.error);
        })}
      />
    </div>
  );
}
