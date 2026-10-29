"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Copy, Eye, EyeOff, FileText, GripVertical, Link2, ListTree, Plus, Trash2,
} from "lucide-react";
import { saveMenu, type MenuItemInput } from "@/app/admin/actions/navigation";
import { Badge, Button, Card, CardHeader, ConfirmDialog, Dialog, Field, Input, Select, Switch, cn } from "@/components/admin/ui";
import { LOCATION_INFO, MENU_LOCATIONS, type MenuLocation } from "./locations";

export type MenuData = { location: MenuLocation; locale: "en" | "fr"; name: string; items: MenuItemInput[] };
export type PageOption = { group: string; locale: string; title: string; path: string; status: string };

const keyOf = (m: { location: string; locale: string }) => `${m.locale}:${m.location}`;
const newKey = () => `new-${Math.random().toString(36).slice(2, 10)}`;

/** Children always follow their parent; re-derive parents from position after a move. */
function normalize(items: MenuItemInput[]): MenuItemInput[] {
  let lastRoot: string | null = null;
  return items.map((it, i) => {
    if (!it.parentKey || i === 0) {
      lastRoot = it.key;
      return it.parentKey ? { ...it, parentKey: null } : it;
    }
    return { ...it, parentKey: lastRoot };
  });
}

function blockOf(items: MenuItemInput[], index: number): [number, number] {
  // A root moves together with its children.
  if (items[index].parentKey) return [index, index + 1];
  let end = index + 1;
  while (end < items.length && items[end].parentKey === items[index].key) end++;
  return [index, end];
}

