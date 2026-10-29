import Link from "next/link";
import { Activity } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import type { Prisma } from "@/generated/prisma/client";
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/admin/ui";
import { buttonVariants } from "@/components/admin/ui-shared";

export const metadata = { title: "Activity log" };

const PER_PAGE = 50;
const AREAS = [
  { value: "auth.", label: "Sign-ins" },
  { value: "account.", label: "Account" },
  { value: "page.", label: "Pages" },
  { value: "post.", label: "Posts" },
  { value: "media.", label: "Media" },
  { value: "menu.", label: "Navigation" },
  { value: "event.", label: "Events" },
  { value: "speaker.", label: "Speakers" },
  { value: "partner.", label: "Partners" },
  { value: "testimonial.", label: "Testimonials" },
  { value: "submission.", label: "Submissions" },
  { value: "settings.", label: "Settings" },
  { value: "redirect.", label: "Redirects" },
  { value: "user.", label: "Users" },
];

const ENTITY_LINKS: Record<string, (id: string) => string> = {
  PAGE: (id) => `/admin/pages/${id}/`,
  POST: (id) => `/admin/posts/${id}/`,
  EVENT: (id) => `/admin/events/${id}/`,
  SPEAKER: (id) => `/admin/speakers/${id}/`,
  PARTNER: () => `/admin/partners/`,
  TESTIMONIAL: () => `/admin/testimonials/`,
  MEDIA: (id) => `/admin/media/?id=${id}`,
  MENU: () => `/admin/navigation/`,
  SETTINGS: () => `/admin/settings/`,
  USER: () => `/admin/users/`,
  REDIRECT: () => `/admin/redirects/`,
  SUBMISSION: (id) => `/admin/submissions/${id}/`,
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v ?? "").trim();
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

function tone(action: string) {
  if (/delete|failed|deactivate|revoked/.test(action)) return "red" as const;
  if (/publish|create|setup|login$/.test(action)) return "green" as const;
  if (action.startsWith("auth.")) return "blue" as const;
  return "neutral" as const;
}

export default async function ActivityPage(props: PageProps<"/admin/activity">) {
  await requireUser("audit.view");
  const sp = await props.searchParams;
  const userId = one(sp.user);
  const area = AREAS.some((a) => a.value === one(sp.area)) ? one(sp.area) : "";
  const from = isDate(one(sp.from)) ? one(sp.from) : "";
  const to = isDate(one(sp.to)) ? one(sp.to) : "";
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const where: Prisma.AuditLogWhereInput = {
    ...(userId ? { userId } : {}),
    ...(area ? { action: { startsWith: area } } : {}),
    ...(from || to
      ? { createdAt: { ...(from ? { gte: new Date(`${from}T00:00:00Z`) } : {}), ...(to ? { lt: new Date(new Date(`${to}T00:00:00Z`).getTime() + 86400_000) } : {}) } }
      : {}),
  };
  const [total, rows, users] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { user: { select: { name: true, email: true } } } }),
    db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const qs = (p: number) => {
    const q = new URLSearchParams();
    if (userId) q.set("user", userId);
    if (area) q.set("area", area);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return `/admin/activity/${s ? `?${s}` : ""}`;
  };
  const selectCls = "mt-1 block h-9 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-800 shadow-sm";

  return (
    <div>
      <PageHeader title="Activity log" description="A record of important actions in the CMS: sign-ins, publishing, deletions, settings and user changes." />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <label className="text-xs text-zinc-500">
          User
          <select name="user" defaultValue={userId} className={selectCls}>
            <option value="">Everyone</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-zinc-500">
          Area
          <select name="area" defaultValue={area} className={selectCls}>
            <option value="">All areas</option>
            {AREAS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-zinc-500">From<input type="date" name="from" defaultValue={from} className={selectCls} /></label>
        <label className="text-xs text-zinc-500">To<input type="date" name="to" defaultValue={to} className={selectCls} /></label>
        <button type="submit" className={buttonVariants({ variant: "secondary" })}>Apply</button>
        {(userId || area || from || to) && <Link href="/admin/activity/" className={buttonVariants({ variant: "ghost" })}>Clear</Link>}
      </form>

      <Card>
        {rows.length === 0 ? (
          <EmptyState icon={<Activity />} title="No activity found" description="Try widening the filters." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th className="w-44">When</Th>
                <Th>User</Th>
                <Th>Action</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const href = r.entityType && r.entityId && !r.action.endsWith(".delete") ? ENTITY_LINKS[r.entityType]?.(r.entityId) : null;
                return (
                  <tr key={r.id}>
                    <Td className="whitespace-nowrap tabular-nums text-zinc-500">
                      {r.createdAt.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Paris" })}
                    </Td>
                    <Td className="whitespace-nowrap">{r.user?.name ?? <span className="text-zinc-500">System / deleted user</span>}</Td>
                    <Td><Badge tone={tone(r.action)}>{r.action}</Badge></Td>
                    <Td className="max-w-[480px]">
                      {href ? <Link href={href} className="text-zinc-800 hover:text-brand-700 hover:underline">{r.summary}</Link> : r.summary}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
      <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm text-zinc-500">
        <span>{total} entr{total === 1 ? "y" : "ies"} · times shown in Paris time</span>
        {totalPages > 1 && (
          <span className="flex items-center gap-2">
            <span>Page {page} of {totalPages}</span>
            {page > 1 && <Link className={buttonVariants({ size: "sm" })} href={qs(page - 1)}>Previous</Link>}
            {page < totalPages && <Link className={buttonVariants({ size: "sm" })} href={qs(page + 1)}>Next</Link>}
          </span>
        )}
      </nav>
    </div>
  );
}
