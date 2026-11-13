import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { FORMS, displayValue } from "@/lib/forms/definitions";
import type { FormKey } from "@/lib/blocks/schema";
import { Badge, Card, CardHeader, PageHeader } from "@/components/admin/ui";
import { RetryNotificationButton, SubmissionActions } from "@/components/admin/submissions/submission-actions";
import { MAX_NOTIFY_ATTEMPTS } from "@/lib/forms/notify";

export const metadata = { title: "Submission" };

export default async function SubmissionPage(props: PageProps<"/admin/submissions/[id]">) {
  const user = await requireUser("submissions.view");
  const { id } = await props.params;
  let sub = await db.formSubmission.findUnique({ where: { id } });
  if (!sub) notFound();
  // Opening a new submission marks it as read.
  if (sub.status === "NEW") {
    sub = await db.formSubmission.update({ where: { id }, data: { status: "READ" } });
    await audit({ userId: user.id, action: "submission.read", entityType: "SUBMISSION", entityId: id, summary: `Opened submission from ${sub.name ?? sub.email ?? "unknown"}` });
  }
  const def = FORMS[sub.formKey as FormKey];
  const data = sub.data as Record<string, string>;
  const known = def ? def.fields.map((f) => [f.label.en.replace(/\s*\*$/, ""), displayValue(def, f.name, data[f.name])] as const) : [];
  const extra = Object.entries(data).filter(([k]) => !def?.fields.some((f) => f.name === k));
  const subject = encodeURIComponent(`Re: your message to Spotlight Nigeria`);

  return (
    <div className="max-w-3xl">
      <PageHeader
        back={
          <Link href="/admin/submissions/" className="mb-2 inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-800">
            <ArrowLeft className="size-3.5" /> Submissions
          </Link>
        }
        title={sub.name || sub.email || "Anonymous submission"}
        description={`${def?.title.en ?? sub.formKey} · received ${sub.createdAt.toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" })} (Paris time)`}
        actions={<SubmissionActions id={sub.id} status={sub.status} email={sub.email} subject={subject} />}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone={sub.status === "SPAM" ? "red" : sub.status === "ARCHIVED" ? "violet" : "neutral"}>{sub.status.toLowerCase()}</Badge>
        <Badge tone="blue">{sub.locale === "fr" ? "French site" : "English site"}</Badge>
        {sub.source === "wordpress-import" && <Badge tone="violet">Imported from WordPress</Badge>}
      </div>

      {sub.source === "wordpress-import" ? (
        <p className="mb-4 text-sm text-zinc-500">
          Copied from the old WordPress site. No email was sent from this site for it, and none will be.
        </p>
      ) : sub.notifiedAt ? (
        <p className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
          <CheckCircle2 className="size-4 text-emerald-600" /> Notification accepted by the email provider{" "}
          {sub.notifiedAt.toLocaleString("en-GB", { timeZone: "Europe/Paris" })}
          {sub.notifyAttempts > 1 && ` (after ${sub.notifyAttempts} attempts)`}
        </p>
      ) : (
        <div className="mb-4 flex flex-wrap items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">
            The email notification for this submission has not been sent
            {sub.notifyError ? `: ${sub.notifyError}` : " yet"}.
            {sub.notifyAttempts > 0 && ` ${sub.notifyAttempts} attempt${sub.notifyAttempts === 1 ? "" : "s"} so far.`} The submission
            itself is saved.
            {sub.notifyAttempts > 0 && sub.notifyAttempts < MAX_NOTIFY_ATTEMPTS && " It will be retried automatically."}
          </span>
          {sub.status !== "SPAM" && <RetryNotificationButton id={sub.id} />}
        </div>
      )}

      <Card>
        <CardHeader title="Submitted information" />
        <dl className="divide-y divide-zinc-100">
          {[...known, ...extra].map(([label, value]) => (
            <div key={label} className="grid gap-1 px-5 py-3 sm:grid-cols-[200px_1fr]">
              <dt className="text-[13px] font-medium text-zinc-500">{label}</dt>
              <dd className="whitespace-pre-wrap break-words text-sm text-zinc-900">
                {label.toLowerCase().includes("email") && value ? (
                  <a href={`mailto:${value}`} className="text-brand-700 hover:underline">{value}</a>
                ) : (
                  value || <span className="text-zinc-500">—</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
      {sub.userAgent && <p className="mt-3 text-xs text-zinc-500">Browser: {sub.userAgent}</p>}
    </div>
  );
}