export function MenuManager({ menus, pages }: { menus: MenuData[]; pages: PageOption[] }) {
  const [locale, setLocale] = useState<"en" | "fr">("en");
  const [location, setLocation] = useState<MenuLocation>("header");
  const [saved, setSaved] = useState<Record<string, MenuData>>(() => Object.fromEntries(menus.map((m) => [keyOf(m), m])));
  const [drafts, setDrafts] = useState<Record<string, MenuData>>(() => Object.fromEntries(menus.map((m) => [keyOf(m), m])));
  const [saving, setSaving] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [adding, setAdding] = useState<null | "page" | "link" | "heading">(null);
  const [confirmCopy, setConfirmCopy] = useState(false);

  const k = `${locale}:${location}`;
  const draft = drafts[k] ?? { location, locale, name: "", items: [] };
  const dirtyKeys = useMemo(
    () => Object.keys(drafts).filter((dk) => JSON.stringify(drafts[dk]) !== JSON.stringify(saved[dk])),
    [drafts, saved],
  );
  const dirty = dirtyKeys.includes(k);

  useEffect(() => {
    if (!dirtyKeys.length) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirtyKeys.length]);

  const update = (fn: (d: MenuData) => MenuData) => setDrafts((all) => ({ ...all, [k]: fn(all[k] ?? draft) }));
  const setItems = (items: MenuItemInput[]) => update((d) => ({ ...d, items: normalize(items) }));

  const pagesForLocale = pages.filter((p) => p.locale === locale);
  const pageLabel = (group: string | null) => {
    const p = pages.find((x) => x.group === group && x.locale === locale) ?? pages.find((x) => x.group === group);
    return p ? `/${locale === "fr" ? "fr/" : ""}${p.path ? p.path + "/" : ""}` : "missing page";
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const items = draft.items;
    const from = items.findIndex((i) => i.key === e.active.id);
    const to = items.findIndex((i) => i.key === e.over!.id);
    if (from < 0 || to < 0) return;
    const moving = items[from];
    if (moving.parentKey) {
      setItems(arrayMove(items, from, to));
      return;
    }
    const [s, end] = blockOf(items, from);
    const block = items.slice(s, end);
    const rest = [...items.slice(0, s), ...items.slice(end)];
    let insertAt = rest.findIndex((i) => i.key === e.over!.id);
    // Drop roots before/after whole blocks, never inside another item's children.
    if (to > from) insertAt = blockOf(rest, insertAt)[1];
    else while (insertAt > 0 && rest[insertAt].parentKey) insertAt--;
    setItems([...rest.slice(0, insertAt), ...block, ...rest.slice(insertAt)]);
  };

  const move = (index: number, dir: -1 | 1) => {
    const items = draft.items;
    const it = items[index];
    if (it.parentKey) {
      const j = index + dir;
      if (j < 0 || j >= items.length || items[j].parentKey !== it.parentKey) return;
      setItems(arrayMove(items, index, j));
      return;
    }
    const [s, end] = blockOf(items, index);
    const block = items.slice(s, end);
    const rest = [...items.slice(0, s), ...items.slice(end)];
    const roots = rest.map((x, i) => (!x.parentKey ? i : -1)).filter((i) => i >= 0);
    const posAmongRoots = items.slice(0, s).filter((x) => !x.parentKey).length;
    const target = posAmongRoots + dir;
    if (target < 0 || target > roots.length) return;
    const insertAt = target === roots.length ? rest.length : roots[target];
    setItems([...rest.slice(0, insertAt), ...block, ...rest.slice(insertAt)]);
  };

  const indent = (index: number) => {
    const items = draft.items;
    const it = items[index];
    if (it.parentKey || index === 0) return;
    if (items.some((x) => x.parentKey === it.key)) return toast.error("Move this item's own children out first (one dropdown level only).");
    setItems(items.map((x, i) => (i === index ? { ...x, parentKey: "pending" } : x)));
  };
  const outdent = (index: number) => {
    const items = draft.items;
    const it = items[index];
    if (!it.parentKey) return;
    // Move it after the last sibling so it becomes a root without adopting siblings.
    let end = index + 1;
    while (end < items.length && items[end].parentKey === it.parentKey) end++;
    const rest = items.filter((_, i) => i !== index);
    const pos = end - 1;
    const next = [...rest.slice(0, pos), { ...it, parentKey: null }, ...rest.slice(pos)];
    setItems(next);
  };

  const removeItem = (key: string) => setItems(draft.items.filter((i) => i.key !== key && i.parentKey !== key));

  const save = async () => {
    setSaving(true);
    const res = await saveMenu({ location, locale, name: draft.name, items: draft.items });
    setSaving(false);
    if (!res.ok) return void toast.error(res.error);
    setSaved((s) => ({ ...s, [k]: draft }));
    toast.success("Menu saved. The website has been updated.");
  };

  const copyFromEnglish = () => {
    const en = drafts[`en:${location}`];
    if (!en) return;
    const map = new Map<string, string>();
    const items = en.items.map((i) => {
      const nk = newKey();
      map.set(i.key, nk);
      return { ...i, key: nk };
    }).map((i) => ({ ...i, parentKey: i.parentKey ? map.get(i.parentKey) ?? null : null }));
    update((d) => ({ ...d, name: d.name || en.name, items }));
    setConfirmCopy(false);
    toast.info("Structure copied. Translate the labels, then save.");
  };

  const editing = draft.items.find((i) => i.key === editKey) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <div className="space-y-4">
        <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5" role="tablist" aria-label="Language">
          {(["en", "fr"] as const).map((l) => (
            <button key={l} role="tab" aria-selected={locale === l} type="button" onClick={() => setLocale(l)} className={cn("flex-1 rounded-md py-1.5 text-sm font-medium", locale === l ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50")}>
              {l === "en" ? "English" : "Français"}
            </button>
          ))}
        </div>
        <Card>
          <ul className="p-1.5">
            {MENU_LOCATIONS.map((loc) => {
              const dk = `${locale}:${loc}`;
              return (
                <li key={loc}>
                  <button
                    type="button"
                    onClick={() => setLocation(loc)}
                    aria-current={loc === location}
                    className={cn("flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm", loc === location ? "bg-zinc-100 font-medium text-zinc-900" : "text-zinc-600 hover:bg-zinc-50")}
                  >
                    <span>{LOCATION_INFO[loc].label}</span>
                    {dirtyKeys.includes(dk) ? <Badge tone="amber">Unsaved</Badge> : <span className="text-xs text-zinc-600">{drafts[dk]?.items.length ?? 0}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={`${LOCATION_INFO[location].label} · ${locale === "en" ? "English" : "Français"}`}
          description={LOCATION_INFO[location].hint}
          action={
            <div className="flex gap-2">
              {locale === "fr" && <Button size="sm" onClick={() => setConfirmCopy(true)}><Copy /> Copy from English</Button>}
              <Button size="sm" variant="primary" disabled={!dirty} loading={saving} onClick={() => void save()}>Save menu</Button>
            </div>
          }
        />
        <div className="space-y-5 p-5 [&_label[for]]:block">
          <Field label="Menu name" hint={location.startsWith("footer-") && location !== "footer-legal" ? "Shown publicly as the footer column heading." : "For your reference."}>
            {(p) => <Input {...p} value={draft.name} onChange={(e) => update((d) => ({ ...d, name: e.target.value }))} className="max-w-sm" />}
          </Field>

          {draft.items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-500">This menu is empty. Add pages or links below.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={draft.items.map((i) => i.key)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-1.5">
                  {draft.items.map((it, i) => (
                    <SortableRow
                      key={it.key}
                      item={it}
                      target={it.pageGroup ? pageLabel(it.pageGroup) : it.url || "#"}
                      isPage={Boolean(it.pageGroup)}
                      onEdit={() => setEditKey(it.key)}
                      onUp={() => move(i, -1)}
                      onDown={() => move(i, 1)}
                      onIndent={() => indent(i)}
                      onOutdent={() => outdent(i)}
                      onToggle={() => setItems(draft.items.map((x) => (x.key === it.key ? { ...x, visible: !x.visible } : x)))}
                      onRemove={() => removeItem(it.key)}
                      canIndent={!it.parentKey && i > 0 && location === "header"}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}

          <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
            <Button size="sm" onClick={() => setAdding("page")}><FileText /> Add page</Button>
            <Button size="sm" onClick={() => setAdding("link")}><Link2 /> Add custom link</Button>
            {location === "header" && <Button size="sm" onClick={() => setAdding("heading")}><ListTree /> Add dropdown heading</Button>}
          </div>
          <p className="text-xs text-zinc-500">Drag rows to reorder, or use the arrow buttons. Use → to place an item inside the dropdown above it.</p>
        </div>
      </Card>

      <AddItemDialog
        mode={adding}
        pages={pagesForLocale}
        onClose={() => setAdding(null)}
        onAdd={(item) => { setItems([...draft.items, { ...item, key: newKey(), parentKey: null, visible: true }]); setAdding(null); }}
      />
      <EditItemDialog
        item={editing}
        pages={pagesForLocale}
        onClose={() => setEditKey(null)}
        onSave={(next) => { setItems(draft.items.map((x) => (x.key === next.key ? next : x))); setEditKey(null); }}
      />
      <ConfirmDialog
        open={confirmCopy}
        onOpenChange={setConfirmCopy}
        title="Copy the English structure?"
        description="This replaces the unsaved French items with a copy of the English menu. Page links will point to the French versions of the same pages when they exist."
        confirmLabel="Copy structure"
        onConfirm={copyFromEnglish}
      />
    </div>
  );
}

function SortableRow(props: {
  item: MenuItemInput; target: string; isPage: boolean; canIndent: boolean;
  onEdit: () => void; onUp: () => void; onDown: () => void; onIndent: () => void; onOutdent: () => void; onToggle: () => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.item.key });
  const it = props.item;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-white px-2 py-1.5 shadow-sm",
        it.parentKey && "ml-8",
        isDragging ? "z-10 border-brand shadow-md" : "border-zinc-200",
        !it.visible && "opacity-60",
      )}
    >
      <button type="button" {...attributes} {...listeners} className="cursor-grab rounded p-1 text-zinc-500 hover:bg-zinc-100 active:cursor-grabbing" aria-label={`Drag ${it.label}`}>
        <GripVertical className="size-4" />
      </button>
      <button type="button" onClick={props.onEdit} className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-zinc-900">{it.label}</span>
          {props.isPage ? <Badge tone="blue">Page</Badge> : it.url === "#" ? <Badge>Dropdown</Badge> : <Badge tone="violet">Link</Badge>}
          {it.openInNewTab && <Badge>New tab</Badge>}
          {!it.visible && <Badge tone="amber">Hidden</Badge>}
        </span>
        <span className="block truncate font-mono text-xs text-zinc-500">{props.target}</span>
      </button>
      <span className="flex shrink-0 items-center">
        <Button size="icon-sm" variant="ghost" aria-label="Move up" onClick={props.onUp}><ArrowUp /></Button>
        <Button size="icon-sm" variant="ghost" aria-label="Move down" onClick={props.onDown}><ArrowDown /></Button>
        {it.parentKey ? (
          <Button size="icon-sm" variant="ghost" aria-label="Move out of dropdown" onClick={props.onOutdent}><ChevronLeft /></Button>
        ) : (
          <Button size="icon-sm" variant="ghost" aria-label="Move into the dropdown above" disabled={!props.canIndent} onClick={props.onIndent}><ChevronRight /></Button>
        )}
        <Button size="icon-sm" variant="ghost" aria-label={it.visible ? "Hide" : "Show"} onClick={props.onToggle}>{it.visible ? <Eye /> : <EyeOff />}</Button>
        <Button size="icon-sm" variant="danger-ghost" aria-label={`Remove ${it.label}`} onClick={props.onRemove}><Trash2 /></Button>
      </span>
    </li>
  );
}

type NewItem = Omit<MenuItemInput, "key" | "parentKey" | "visible">;

function AddItemDialog({ mode, pages, onClose, onAdd }: { mode: null | "page" | "link" | "heading"; pages: PageOption[]; onClose: () => void; onAdd: (i: NewItem) => void }) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [group, setGroup] = useState("");
  const [newTab, setNewTab] = useState(false);
  useEffect(() => {
    setLabel(""); setUrl(""); setGroup(""); setNewTab(false);
  }, [mode]);
  const page = pages.find((p) => p.group === group);
  const urlOk = /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i.test(url.trim());
  const valid = mode === "page" ? Boolean(group) : mode === "heading" ? Boolean(label.trim()) : Boolean(label.trim()) && urlOk;
  const submit = () => {
    if (!valid) return;
    if (mode === "page") onAdd({ label: label.trim() || page!.title, url: null, pageGroup: group, openInNewTab: false });
    else if (mode === "heading") onAdd({ label: label.trim(), url: "#", pageGroup: null, openInNewTab: false });
    else onAdd({ label: label.trim(), url: url.trim(), pageGroup: null, openInNewTab: newTab || /^https?:/i.test(url.trim()) });
  };
  return (
    <Dialog
      open={mode !== null}
      onOpenChange={(v) => !v && onClose()}
      title={mode === "page" ? "Add a page" : mode === "heading" ? "Add a dropdown heading" : "Add a custom link"}
      size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!valid} onClick={submit}><Plus /> Add to menu</Button></>}
    >
      <div className="space-y-4">
        {mode === "page" && (
          <Field label="Page">
            {(p) => (
              <Select {...p} value={group} onChange={(e) => { setGroup(e.target.value); const pg = pages.find((x) => x.group === e.target.value); if (pg && !label) setLabel(pg.title); }}>
                <option value="">Choose a page…</option>
                {pages.map((pg) => (
                  <option key={pg.group} value={pg.group}>{pg.title} — /{pg.path}{pg.status !== "PUBLISHED" ? ` (${pg.status.toLowerCase()})` : ""}</option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field label="Label" hint={mode === "page" ? "Defaults to the page title." : mode === "heading" ? "Items placed under it appear in its dropdown." : undefined}>
          {(p) => <Input {...p} value={label} onChange={(e) => setLabel(e.target.value)} />}
        </Field>
        {mode === "link" && (
          <>
            <Field label="URL" hint="A path like /press-releases/ or a full https:// address." error={url && !urlOk ? "Enter a path starting with / or a full https:// link." : undefined}>
              {(p) => <Input {...p} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />}
            </Field>
            <Switch checked={newTab} onCheckedChange={setNewTab} label="Open in a new tab" />
          </>
        )}
      </div>
    </Dialog>
  );
}

function EditItemDialog({ item, pages, onClose, onSave }: { item: MenuItemInput | null; pages: PageOption[]; onClose: () => void; onSave: (i: MenuItemInput) => void }) {
  const [form, setForm] = useState<MenuItemInput | null>(item);
  useEffect(() => setForm(item), [item]);
  if (!form) return <Dialog open={false} onOpenChange={onClose} title="Edit item" />;
  const urlOk = form.pageGroup || /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i.test((form.url ?? "").trim());
  const type = form.pageGroup ? "page" : "link";
  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(v) => !v && onClose()}
      title="Edit menu item"
      size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!form.label.trim() || !urlOk} onClick={() => onSave({ ...form, label: form.label.trim() })}>Apply</Button></>}
    >
      <div className="space-y-4">
        <Field label="Label">{(p) => <Input {...p} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />}</Field>
        <Field label="Links to">
          {(p) => (
            <Select {...p} value={type} onChange={(e) => setForm(e.target.value === "page" ? { ...form, pageGroup: pages[0]?.group ?? null, url: null } : { ...form, pageGroup: null, url: form.url ?? "/" })}>
              <option value="page">A page on this site</option>
              <option value="link">A custom URL</option>
            </Select>
          )}
        </Field>
        {type === "page" ? (
          <Field label="Page">
            {(p) => (
              <Select {...p} value={form.pageGroup ?? ""} onChange={(e) => setForm({ ...form, pageGroup: e.target.value })}>
                {pages.map((pg) => <option key={pg.group} value={pg.group}>{pg.title} — /{pg.path}</option>)}
              </Select>
            )}
          </Field>
        ) : (
          <Field label="URL" hint='Use "#" for a dropdown heading that is not itself a link.' error={!urlOk ? "Enter a path starting with / or a full https:// link." : undefined}>
            {(p) => <Input {...p} value={form.url ?? ""} onChange={(e) => setForm({ ...form, url: e.target.value })} />}
          </Field>
        )}
        <Switch checked={form.openInNewTab} onCheckedChange={(v) => setForm({ ...form, openInNewTab: v })} label="Open in a new tab" />
        <Switch checked={form.visible} onCheckedChange={(v) => setForm({ ...form, visible: v })} label="Visible on the website" />
      </div>
    </Dialog>
  );
}
