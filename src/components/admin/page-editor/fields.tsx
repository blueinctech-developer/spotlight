"use client";

import { useId, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { Button, Input, Label, Select, Switch, Textarea, cn } from "@/components/admin/ui";
import { RichTextEditor } from "@/components/admin/rich-text";
import { MediaField, MediaListField } from "@/components/admin/media-picker";
import type { RefOption } from "@/app/admin/actions/references";

export function FieldRow({ label, hint, error, children, htmlFor }: { label: ReactNode; hint?: ReactNode; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function TextField({ label, value, onChange, hint, multiline, placeholder, max, error, mono }: {
  label: ReactNode; value: string; onChange: (v: string) => void; hint?: ReactNode; multiline?: boolean; placeholder?: string; max?: number; error?: string; mono?: boolean;
}) {
  const id = useId();
  const counter = max ? <span className={cn("tabular-nums", value.length > max && "text-red-600")}>{value.length}/{max}</span> : null;
  return (
    <FieldRow label={label} htmlFor={id} error={error} hint={hint || counter ? <span className="flex justify-between gap-2"><span>{hint}</span>{counter}</span> : undefined}>
      {multiline ? (
        <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} aria-invalid={error ? true : undefined} />
      ) : (
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={mono ? "font-mono text-[13px]" : undefined} aria-invalid={error ? true : undefined} />
      )}
    </FieldRow>
  );
}

export function NumberField({ label, value, onChange, min, max, hint }: { label: ReactNode; value: number; onChange: (v: number) => void; min?: number; max?: number; hint?: string }) {
  const id = useId();
  return (
    <FieldRow label={label} htmlFor={id} hint={hint}>
      <Input id={id} type="number" value={Number.isFinite(value) ? value : 0} min={min} max={max} onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </FieldRow>
  );
}

export function SelectField<T extends string>({ label, value, onChange, options, hint }: {
  label: ReactNode; value: T; onChange: (v: T) => void; options: readonly (T | { value: T; label: string })[]; hint?: string;
}) {
  const id = useId();
  return (
    <FieldRow label={label} htmlFor={id} hint={hint}>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o[0].toUpperCase() + o.slice(1) : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </Select>
    </FieldRow>
  );
}

export function BoolField({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div>
      <Switch checked={value} onCheckedChange={onChange} label={label} />
      {hint && <p className="mt-1 pl-[46px] text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export function HtmlField({ label, value, onChange, minimal, hint }: { label: ReactNode; value: string; onChange: (v: string) => void; minimal?: boolean; hint?: string }) {
  return (
    <FieldRow label={label} hint={hint}>
      <RichTextEditor value={value} onChange={onChange} minimal={minimal} />
    </FieldRow>
  );
}

export function ImageField({ label, value, onChange, hint, accept = "image" }: { label: ReactNode; value: string | null; onChange: (v: string | null) => void; hint?: string; accept?: "image" | "document" | "any" }) {
  return (
    <FieldRow label={label} hint={hint}>
      <MediaField value={value} onChange={onChange} accept={accept} />
    </FieldRow>
  );
}

export function ImageListField({ label, value, onChange, max, hint }: { label: ReactNode; value: (string | null)[]; onChange: (v: string[]) => void; max?: number; hint?: string }) {
  return (
    <FieldRow label={label} hint={hint}>
      <MediaListField value={value.filter((x): x is string => !!x)} onChange={onChange} max={max} />
    </FieldRow>
  );
}

export type LinkValue = { label: string; href: string; newTab: boolean };

export function LinkField({ label, value, onChange, links }: { label: ReactNode; value: LinkValue; onChange: (v: LinkValue) => void; links: { label: string; href: string }[] }) {
  const listId = useId();
  return (
    <fieldset className="space-y-2 rounded-lg border border-zinc-200 p-3">
      <legend className="px-1 text-[13px] font-medium text-zinc-700">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input value={value.label} onChange={(e) => onChange({ ...value, label: e.target.value })} placeholder="Button label" aria-label="Link label" />
        <Input value={value.href} onChange={(e) => onChange({ ...value, href: e.target.value })} placeholder="/registration/ or https://…" list={listId} className="font-mono text-[13px]" aria-label="Link URL" />
      </div>
      <datalist id={listId}>
        {links.map((l) => <option key={l.href} value={l.href}>{l.label}</option>)}
      </datalist>
      <Switch checked={value.newTab} onCheckedChange={(v) => onChange({ ...value, newTab: v })} label="Open in a new tab" />
    </fieldset>
  );
}

/** Repeatable group of fields with add / remove / reorder / collapse. */
export function Repeater<T>({ label, items, onChange, create, render, itemLabel, max = 50, addLabel = "Add item" }: {
  label: ReactNode; items: T[]; onChange: (items: T[]) => void; create: () => T;
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
  itemLabel: (item: T, index: number) => string; max?: number; addLabel?: string;
}) {
  const [open, setOpen] = useState<number | null>(items.length === 1 ? 0 : null);
  const move = (i: number, d: number) => {
    const next = [...items];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
    if (open === i) setOpen(i + d);
  };
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="rounded-lg border border-zinc-200 bg-white">
            <div className="flex items-center gap-1 px-2 py-1.5">
              <button type="button" className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-[13px] font-medium text-zinc-700" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                {open === i ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
                <span className="truncate">{itemLabel(item, i) || `Item ${i + 1}`}</span>
              </button>
              <Button size="icon-sm" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp /></Button>
              <Button size="icon-sm" variant="ghost" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown /></Button>
              <Button size="icon-sm" variant="danger-ghost" onClick={() => { onChange(items.filter((_, j) => j !== i)); setOpen(null); }} aria-label="Remove"><Trash2 /></Button>
            </div>
            {open === i && (
              <div className="space-y-3 border-t border-zinc-100 px-3 py-3">
                {render(item, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))), i)}
              </div>
            )}
          </li>
        ))}
      </ul>
      {items.length < max && (
        <Button size="sm" onClick={() => { onChange([...items, create()]); setOpen(items.length); }}>
          <Plus /> {addLabel}
        </Button>
      )}
    </div>
  );
}

