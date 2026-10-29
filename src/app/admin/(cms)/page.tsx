import Link from "next/link";
import { CalendarDays, FileText, ImagePlus, Languages, Mic2, Newspaper, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { Badge, Card, CardHeader, PageHeader, StatusBadge } from "@/components/admin/ui";
import { effectiveStatus } from "@/components/admin/ui-shared";
import { FORMS } from "@/lib/forms/definitions";
import type { FormKey } from "@/lib/blocks/schema";
import { SubmissionsChart } from "@/components/admin/dashboard/submissions-chart";

export const metadata = { title: "Dashboard" };

const formatBytes = (n: number) =>
  n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : n < 1024 ** 3 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${(n / 1024 ** 3).toFixed(2)} GB`;

const rel = (d: Date) => {
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};
const fmtDate = (d: Date) =>
  d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

function Stat({ label, value, sub, href }: { label: string; value: string | number; sub?: React.ReactNode; href?: string }) {
  const body = (
    <Card className="h-full px-5 py-4 transition-colors hover:border-zinc-300">
      <p className="text-[13px] font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </Card>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

function Row({ href, title, meta, right }: { href: string; title: string; meta?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-5 py-2.5 hover:bg-zinc-50">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-zinc-800">{title}</span>
          {meta && <span className="block truncate text-xs text-zinc-500">{meta}</span>}
        </span>
        {right}
      </Link>
    </li>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="px-5 py-6 text-center text-sm text-zinc-500">{children}</p>;

export default async function DashboardPage(props: PageProps<"/admin">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const denied = sp.denied === "1";
  const now = new Date();
  const isAuthor = !can(user.role, "content.edit_any");
  const postScope = isAuthor ? { authorId: user.id } : {};

  const [postGroups, scheduledPosts, reviewPosts, recentPosts] = await Promise.all([
    db.post.groupBy({ by: ["status"], where: { deletedAt: null, locale: "en", ...postScope }, _count: true }),
    db.post.findMany({ where: { deletedAt: null, status: "PUBLISHED", publishedAt: { gt: now }, ...postScope }, orderBy: { publishedAt: "asc" }, take: 6, select: { id: true, title: true, locale: true, publishedAt: true } }),
    db.post.findMany({ where: { deletedAt: null, status: "PENDING_REVIEW", ...postScope }, orderBy: { updatedAt: "desc" }, take: 6, select: { id: true, title: true, locale: true, updatedAt: true, author: { select: { name: true } } } }),
    db.post.findMany({ where: { deletedAt: null, ...postScope }, orderBy: { updatedAt: "desc" }, take: 6, select: { id: true, title: true, locale: true, status: true, publishedAt: true, deletedAt: true, updatedAt: true, author: { select: { name: true } } } }),
  ]);
  const postCount = (s: string) => postGroups.find((g) => g.status === s)?._count ?? 0;
  const scheduledCount = await db.post.count({ where: { deletedAt: null, status: "PUBLISHED", publishedAt: { gt: now }, locale: "en", ...postScope } });

  const quick = [
    can(user.role, "pages.manage") && { href: "/admin/pages/new/", label: "New page", icon: FileText },
    { href: "/admin/posts/new/", label: "New post", icon: Newspaper },
    can(user.role, "events.manage") && { href: "/admin/events/?new=1", label: "New event", icon: CalendarDays },
    can(user.role, "events.manage") && { href: "/admin/speakers/?new=1", label: "New speaker", icon: Mic2 },
    can(user.role, "media.upload") && { href: "/admin/media/", label: "Upload media", icon: ImagePlus },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Plus }[];

  const header = (
    <>
      <PageHeader title={`Welcome back, ${user.name.split(" ")[0]}`} description="Here's what's happening on the Spotlight Nigeria website." />
      {denied && (
        <p role="alert" className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You don&apos;t have access to that section.
        </p>
      )}
      <div className="mb-6 flex flex-wrap gap-2">
        {quick.map((q) => (
          <Link key={q.href} href={q.href} className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50">
            <q.icon className="size-4 text-zinc-500" /> {q.label}
          </Link>
        ))}
      </div>
    </>
  );

  const postsCard = (
    <Card>
      <CardHeader title={isAuthor ? "Your recent posts" : "Recently updated posts"} action={<Link href="/admin/posts/" className="text-[13px] text-brand-700 hover:underline">All posts</Link>} />
      {recentPosts.length ? (
        <ul className="divide-y divide-zinc-100 py-1">
          {recentPosts.map((p) => (
            <Row key={p.id} href={`/admin/posts/${p.id}/`} title={p.title} meta={`${p.locale.toUpperCase()} · ${p.author?.name ?? "—"} · ${rel(p.updatedAt)}`} right={<StatusBadge status={effectiveStatus(p)} />} />
          ))}
        </ul>
      ) : (
        <Empty>No posts yet.</Empty>
      )}
    </Card>
  );

  if (isAuthor) {
    return (
      <div>
        {header}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Your drafts" value={postCount("DRAFT")} href="/admin/posts/?status=DRAFT" />
          <Stat label="In review" value={postCount("PENDING_REVIEW")} href="/admin/posts/?status=PENDING_REVIEW" />
          <Stat label="Published" value={postCount("PUBLISHED") - scheduledCount} />
          <Stat label="Scheduled" value={scheduledCount} />
        </div>
        {postsCard}
      </div>
    );
  }

  const weeks = 8;
  const since = new Date(now.getTime() - weeks * 7 * 86400_000);
  const [pageGroups, media, upcoming, current, scheduledPages, recentPages, activity, newSubs, latestSubs, subsSince, enPages, frPages, enPosts, frPosts] =
    await Promise.all([
      db.page.groupBy({ by: ["locale", "status"], where: { deletedAt: null }, _count: true }),
      db.mediaAsset.aggregate({ _count: true, _sum: { size: true } }),
      db.event.findMany({ where: { startsAt: { gte: now }, status: { not: "ARCHIVED" } }, orderBy: { startsAt: "asc" }, take: 4 }),
      db.event.findFirst({ where: { isCurrent: true }, orderBy: { year: "desc" } }),
      db.page.findMany({ where: { deletedAt: null, status: "PUBLISHED", publishedAt: { gt: now } }, orderBy: { publishedAt: "asc" }, take: 6, select: { id: true, title: true, locale: true, publishedAt: true } }),
      db.page.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: "desc" }, take: 6, select: { id: true, title: true, locale: true, status: true, publishedAt: true, deletedAt: true, updatedAt: true, author: { select: { name: true } } } }),
      can(user.role, "audit.view")
        ? db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true } } } })
        : Promise.resolve([]),
      can(user.role, "submissions.view") ? db.formSubmission.count({ where: { status: "NEW" } }) : Promise.resolve(0),
      can(user.role, "submissions.view")
        ? db.formSubmission.findMany({ where: { status: { not: "SPAM" } }, orderBy: { createdAt: "desc" }, take: 5 })
        : Promise.resolve([]),
      can(user.role, "submissions.view")
        ? db.formSubmission.findMany({ where: { createdAt: { gte: since }, status: { not: "SPAM" } }, select: { createdAt: true } })
        : Promise.resolve([]),
      db.page.findMany({ where: { deletedAt: null, locale: "en" }, select: { translationGroup: true } }),
      db.page.findMany({ where: { deletedAt: null, locale: "fr" }, select: { translationGroup: true } }),
      db.post.findMany({ where: { deletedAt: null, locale: "en" }, select: { translationGroup: true } }),
      db.post.findMany({ where: { deletedAt: null, locale: "fr" }, select: { translationGroup: true } }),
    ]);

  const pageCount = (locale: string, status?: string) =>
    pageGroups.filter((g) => g.locale === locale && (!status || g.status === status)).reduce((n, g) => n + g._count, 0);
  const frPageSet = new Set(frPages.map((p) => p.translationGroup));
  const frPostSet = new Set(frPosts.map((p) => p.translationGroup));
  const missingFr = enPages.filter((p) => !frPageSet.has(p.translationGroup)).length + enPosts.filter((p) => !frPostSet.has(p.translationGroup)).length;

  const buckets = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(since.getTime() + i * 7 * 86400_000);
    return { start, count: 0 };
  });
  for (const s of subsSince) {
    const i = Math.min(weeks - 1, Math.floor((s.createdAt.getTime() - since.getTime()) / (7 * 86400_000)));
    if (i >= 0) buckets[i].count++;
  }

  const scheduled = [
    ...scheduledPages.map((p) => ({ ...p, kind: "Page", href: `/admin/pages/${p.id}/` })),
    ...scheduledPosts.map((p) => ({ ...p, kind: "Post", href: `/admin/posts/${p.id}/` })),
  ].sort((a, b) => a.publishedAt!.getTime() - b.publishedAt!.getTime());

  const daysTo = current?.startsAt ? Math.ceil((current.startsAt.getTime() - now.getTime()) / 86400_000) : null;

  return (
    <div>
      {header}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Published pages"
          value={pageCount("en", "PUBLISHED") + pageCount("fr", "PUBLISHED")}
          sub={`EN ${pageCount("en", "PUBLISHED")} · FR ${pageCount("fr", "PUBLISHED")} · ${pageCount("en", "DRAFT") + pageCount("fr", "DRAFT")} drafts`}
          href="/admin/pages/"
        />
        <Stat
          label="Posts (English)"
          value={postCount("PUBLISHED") - scheduledCount}
          sub={`${postCount("DRAFT")} drafts · ${postCount("PENDING_REVIEW")} in review · ${scheduledCount} scheduled`}
          href="/admin/posts/"
        />
        <Stat label="Media library" value={media._count} sub={`${formatBytes(media._sum.size ?? 0)} stored`} href="/admin/media/" />
        {current ? (
          <Stat
            label="Current edition"
            value={daysTo !== null && daysTo >= 0 ? `${daysTo} days` : current.title}
            sub={current.startsAt ? `${current.title} · ${current.startsAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : current.title}
            href={`/admin/events/${current.id}/`}
          />
        ) : (
          <Stat label="Current edition" value="—" sub="No event marked as current" href="/admin/events/" />
        )}
      </div>

      {missingFr > 0 && (
        <Link href="/admin/pages/?missing=fr" className="mb-6 flex items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 hover:bg-sky-100">
          <Languages className="size-4" />
          <span><strong>{missingFr}</strong> English page{missingFr === 1 ? "" : "s"} or post{missingFr === 1 ? "" : "s"} have no French version yet.</span>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Awaiting review" description="Posts submitted by authors" />
          {reviewPosts.length ? (
            <ul className="divide-y divide-zinc-100 py-1">
              {reviewPosts.map((p) => (
                <Row key={p.id} href={`/admin/posts/${p.id}/`} title={p.title} meta={`${p.author?.name ?? "—"} · ${rel(p.updatedAt)}`} right={<Badge tone="amber">{p.locale}</Badge>} />
              ))}
            </ul>
          ) : (
            <Empty>Nothing is waiting for review.</Empty>
          )}
        </Card>

        <Card>
          <CardHeader title="Scheduled" description="Content that will go live automatically" />
          {scheduled.length ? (
            <ul className="divide-y divide-zinc-100 py-1">
              {scheduled.slice(0, 6).map((p) => (
                <Row key={p.kind + p.id} href={p.href} title={p.title} meta={`${p.kind} · ${p.locale.toUpperCase()}`} right={<span className="text-xs tabular-nums text-zinc-500">{fmtDate(p.publishedAt!)}</span>} />
              ))}
            </ul>
          ) : (
            <Empty>No scheduled publications.</Empty>
          )}
        </Card>

        <Card>
          <CardHeader title="Recently updated pages" action={<Link href="/admin/pages/" className="text-[13px] text-brand-700 hover:underline">All pages</Link>} />
          {recentPages.length ? (
            <ul className="divide-y divide-zinc-100 py-1">
              {recentPages.map((p) => (
                <Row key={p.id} href={`/admin/pages/${p.id}/`} title={p.title} meta={`${p.locale.toUpperCase()} · ${p.author?.name ?? "Imported"} · ${rel(p.updatedAt)}`} right={<StatusBadge status={effectiveStatus(p)} />} />
              ))}
            </ul>
          ) : (
            <Empty>No pages yet.</Empty>
          )}
        </Card>

        {postsCard}

        {can(user.role, "submissions.view") && (
          <Card>
            <CardHeader
              title={<span className="flex items-center gap-2">Form submissions {newSubs > 0 && <Badge tone="green">{newSubs} new</Badge>}</span>}
              description="Last 8 weeks, excluding spam"
              action={<Link href="/admin/submissions/" className="text-[13px] text-brand-700 hover:underline">Open inbox</Link>}
            />
            <div className="px-5 pt-4">
              <SubmissionsChart data={buckets.map((b) => ({ label: b.start.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), count: b.count }))} />
            </div>
            {latestSubs.length ? (
              <ul className="divide-y divide-zinc-100 border-t border-zinc-100 py-1">
                {latestSubs.map((s) => (
                  <Row
                    key={s.id}
                    href={`/admin/submissions/${s.id}/`}
                    title={s.name || s.email || "Anonymous"}
                    meta={`${FORMS[s.formKey as FormKey]?.title.en ?? s.formKey} · ${rel(s.createdAt)}`}
                    right={s.status === "NEW" ? <Badge tone="green">New</Badge> : undefined}
                  />
                ))}
              </ul>
            ) : (
              <Empty>No submissions yet.</Empty>
            )}
          </Card>
        )}

        <Card>
          <CardHeader title="Upcoming events" action={can(user.role, "events.manage") ? <Link href="/admin/events/" className="text-[13px] text-brand-700 hover:underline">All events</Link> : undefined} />
          {upcoming.length ? (
            <ul className="divide-y divide-zinc-100 py-1">
              {upcoming.map((e) => (
                <Row
                  key={e.id}
                  href={`/admin/events/${e.id}/`}
                  title={e.title}
                  meta={[e.venueName, e.startsAt?.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })].filter(Boolean).join(" · ")}
                  right={e.isCurrent ? <Badge tone="green">Current</Badge> : <StatusBadge status={e.status} />}
                />
              ))}
            </ul>
          ) : (
            <Empty>No upcoming events with a date.</Empty>
          )}
        </Card>

        {can(user.role, "audit.view") && (
          <Card className="lg:col-span-2">
            <CardHeader title="Recent activity" action={<Link href="/admin/activity/" className="text-[13px] text-brand-700 hover:underline">Activity log</Link>} />
            {activity.length ? (
              <ul className="divide-y divide-zinc-100 py-1">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <span className="min-w-0 flex-1 truncate text-zinc-700">
                      <span className="font-medium text-zinc-900">{a.user?.name ?? "System"}</span> — {a.summary}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500">{rel(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No activity recorded yet.</Empty>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
