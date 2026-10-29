"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Search, UserRound } from "lucide-react";
import { quickCreateSpeaker, searchSpeakers } from "@/app/admin/actions/speakers";
import { searchPartners } from "@/app/admin/actions/partners";
import { Button, Input, Spinner, cn } from "@/components/admin/ui";
import type { PartnerOption, SpeakerOption } from "./types";

/** Warn before leaving the page with unsaved changes. */
export function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}

function useSearch<T>(fn: (q: string) => Promise<T[] | null>, open: boolean) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [pending, start] = useTransition();
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => start(async () => setItems((await fn(q)) ?? [])), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open]);
  return { q, setQ, items, pending };
}

export function Avatar({ url, name, className }: { url: string | null; name: string; className?: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className={cn("size-8 shrink-0 rounded-full object-cover", className)} />
  ) : (
    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-500", className)}>
      {name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || <UserRound className="size-4" />}
    </span>
  );
}

/** Searchable speaker list with inline "create speaker". Excludes already-selected ids. */
export function SpeakerSearch({ exclude, onPick }: { exclude: string[]; onPick: (s: SpeakerOption) => void }) {
  const { q, setQ, items, pending } = useSearch(async (query) => {
    const res = await searchSpeakers({ q: query });
    return res.ok ? res.data : null;
  }, true);
  const [creating, start] = useTransition();
  const create = () =>
    start(async () => {
      const res = await quickCreateSpeaker({ name: q.trim(), jobTitle: "" });
      if (!res.ok) return void toast.error(res.error);
      toast.success(`Speaker “${res.data.name}” created`);
      onPick(res.data);
      setQ("");
    });
  const visible = items.filter((s) => !exclude.includes(s.id));
  return (
    <div className="rounded-lg border border-zinc-200">
      <div className="relative border-b border-zinc-100">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search speakers by name or organisation…"
          className="h-9 w-full rounded-t-lg bg-transparent pl-9 pr-3 text-sm outline-none"
          aria-label="Search speakers"
        />
      </div>
      <ul className="max-h-52 overflow-y-auto p-1" role="listbox" aria-label="Speakers">
        {pending && !items.length && <li className="flex justify-center p-3"><Spinner /></li>}
        {visible.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => onPick(s)} className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-zinc-100">
              <Avatar url={s.photoUrl} name={s.name} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-zinc-900">{s.name}</span>
                <span className="block truncate text-xs text-zinc-500">{[s.jobTitle, s.organization].filter(Boolean).join(", ") || "—"}</span>
              </span>
            </button>
          </li>
        ))}
        {!pending && visible.length === 0 && <li className="px-2 py-2 text-sm text-zinc-500">No matching speakers.</li>}
      </ul>
      {q.trim().length > 1 && !items.some((s) => s.name.toLowerCase() === q.trim().toLowerCase()) && (
        <div className="border-t border-zinc-100 p-1">
          <Button size="sm" variant="ghost" className="w-full justify-start" loading={creating} onClick={create}>
            <Plus /> Create speaker “{q.trim()}”
          </Button>
        </div>
      )}
    </div>
  );
}

export function PartnerSearch({ exclude, onPick }: { exclude: string[]; onPick: (p: PartnerOption) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const { q, setQ, items, pending } = useSearch(async (query) => {
    const res = await searchPartners({ q: query });
    return res.ok ? res.data : null;
  }, true);
  const visible = items.filter((p) => !exclude.includes(p.id));
  return (
    <div className="rounded-lg border border-zinc-200">
      <div className="relative border-b border-zinc-100">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search partners…" className="h-9 w-full bg-transparent pl-9 pr-3 text-sm outline-none" aria-label="Search partners" />
      </div>
      <ul className="grid max-h-64 grid-cols-2 gap-1 overflow-y-auto p-1 sm:grid-cols-3">
        {pending && !items.length && <li className="col-span-full flex justify-center p-3"><Spinner /></li>}
        {visible.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onPick(p)} className="flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-left hover:border-zinc-200 hover:bg-zinc-50">
              <span className="flex h-8 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.logoUrl ? <img src={p.logoUrl} alt="" className="max-h-8 max-w-12 object-contain" /> : null}
              </span>
              <span className="truncate text-sm text-zinc-800">{p.name}</span>
            </button>
          </li>
        ))}
        {!pending && visible.length === 0 && <li className="col-span-full px-2 py-2 text-sm text-zinc-500">No matching partners. Create partners in Partners first.</li>}
      </ul>
    </div>
  );
}

export function SearchInput(props: React.ComponentProps<typeof Input>) {
  return (
    <div className="relative min-w-[200px] flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
      <Input {...props} className={cn("pl-9", props.className)} />
    </div>
  );
}