/** Ordered multi-select of shared records (partners, speakers, testimonials). */
export function RefListField({ label, value, onChange, options, hint, emptyMeansAll }: {
  label: ReactNode; value: string[]; onChange: (v: string[]) => void; options: RefOption[]; hint?: string; emptyMeansAll?: string;
}) {
  const [adding, setAdding] = useState("");
  const [filter, setFilter] = useState("");
  const byId = new Map(options.map((o) => [o.id, o]));
  const available = options.filter((o) => !value.includes(o.id) && o.label.toLowerCase().includes(filter.toLowerCase()));
  const move = (i: number, d: number) => {
    const next = [...value];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  return (
    <FieldRow label={label} hint={hint}>
      {value.length === 0 && emptyMeansAll && <p className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-500">{emptyMeansAll}</p>}
      <ul className="space-y-1">
        {value.map((id, i) => {
          const o = byId.get(id);
          return (
            <li key={id} className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 py-1">
              {o?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.image} alt="" className="size-7 rounded object-contain" />
              ) : <span className="size-7 rounded bg-zinc-100" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-zinc-800">{o?.label ?? "Missing record"}</span>
                {o?.sublabel && <span className="block truncate text-[11px] text-zinc-500">{o.sublabel}</span>}
              </span>
              <Button size="icon-sm" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp /></Button>
              <Button size="icon-sm" variant="ghost" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown /></Button>
              <Button size="icon-sm" variant="danger-ghost" onClick={() => onChange(value.filter((x) => x !== id))} aria-label="Remove"><X /></Button>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2">
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…" className="w-28 shrink-0" aria-label="Filter options" />
        <Select value={adding} onChange={(e) => { const v = e.target.value; if (v) onChange([...value, v]); setAdding(""); }} aria-label="Add item">
          <option value="">Add… ({available.length})</option>
          {available.map((o) => <option key={o.id} value={o.id}>{o.label}{o.sublabel ? ` — ${o.sublabel}` : ""}</option>)}
        </Select>
      </div>
    </FieldRow>
  );
}

export function StringListField({ label, value, onChange, placeholder }: { label: ReactNode; value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <FieldRow label={label}>
      <ul className="space-y-1.5">
        {value.map((v, i) => (
          <li key={i} className="flex gap-1">
            <Input value={v} onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} placeholder={placeholder} aria-label={`Item ${i + 1}`} />
            <Button size="icon" variant="danger-ghost" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove"><X /></Button>
          </li>
        ))}
      </ul>
      <Button size="sm" onClick={() => onChange([...value, ""])}><Plus /> Add line</Button>
    </FieldRow>
  );
}
