"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { quickCreateTerm } from "@/app/admin/actions/taxonomies";
import { Button, Input, Spinner } from "@/components/admin/ui";

type Term = { id: string; name: string };

export function CategoryPicker({
  all, value, onChange, onCreated,
}: { all: Term[]; value: string[]; onChange: (ids: string[]) => void; onCreated: (t: Term) => void }) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  const create = () =>
    start(async () => {
      const res = await quickCreateTerm({ kind: "category", name });
      if (!res.ok) return void toast.error(res.error);
      if (!all.some((c) => c.id === res.data.id)) onCreated({ id: res.data.id, name: res.data.name });
      if (!value.includes(res.data.id)) onChange([...value, res.data.id]);
      setName("");
      setAdding(false);
    });
  return (
    <div>
      <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
        {all.map((c) => (
          <li key={c.id}>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked={value.includes(c.id)} onChange={() => toggle(c.id)} className="size-4 accent-[var(--color-brand)]" />
              {c.name}
            </label>
          </li>
        ))}
        {all.length === 0 && <li className="text-sm text-zinc-500">No categories yet.</li>}
      </ul>
      {adding ? (
        <div className="mt-3 flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New category name"
            aria-label="New category name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); if (name.trim()) create(); }
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <Button size="sm" variant="primary" disabled={!name.trim()} loading={pending} onClick={create}>Add</Button>
        </div>
      ) : (
        <Button size="sm" variant="link" className="mt-2" onClick={() => setAdding(true)}><Plus /> Add new category</Button>
      )}
    </div>
  );
}

export function TagInput({
  all, value, onChange, onCreated,
}: { all: Term[]; value: string[]; onChange: (ids: string[]) => void; onCreated: (t: Term) => void }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const listId = useId();
  const byId = useMemo(() => new Map(all.map((t) => [t.id, t])), [all]);
  const suggestions = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    return all.filter((t) => !value.includes(t.id) && t.name.toLowerCase().includes(q)).slice(0, 8);
  }, [text, all, value]);

  const add = (raw: string) => {
    const name = raw.trim().replace(/,$/, "");
    if (!name) return;
    const existing = all.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!value.includes(existing.id)) onChange([...value, existing.id]);
      setText("");
      return;
    }
    start(async () => {
      const res = await quickCreateTerm({ kind: "tag", name });
      if (!res.ok) return void toast.error(res.error);
      if (!byId.has(res.data.id)) onCreated({ id: res.data.id, name: res.data.name });
      if (!value.includes(res.data.id)) onChange([...value, res.data.id]);
      setText("");
    });
  };

  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {value.map((id) => (
            <li key={id} className="inline-flex items-center gap-1 rounded-md bg-zinc-100 py-0.5 pl-2 pr-1 text-xs text-zinc-700">
              {byId.get(id)?.name ?? "…"}
              <button type="button" onClick={() => onChange(value.filter((v) => v !== id))} className="rounded p-0.5 hover:bg-zinc-200" aria-label={`Remove tag ${byId.get(id)?.name ?? ""}`}>
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <Input
          value={text}
          onChange={(e) => { setText(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(text); }
            if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
          }}
          placeholder="Add a tag and press Enter"
          aria-label="Add tag"
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
        />
        {pending && <Spinner className="absolute right-3 top-2.5" />}
        {open && suggestions.length > 0 && (
          <ul id={listId} role="listbox" className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-lg">
            {suggestions.map((s) => (
              <li key={s.id} role="option" aria-selected={false}>
                <button type="button" className="w-full rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-zinc-100" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange([...value, s.id]); setText(""); }}>
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-1.5 text-xs text-zinc-500">Separate tags with commas or Enter.</p>
    </div>
  );
}
