"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Languages } from "lucide-react";
import { Button, Input, Label, Select } from "@/components/admin/ui";
import { createPage } from "@/app/admin/actions/pages";
import { BoolField, ImageField, SelectField, TextField } from "./fields";
import { slugify } from "./util";

export type PageDoc = {
  title: string;
  slug: string;
  parentId: string | null;
  excerpt: string | null;
  featuredImageId: string | null;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "ARCHIVED";
  publishedAt: string | null;
  menuOrder: number;
  headerVariant: "light" | "dark";
  footerVariant: "default" | "seat" | "none";
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageId: string | null;
  noindex: boolean;
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="pt-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{children}</h3>;
}

export function DocumentSettings({
  doc, onChange, locale, isHome, parents, errors, translation, translationGroup, canPublish,
}: {
  doc: PageDoc; onChange: (p: Partial<PageDoc>) => void; locale: "en" | "fr"; isHome: boolean;
  parents: { id: string; title: string; path: string }[]; errors: Record<string, string>;
  translation: { id: string | null; locale: "en" | "fr" }; translationGroup: string; canPublish: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const parent = parents.find((p) => p.id === doc.parentId);
  const url = isHome ? (locale === "fr" ? "/fr/" : "/") : `${locale === "fr" ? "/fr" : ""}/${parent ? parent.path + "/" : ""}${doc.slug}/`;
  const seoTitle = doc.seoTitle || `${doc.title} - Spotlight Nigeria`;
  const seoDesc = doc.seoDescription || doc.excerpt || "";
  const scheduled = doc.status === "PUBLISHED" && doc.publishedAt && new Date(doc.publishedAt).getTime() > Date.now();

  return (
    <div className="space-y-4">
      <H>Page</H>
      <TextField label="Title" value={doc.title} onChange={(title) => onChange({ title })} error={errors.title} />
      {!isHome && (
        <TextField
          label="Slug"
          value={doc.slug}
          onChange={(v) => onChange({ slug: slugify(v, true) })}
          mono
          error={errors.slug}
          hint={<>URL: <span className="font-mono">{url}</span></>}
        />
      )}
      {isHome && <p className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-500">This is the home page ({url}). Its address cannot change.</p>}
      {!isHome && (
        <div className="space-y-1.5">
          <Label htmlFor="parent">Parent page</Label>
          <Select id="parent" value={doc.parentId ?? ""} onChange={(e) => onChange({ parentId: e.target.value || null })} aria-invalid={errors.parentId ? true : undefined}>
            <option value="">None (top level)</option>
            {parents.map((p) => <option key={p.id} value={p.id}>{p.title} — /{p.path}/</option>)}
          </Select>
          {errors.parentId && <p className="text-xs text-red-600">{errors.parentId}</p>}
        </div>
      )}
      <TextField label="Excerpt" value={doc.excerpt ?? ""} onChange={(v) => onChange({ excerpt: v || null })} multiline max={500} hint="Used as a fallback description." />
      <ImageField label="Featured image" value={doc.featuredImageId} onChange={(featuredImageId) => onChange({ featuredImageId })} />

      <H>Publishing</H>
      <SelectField
        label="Status"
        value={doc.status}
        onChange={(status) => onChange({ status })}
        options={[
          { value: "DRAFT", label: "Draft" },
          { value: "PENDING_REVIEW", label: "In review" },
          ...(canPublish ? [{ value: "PUBLISHED" as const, label: "Published" }] : []),
          { value: "ARCHIVED", label: "Archived (not shown)" },
        ]}
      />
      <div className="space-y-1.5">
        <Label htmlFor="pubdate">Publication date</Label>
        <Input
          id="pubdate"
          type="datetime-local"
          value={toLocalInput(doc.publishedAt)}
          onChange={(e) => onChange({ publishedAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
        />
        <p className="text-xs text-zinc-500">
          {scheduled ? "Scheduled: the page goes live at this date (within 5 minutes)." : "Set a future date and publish to schedule the page."}
        </p>
      </div>
      <TextField label="Menu order" value={String(doc.menuOrder)} onChange={(v) => onChange({ menuOrder: Number(v) || 0 })} hint="Lower numbers come first in page lists." />

      <H>Layout</H>
      <SelectField label="Header" value={doc.headerVariant} onChange={(headerVariant) => onChange({ headerVariant })} options={[{ value: "light", label: "Light (white)" }, { value: "dark", label: "Dark (with “Register as Sponsor”)" }] as const} />
      <SelectField
        label="Footer"
        value={doc.footerVariant}
        onChange={(footerVariant) => onChange({ footerVariant })}
        options={[{ value: "default", label: "Green participant call to action" }, { value: "seat", label: "“Book your seat” + newsletter" }, { value: "none", label: "Plain footer" }] as const}
      />

      <H>Language</H>
      <div className="rounded-lg border border-zinc-200 p-3 text-[13px]">
        <p className="text-zinc-600">This page is in <strong>{locale === "fr" ? "French" : "English"}</strong>.</p>
        {translation.id ? (
          <Link href={`/admin/pages/${translation.id}/`} className="mt-2 inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline">
            <Languages className="size-3.5" /> Edit the {translation.locale === "fr" ? "French" : "English"} version
          </Link>
        ) : (
          <>
            <p className="mt-1 text-amber-700">No {translation.locale === "fr" ? "French" : "English"} version yet.</p>
            <Button
              size="sm"
              className="mt-2"
              loading={pending}
              onClick={() => start(async () => {
                const r = await createPage({ title: doc.title, slug: doc.slug, locale: translation.locale, translationOf: translationGroup });
                if (r.ok) { toast.success("Translation draft created with copied content — translate it before publishing."); router.push(`/admin/pages/${r.data.id}/`); }
                else toast.error(r.error);
              })}
            >
              <Languages /> Create {translation.locale === "fr" ? "French" : "English"} version
            </Button>
            <p className="mt-1.5 text-xs text-zinc-500">Content is copied as-is for translation; nothing is machine-translated.</p>
          </>
        )}
      </div>

      <H>Search engines</H>
      <div className="rounded-lg border border-zinc-200 bg-white p-3" aria-label="Search result preview">
        <p className="truncate text-xs text-zinc-500">spotlightnigeria-france.com{url}</p>
        <p className="truncate text-[17px] leading-snug text-[#1a0dab]">{seoTitle}</p>
        <p className="line-clamp-2 text-[13px] text-zinc-600">{seoDesc || <span className="italic text-zinc-500">No description — search engines will pick text from the page.</span>}</p>
      </div>
      <TextField label="SEO title" value={doc.seoTitle ?? ""} onChange={(v) => onChange({ seoTitle: v || null })} max={60} placeholder={`${doc.title} - Spotlight Nigeria`} hint="Shown in browser tabs and search results." error={errors.seoTitle} />
      <TextField label="Meta description" value={doc.seoDescription ?? ""} onChange={(v) => onChange({ seoDescription: v || null })} multiline max={160} error={errors.seoDescription} />
      <TextField label="Canonical URL" value={doc.canonicalUrl ?? ""} onChange={(v) => onChange({ canonicalUrl: v || null })} mono hint="Leave empty to use this page's own address." error={errors.canonicalUrl} />
      <BoolField label="Hide from search engines (noindex)" value={doc.noindex} onChange={(noindex) => onChange({ noindex })} />

      <H>Social sharing</H>
      <TextField label="Social title" value={doc.ogTitle ?? ""} onChange={(v) => onChange({ ogTitle: v || null })} placeholder={doc.seoTitle || doc.title} />
      <TextField label="Social description" value={doc.ogDescription ?? ""} onChange={(v) => onChange({ ogDescription: v || null })} multiline max={200} />
      <ImageField label="Social image" value={doc.ogImageId} onChange={(ogImageId) => onChange({ ogImageId })} hint="1200×630 recommended. Falls back to the featured image." />
    </div>
  );
}
