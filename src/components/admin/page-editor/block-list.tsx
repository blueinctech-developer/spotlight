"use client";

import { useMemo, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, GripVertical, Plus, Search, Trash2, AlertCircle } from "lucide-react";
import type { BlockType } from "@/lib/blocks/schema";
import { Badge, Button, Dialog, Input, Tooltip, cn } from "@/components/admin/ui";
import { BLOCK_META, CATEGORIES, FALLBACK_ICON, summarize } from "./catalog";
import type { AnyBlock, Container } from "./tree";

export type ListActions = {
  selectedId: string | null;
  errors: Set<string>;
  onSelect: (id: string) => void;
  onMove: (id: string, delta: number) => void;
  onReorder: (container: Container, from: number, to: number) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onInsertRequest: (container: Container, index: number, leafOnly: boolean) => void;
};

function InsertLine({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div className="group relative flex h-4 items-center justify-center">
      <span className="absolute inset-x-6 top-1/2 h-px bg-transparent transition group-hover:bg-brand/40 group-focus-within:bg-brand/40" />
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="relative z-10 flex size-6 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 opacity-0 shadow-sm transition hover:border-brand hover:text-brand focus:opacity-100 group-hover:opacity-100"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

function BlockCard({ block, index, count, actions, nested }: { block: AnyBlock; index: number; count: number; actions: ListActions; nested?: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const meta = BLOCK_META[block.type];
  const Icon = meta?.icon ?? FALLBACK_ICON;
  const selected = actions.selectedId === block.id;
  const hasError = actions.errors.has(block.id);
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group/card rounded-lg border bg-white transition-shadow",
        selected ? "border-brand shadow-[0_0_0_3px_rgba(33,179,84,0.15)]" : "border-zinc-200 hover:border-zinc-300",
        isDragging && "z-10 shadow-lg",
        block.hidden && "bg-zinc-50",
      )}
    >
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="cursor-grab rounded p-1 text-zinc-300 hover:bg-zinc-100 hover:text-zinc-600 active:cursor-grabbing"
          aria-label={`Drag to reorder ${meta?.label ?? block.type} (use space and arrow keys)`}
        >
          <GripVertical className="size-4" />
        </button>
        <button type="button" onClick={() => actions.onSelect(block.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-pressed={selected}>
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", selected ? "bg-brand/10 text-brand-700" : "bg-zinc-100 text-zinc-500")}>
            <Icon className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-zinc-900">{meta?.label ?? block.type}</span>
              {block.hidden && <Badge tone="neutral">Hidden</Badge>}
              {hasError && <AlertCircle className="size-3.5 text-red-500" aria-label="Has errors" />}
            </span>
            <span className={cn("block truncate text-xs", block.hidden ? "text-zinc-500" : "text-zinc-500")}>{summarize(block) || "Empty"}</span>
          </span>
        </button>
        <div className="flex shrink-0 items-center opacity-60 transition group-hover/card:opacity-100 group-focus-within/card:opacity-100">
          <Tooltip content="Move up"><Button size="icon-sm" variant="ghost" disabled={index === 0} onClick={() => actions.onMove(block.id, -1)} aria-label="Move up"><ArrowUp /></Button></Tooltip>
          <Tooltip content="Move down"><Button size="icon-sm" variant="ghost" disabled={index === count - 1} onClick={() => actions.onMove(block.id, 1)} aria-label="Move down"><ArrowDown /></Button></Tooltip>
          <Tooltip content={block.hidden ? "Show on website" : "Hide on website"}>
            <Button size="icon-sm" variant="ghost" onClick={() => actions.onToggleHidden(block.id)} aria-label={block.hidden ? "Show block" : "Hide block"}>{block.hidden ? <EyeOff /> : <Eye />}</Button>
          </Tooltip>
          <Tooltip content="Duplicate"><Button size="icon-sm" variant="ghost" onClick={() => actions.onDuplicate(block.id)} aria-label="Duplicate block"><Copy /></Button></Tooltip>
          <Tooltip content="Delete"><Button size="icon-sm" variant="danger-ghost" onClick={() => actions.onDelete(block.id)} aria-label="Delete block"><Trash2 /></Button></Tooltip>
        </div>
      </div>
      {block.type === "columns" && !nested && (
        <div className={cn("grid gap-2 border-t border-zinc-100 bg-zinc-50/60 p-2", block.columns.length === 2 ? "sm:grid-cols-2" : block.columns.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4")}>
          {block.columns.map((col, ci) => (
            <div key={ci} className="min-w-0 rounded-md border border-dashed border-zinc-200 bg-white/70 p-1.5">
              <p className="px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Column {ci + 1}</p>
              <SortableBlockList blocks={col.blocks} container={{ kind: "column", parentId: block.id, column: ci }} actions={actions} nested />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SortableBlockList({ blocks, container, actions, nested }: { blocks: AnyBlock[]; container: Container; actions: ListActions; nested?: boolean }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = useMemo(() => blocks.map((b) => b.id), [blocks]);
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = ids.indexOf(String(e.active.id));
    const to = ids.indexOf(String(e.over.id));
    if (from >= 0 && to >= 0) actions.onReorder(container, from, to);
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div>
          <InsertLine onClick={() => actions.onInsertRequest(container, 0, !!nested)} label="Insert block at the top" />
          {blocks.map((b, i) => (
            <div key={b.id}>
              <BlockCard block={b} index={i} count={blocks.length} actions={actions} nested={nested} />
              <InsertLine onClick={() => actions.onInsertRequest(container, i + 1, !!nested)} label={`Insert block after ${BLOCK_META[b.type]?.label ?? b.type}`} />
            </div>
          ))}
          {blocks.length === 0 && (
            <button
              type="button"
              onClick={() => actions.onInsertRequest(container, 0, !!nested)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-zinc-200 py-4 text-[13px] text-zinc-500 hover:border-brand hover:text-brand-700"
            >
              <Plus className="size-4" /> Add a block
            </button>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function BlockLibrary({ open, onOpenChange, onPick, leafOnly }: { open: boolean; onOpenChange: (v: boolean) => void; onPick: (type: BlockType) => void; leafOnly: boolean }) {
  const [q, setQ] = useState("");
  const entries = (Object.entries(BLOCK_META) as [BlockType, (typeof BLOCK_META)[BlockType]][]).filter(
    ([, m]) => (!leafOnly || m.leaf) && (m.label + " " + m.description).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setQ(""); }} title="Add a block" description={leafOnly ? "Blocks that can go inside a column." : "Choose a section or element to insert."} size="lg">
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search blocks…" className="pl-9" autoFocus aria-label="Search blocks" />
      </div>
      <div className="space-y-5">
        {CATEGORIES.map((cat) => {
          const items = entries.filter(([, m]) => m.category === cat);
          if (!items.length) return null;
          return (
            <section key={cat}>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{cat}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map(([type, m]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { onPick(type); onOpenChange(false); setQ(""); }}
                    className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 text-left transition hover:border-brand hover:bg-brand/5 focus-visible:border-brand"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-600"><m.icon className="size-4" /></span>
                    <span>
                      <span className="block text-[13px] font-semibold text-zinc-900">{m.label}</span>
                      <span className="block text-xs leading-snug text-zinc-500">{m.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
        {!entries.length && <p className="py-6 text-center text-sm text-zinc-500">No blocks match “{q}”.</p>}
      </div>
    </Dialog>
  );
}
