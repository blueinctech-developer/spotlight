"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { adminAction, UserError } from "@/lib/admin/action";
import { audit } from "@/lib/audit";
import { notifySubmission, type NotifyOutcome } from "@/lib/forms/notify";

const ids = z.array(z.string().min(1).max(64)).min(1).max(500);
const status = z.enum(["NEW", "READ", "ARCHIVED", "SPAM"]);

export const setSubmissionStatus = adminAction("submissions.view", z.object({ ids, status }), async ({ ids, status }, user) => {
  const res = await db.formSubmission.updateMany({ where: { id: { in: ids } }, data: { status } });
  await audit({
    userId: user.id,
    action: "submission.status",
    entityType: "SUBMISSION",
    entityId: ids.length === 1 ? ids[0] : undefined,
    summary: `Marked ${res.count} submission${res.count === 1 ? "" : "s"} as ${status.toLowerCase()}`,
    meta: { ids, status },
  });
  revalidatePath("/admin", "layout");
  return { count: res.count };
});

/** Send (or re-send) the notification email for submissions that have not been emailed yet. */
export const retrySubmissionNotification = adminAction("submissions.view", z.object({ id: z.string().min(1).max(64) }), async ({ id }, user) => {
  const outcome = await notifySubmission(id, { force: true });
  await audit({ userId: user.id, action: "submission.notify_retry", entityType: "SUBMISSION", entityId: id, summary: `Retried the notification email (${outcome.replace("_", " ")})` });
  revalidatePath("/admin", "layout");
  const messages: Record<NotifyOutcome, string> = {
    sent: "Notification email sent.",
    already_sent: "This notification had already been sent.",
    busy: "An attempt is already in progress. Try again in two minutes.",
    not_configured: "Email is not configured on the server (SMTP settings), so nothing was sent.",
    no_recipient: "No notification address is set in Settings → Notifications.",
    failed: "The email provider refused the message. The error is shown on the submission.",
    missing: "Submission not found.",
  };
  if (outcome !== "sent" && outcome !== "already_sent") throw new UserError(messages[outcome]);
  return { message: messages[outcome] };
});

export const deleteSubmissions =adminAction("submissions.view", z.object({ ids }), async ({ ids }, user) => {
  const res = await db.formSubmission.deleteMany({ where: { id: { in: ids } } });
  await audit({
    userId: user.id,
    action: "submission.delete",
    entityType: "SUBMISSION",
    summary: `Deleted ${res.count} submission${res.count === 1 ? "" : "s"}`,
    meta: { ids },
  });
  revalidatePath("/admin", "layout");
  return { count: res.count };
});
