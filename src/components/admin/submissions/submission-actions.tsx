"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Archive, Mail, MailOpen, MoreHorizontal, RotateCw, ShieldAlert, Trash2 } from "lucide-react";
import { deleteSubmissions, retrySubmissionNotification, setSubmissionStatus } from "@/app/admin/actions/submissions";

/** Shown when the notification email has not reached the email provider yet. */
export function RetryNotificationButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await retrySubmissionNotification({ id });
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.data.message);
          router.refresh();
        })
      }
    >
      <RotateCw className={pending ? "animate-spin" : undefined} /> {pending ? "Sending…" : "Retry email"}
    </Button>
  );
}
import {
  Button, ConfirmDialog, DropdownContent, DropdownItem, DropdownMenu, DropdownSeparator, DropdownTrigger, buttonVariants,
} from "@/components/admin/ui";

export function SubmissionActions({ id, status, email, subject }: { id: string; status: string; email: string | null; subject: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const setStatus = (s: "NEW" | "READ" | "ARCHIVED" | "SPAM", msg: string) =>
    start(async () => {
      const res = await setSubmissionStatus({ ids: [id], status: s });
      if (!res.ok) return void toast.error(res.error);
      toast.success(msg);
      router.refresh();
    });
  return (
    <>
      {email && (
        <a href={`mailto:${email}?subject=${subject}`} className={buttonVariants({ variant: "primary" })}>
          <Mail /> Reply by email
        </a>
      )}
      <DropdownMenu>
        <DropdownTrigger asChild>
          <Button size="icon" aria-label="More actions" disabled={pending}><MoreHorizontal /></Button>
        </DropdownTrigger>
        <DropdownContent>
          {status !== "NEW" && <DropdownItem onSelect={() => setStatus("NEW", "Marked as unread")}><MailOpen /> Mark as unread</DropdownItem>}
          {status !== "ARCHIVED" && <DropdownItem onSelect={() => setStatus("ARCHIVED", "Archived")}><Archive /> Archive</DropdownItem>}
          {status !== "SPAM" ? (
            <DropdownItem onSelect={() => setStatus("SPAM", "Marked as spam")}><ShieldAlert /> Mark as spam</DropdownItem>
          ) : (
            <DropdownItem onSelect={() => setStatus("READ", "Restored from spam")}><MailOpen /> Not spam</DropdownItem>
          )}
          <DropdownSeparator />
          <DropdownItem destructive onSelect={() => setConfirm(true)}><Trash2 /> Delete</DropdownItem>
        </DropdownContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        destructive
        title="Delete this submission?"
        description="It will be permanently removed. This cannot be undone."
        confirmLabel="Delete"
        loading={pending}
        onConfirm={() =>
          start(async () => {
            const res = await deleteSubmissions({ ids: [id] });
            if (!res.ok) return void toast.error(res.error);
            toast.success("Submission deleted");
            router.push("/admin/submissions/");
          })
        }
      />
    </>
  );
}
