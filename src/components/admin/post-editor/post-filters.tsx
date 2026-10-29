"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/admin/ui";

/** Search + filter controls; state lives in the URL so views are shareable. */
export function PostFilters(props: {
  q: string; lang: string; cat: string; author: string; sort: string; dir: string;
  categories: { id: string; name: string }[]; authors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(props.q);

  const update = (patch: Record<string, string>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    p.delete("page");
    router.push(`/admin/posts/${p.toString() ? `?${p}` : ""}`);
  };

  useEffect(() => {
    if (q === props.q) return;
    const t = setTimeout(() => update({ q }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search posts…" className="pl-9" aria-label="Search posts" />
      </div>
      <Select value={props.lang} onChange={(e) => update({ lang: e.target.value })} className="w-auto" aria-label="Language">
        <option value="">All languages</option>
        <option value="en">English</option>
        <option value="fr">French</option>
      </Select>
      <Select value={props.cat} onChange={(e) => update({ cat: e.target.value })} className="w-auto" aria-label="Category">
        <option value="">All categories</option>
        {props.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      {props.authors.length > 0 && (
        <Select value={props.author} onChange={(e) => update({ author: e.target.value })} className="w-auto" aria-label="Author">
          <option value="">All authors</option>
          {props.authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
      )}
    </div>
  );
}
