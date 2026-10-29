import Link from "next/link";
import { Download, Inbox, Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { FORMS } from "@/lib/forms/definitions";
import type { FormKey } from "@/lib/blocks/schema";
import { Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { buttonVariants, cn } from "@/components/admin/ui-shared";
import { parseSubmissionFilters, submissionWhere, SUBMISSION_STATUSES } from "@/components/admin/submissions/filters";
import { SubmissionsTable } from "@/components/admin/submissions/submissions-table";

export const metadata = { title: "Submissions" };

const TABS: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "contact", label: "Contact" },
  { key: "sponsorship", label: "Sponsorship" },
  { key: "report-download", label: "Report download" },
  { key: "press", label: "Press" },
  { key: "newsletter", label: "Newsletter" },
];
const PER_PAGE = 25;

export default async function SubmissionsPage(props: PageProps<"/admin/submissions">) {
  await requireUser("submissions.view");
  const sp = await props.searchParams;
  const f = parseSubmissionFilters(sp);
  const where = await submissionWhere(f);
  const [total, rows, newCounts] = await Promise.all([
    db.formSubmission.count({ where }),
    db.formSubmission.findMany({ where, orderBy: { createdAt: "desc" }, skip: (f.page - 1) * PER_PAGE, take: PER_PAGE }),
    db.formSubmission.groupBy({ by: ["formKey"], where: { status: "NEW" }, _count: true }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const qs = (patch: Record<string, string | number>) => {
    const p = new URLSearchParams();
    const merged = { form: f.form, status: f.status, q: f.q, from: f.from, to: f.to, page: f.page, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "page" && v === 1)) p.set(k, String(v));
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  const newFor = (k: string) => (k ? newCounts.find((c) => c.formKey === k)?._count ?? 0 : newCounts.reduce((n, c) => n + c._count, 0));

  return (
    <div>
      <PageHeader
        title="Form submissions"
        description="Messages and registrations sent through the website's forms."
        actions={
          <a href={`/api/admin/submissions/export/${qs({ page: 1 })}`} className={buttonVariants({ variant: "secondary" })}>
            <Download /> Export CSV
          </a>
        }
      />

      <nav aria-label="Forms" className="mb-4 flex gap-1 overflow-x-auto border-b border-zinc-200">
        {TABS.map((t) => {
          const active = f.form === t.key;
          const n = newFor(t.key);
          return (
            <Link
              key={t.key || "all"}
              href={`/admin/submissions/${qs({ form: t.key, page: 1 })}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium",
                active ? "border-brand text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800",
              )}
            >
              {t.label}
              {n > 0 && <span className="rounded-full bg-brand/10 px-1.5 text-[11px] font-semibold text-brand-700">{n}</span>}
            </Link>
          );
        })}
      </nav>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-2" role="search">
        {f.form && <input type="hidden" name="form" value={f.form} />}
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input name="q" defaultValue={f.q} placeholder="Search name, email or message…" className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" />
        </label>
        <label className="text-xs text-zinc-500">
          Status
          <select name="status" defaultValue={f.status} className="mt-1 block h-9 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-800 shadow-sm">
            <option value="">All (excl. spam)</option>
            {SUBMISSION_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
          </select>
        </label>
        <label className="text-xs text-zinc-500">
          From
          <input type="date" name="from" defaultValue={f.from} className="mt-1 block h-9 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-800 shadow-sm" />
        </label>
        <label className="text-xs text-zinc-500">
          To
          <input type="date" name="to" defaultValue={f.to} className="mt-1 block h-9 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-800 shadow-sm" />
        </label>
        <button type="submit" className={buttonVariants({ variant: "secondary" })}>Apply</button>
        {(f.q || f.status || f.from || f.to) && (
          <Link href={`/admin/submissions/${f.form ? `?form=${f.form}` : ""}`} className={buttonVariants({ variant: "ghost" })}>Clear</Link>
        )}
      </form>

      <Card>
        {rows.length === 0 ? (
          <EmptyState icon={<Inbox />} title="No submissions found" description={f.q || f.status || f.from || f.to ? "Try changing the filters." : "Submissions from the website forms will appear here."} />
        ) : (
          <SubmissionsTable
            rows={rows.map((r) => ({
              id: r.id,
              form: FORMS[r.formKey as FormKey]?.title.en ?? r.formKey,
              name: r.name,
              email: r.email,
              preview: Object.entries(r.data as Record<string, string>)
                .filter(([k]) => !["firstName", "lastName", "email", "name"].includes(k))
                .map(([, v]) => v)
                .filter(Boolean)
                .join(" · ")
                .slice(0, 140),
              locale: r.locale,
              status: r.status,
              createdAt: r.createdAt.toISOString(),
              notifyError: r.notifyError,
            }))}
          />
        )}
      </Card>

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm text-zinc-500">
          <span>
            {(f.page - 1) * PER_PAGE + 1}–{Math.min(f.page * PER_PAGE, total)} of {total}
          </span>
          <span className="flex gap-2">
            {f.page > 1 && <Link className={buttonVariants({ size: "sm" })} href={`/admin/submissions/${qs({ page: f.page - 1 })}`}>Previous</Link>}
            {f.page < totalPages && <Link className={buttonVariants({ size: "sm" })} href={`/admin/submissions/${qs({ page: f.page + 1 })}`}>Next</Link>}
          </span>
        </nav>
      )}
    </div>
  );
}
