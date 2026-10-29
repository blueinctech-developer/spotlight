"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, Field, Input, Textarea, cn } from "@/components/admin/ui";
import { MediaField } from "@/components/admin/media-picker";

type SeoFields = {
  title: string; excerpt: string; content: string; seoTitle: string; seoDescription: string;
  canonicalUrl: string; ogTitle: string; ogDescription: string; ogImageId: string | null;
};

function Counter({ value, ideal }: { value: number; ideal: [number, number] }) {
  const tone = value === 0 ? "text-zinc-500" : value < ideal[0] ? "text-amber-600" : value > ideal[1] ? "text-red-600" : "text-emerald-600";
  return <span className={cn("tabular-nums", tone)}>{value} / {ideal[1]}</span>;
}

/** Search & social settings with a Google-style snippet preview. */
export function SeoPanel<F extends SeoFields>({
  fields, onChange, url, errors,
}: {
  fields: F;
  onChange: <K extends keyof F>(key: K, value: F[K]) => void;
  url: string;
  errors: Record<string, string>;
}) {
  const [open, setOpen] = useState(true);
  const fallbackDesc = (fields.excerpt || fields.content.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim().slice(0, 160);
  const title = `${fields.seoTitle || fields.title || "Post title"}${fields.seoTitle ? "" : " - Spotlight Nigeria"}`;
  const desc = fields.seoDescription || fallbackDesc;
  const set = onChange as (key: keyof SeoFields, value: string | null) => void;

  return (
    <Card>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <span>
          <span className="block text-sm font-semibold text-zinc-900">Search & social</span>
          <span className="block text-[13px] text-zinc-500">How this post appears in search results and when shared.</span>
        </span>
        <ChevronDown className={cn("size-4 text-zinc-500 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-5 border-t border-zinc-100 px-5 py-5">
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">spotlightnigeria-france.com{url}</p>
            <p className="mt-0.5 line-clamp-1 text-[18px] text-[#1a0dab]">{title}</p>
            <p className="mt-0.5 line-clamp-2 text-[13px] text-zinc-600">{desc || "Add a meta description or excerpt."}</p>
          </div>
          <Field label={<span className="flex w-full justify-between">SEO title <Counter value={fields.seoTitle.length} ideal={[30, 60]} /></span>} hint="Leave empty to use the post title followed by the site name.">
            {(p) => <Input {...p} value={fields.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} maxLength={200} />}
          </Field>
          <Field label={<span className="flex w-full justify-between">Meta description <Counter value={fields.seoDescription.length} ideal={[70, 160]} /></span>} hint="Leave empty to use the excerpt.">
            {(p) => <Textarea {...p} value={fields.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} rows={3} maxLength={400} />}
          </Field>
          <Field label="Canonical URL" hint="Only if this content's original lives elsewhere." error={errors.canonicalUrl}>
            {(p) => <Input {...p} value={fields.canonicalUrl} onChange={(e) => set("canonicalUrl", e.target.value)} placeholder="https://…" maxLength={500} />}
          </Field>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-4">
              <Field label="Social title">{(p) => <Input {...p} value={fields.ogTitle} onChange={(e) => set("ogTitle", e.target.value)} placeholder={fields.title} maxLength={200} />}</Field>
              <Field label="Social description">{(p) => <Textarea {...p} value={fields.ogDescription} onChange={(e) => set("ogDescription", e.target.value)} placeholder={desc} rows={3} maxLength={400} />}</Field>
            </div>
            <div className="space-y-1.5">
              <span className="text-[13px] font-medium text-zinc-700">Social image</span>
              <MediaField value={fields.ogImageId} onChange={(id) => set("ogImageId", id)} />
              <p className="text-xs text-zinc-500">Defaults to the featured image. Ideal size 1200 × 630.</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
