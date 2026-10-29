import type { Block, LeafBlock } from "@/lib/blocks/schema";
import { newBlockId } from "./util";

export type AnyBlock = Block | LeafBlock;

/** Location of a block: top level, or inside a column of a columns block. */
export type Container = { kind: "root" } | { kind: "column"; parentId: string; column: number };

export function findBlock(blocks: AnyBlock[], id: string): AnyBlock | null {
  for (const b of blocks) {
    if (b.id === id) return b;
    if (b.type === "columns") for (const c of b.columns) {
      const hit = findBlock(c.blocks, id);
      if (hit) return hit;
    }
  }
  return null;
}

export function findContainer(blocks: AnyBlock[], id: string): Container | null {
  if (blocks.some((b) => b.id === id)) return { kind: "root" };
  for (const b of blocks) {
    if (b.type === "columns") {
      for (let i = 0; i < b.columns.length; i++) if (b.columns[i].blocks.some((x) => x.id === id)) return { kind: "column", parentId: b.id, column: i };
    }
  }
  return null;
}

export function updateBlock(blocks: Block[], id: string, fn: (b: AnyBlock) => AnyBlock): Block[] {
  return blocks.map((b) => {
    if (b.id === id) return fn(b) as Block;
    if (b.type === "columns") {
      return { ...b, columns: b.columns.map((c) => ({ blocks: c.blocks.map((x) => (x.id === id ? (fn(x) as LeafBlock) : x)) })) };
    }
    return b;
  });
}

function mapList(blocks: Block[], container: Container, fn: (list: AnyBlock[]) => AnyBlock[]): Block[] {
  if (container.kind === "root") return fn(blocks) as Block[];
  return blocks.map((b) =>
    b.id === container.parentId && b.type === "columns"
      ? { ...b, columns: b.columns.map((c, i) => (i === container.column ? { blocks: fn(c.blocks) as LeafBlock[] } : c)) }
      : b,
  );
}

export function insertBlock(blocks: Block[], container: Container, index: number, block: AnyBlock): Block[] {
  return mapList(blocks, container, (list) => [...list.slice(0, index), block, ...list.slice(index)]);
}

export function removeBlock(blocks: Block[], id: string): Block[] {
  const c = findContainer(blocks, id);
  if (!c) return blocks;
  return mapList(blocks, c, (list) => list.filter((b) => b.id !== id));
}

export function moveBlock(blocks: Block[], id: string, delta: number): Block[] {
  const c = findContainer(blocks, id);
  if (!c) return blocks;
  return mapList(blocks, c, (list) => {
    const i = list.findIndex((b) => b.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return list;
    const next = [...list];
    const [x] = next.splice(i, 1);
    next.splice(j, 0, x);
    return next;
  });
}

export function reorder(blocks: Block[], container: Container, from: number, to: number): Block[] {
  return mapList(blocks, container, (list) => {
    const next = [...list];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    return next;
  });
}

/** Deep copy with fresh ids (also for nested column blocks). */
export function cloneBlock<T extends AnyBlock>(b: T): T {
  const copy = structuredClone(b) as T;
  copy.id = newBlockId();
  if (copy.type === "columns") copy.columns = copy.columns.map((c) => ({ blocks: c.blocks.map((x) => cloneBlock(x)) }));
  return copy;
}

export function duplicateBlock(blocks: Block[], id: string): { blocks: Block[]; newId: string | null } {
  const c = findContainer(blocks, id);
  const b = findBlock(blocks, id);
  if (!c || !b) return { blocks, newId: null };
  const copy = cloneBlock(b);
  return {
    blocks: mapList(blocks, c, (list) => {
      const i = list.findIndex((x) => x.id === id);
      return [...list.slice(0, i + 1), copy, ...list.slice(i + 1)];
    }),
    newId: copy.id,
  };
}

export function indexIn(blocks: Block[], id: string): number {
  const c = findContainer(blocks, id);
  if (!c) return -1;
  if (c.kind === "root") return blocks.findIndex((b) => b.id === id);
  const parent = blocks.find((b) => b.id === c.parentId);
  return parent && parent.type === "columns" ? parent.columns[c.column].blocks.findIndex((b) => b.id === id) : -1;
}
