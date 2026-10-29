"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, Card, Field, Input, Select } from "@/components/admin/ui";
import { createPage } from "@/app/admin/actions/pages";
import { slugify } from "./util";

export function NewPageForm({ parents }: { parents: { id: string; title: string; path: string; locale: "en" | "fr" }[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [locale, setLocale] = useState<"en" | "fr">("en");
  const [parentId, setParentId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const parent = parents.find((p) => p.id === parentId);
  const finalSlug = slugTouched ? slug : slugify(title);
  const url = `${locale === "fr" ? "/fr" : ""}/${parent ? parent.path + "/" : ""}${finalSlug ? finalSlug + "/" : ""}`;

  return (
    <Card className="p-6">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await createPage({ title, slug: finalSlug, locale, parentId: parentId || null });
            if (res.ok) {
              toast.success("Page created");
              router.push(`/admin/pages/${res.data.id}/`);
            } else {
              setErrors(res.fieldErrors ?? {});
              toast.error(res.error);
            }
          });
        }}
      >
        <Field label="Title" required error={errors.title}>
          {(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus maxLength={200} required />}
        </Field>
        <Field label="Slug" hint={<>Address: <span className="font-mono">{url}</span></>} error={errors.slug}>
          {(p) => (
            <Input
              {...p}
              value={finalSlug}
              onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value, true)); }}
              className="font-mono"
              required
            />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Language">
            {(p) => (
              <Select {...p} value={locale} onChange={(e) => { setLocale(e.target.value as "en" | "fr"); setParentId(""); }}>
                <option value="en">English</option>
                <option value="fr">French</option>
              </Select>
            )}
          </Field>
          <Field label="Parent page" error={errors.parentId}>
            {(p) => (
              <Select {...p} value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">None (top level)</option>
                {parents.filter((x) => x.locale === locale).map((x) => (
                  <option key={x.id} value={x.id}>{x.title} — /{x.path}/</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={() => router.push("/admin/pages/")}>Cancel</Button>
          <Button type="submit" variant="primary" loading={pending} disabled={!title.trim() || !finalSlug}>Create draft</Button>
        </div>
      </form>
    </Card>
  );
}
