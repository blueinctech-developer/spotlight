"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle, Archive, MailOpen, ShieldAlert, Trash2 } from "lucide-react";
import { deleteSubmissions, setSubmissionStatus } from "@/app/admin/actions/submissions";
import { Badge, Button, ConfirmDialog, Table, Td, Th, Tooltip, cn } from "@/components/admin/ui";

export type SubmissionRow = {
  id: string; form: string; name: string | null; email: string | null; preview: string; locale: string;
  status: string; createdAt: string; notifyError: string | null;
};

const STATUS_TONE = { NEW: "green", READ: "neutral", ARCHIVED: "violet", SPAM: "red" } as const;

export function SubmissionsTable({ rows }: { rows: SubmissionRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const allChecked = selected.length === rows.length && rows.length > 0;

  const run = (fn: () => Promise<{ ok: boolean; error?: string; data?: { count: number } }>, done: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error);
      toast.success(`${done} (${res.data?.count ?? 0})`);
      setSelected([]);
      setConfirm(false);
      router.refresh();
    });

  return (
    <>
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-2 text-sm">
          <span className="mr-2 font-medium text-zinc-700">{selected.length} selected</span>
          <Button size="sm" disabled={pending} onClick={() => run(() => setSubmissionStatus({ ids: selected, status: "READ" }), "Marked as read")}><MailOpen /> Mark read</Button>
          <Button size="sm" disabled={pending} onClick={() => run(() => setSubmissionStatus({ ids: selected, status: "ARCHIVED" }), "Archived")}><Archive /> Archive</Button>
          <Button size="sm" disabled={pending} onClick={() => run(() => setSubmissionStatus({ ids: selected, status: "SPAM" }), "Marked as spam")}><ShieldAlert /> Spam</Button>
          <Button size="sm" variant="danger-ghost" disabled={pending} onClick={() => setConfirm(true)}><Trash2 /> Delete</Button>
        </div>
      )}
      <Table>
        <thead>
          <tr>
            <Th className="w-10">
              <input type="checkbox" aria-label="Select all" checked={allChecked} onChange={() => setSelected(allChecked ? [] : rows.map((r) => r.id))} className="size-4 accent-brand" />
            </Th>
            <Th>From</Th>
            <Th>Form</Th>
            <Th className="hidden md:table-cell">Message</Th>
            <Th>Status</Th>
            <Th className="text-right">Received</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={cn("hover:bg-zinc-50/70", r.status === "NEW" && "bg-emerald-50/30")}>
              <Td>
                <input
                  type="checkbox"
                  aria-label={`Select submission from ${r.name ?? r.email ?? "unknown"}`}
                  checked={selected.includes(r.id)}
                  onChange={() => setSelected((s) => (s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id]))}
                  className="size-4 accent-brand"
                />
              </Td>
              <Td>
                <Link href={`/admin/submissions/${r.id}/`} className={cn("block hover:underline", r.status === "NEW" ? "font-semibold text-zinc-900" : "text-zinc-800")}>
                  {r.name || r.email || "Anonymous"}
                </Link>
                {r.name && r.email && <span className="block text-xs text-zinc-500">{r.email}</span>}
              </Td>
              <Td className="whitespace-nowrap">
                {r.form} <span className="ml-1 text-[11px] uppercase text-zinc-500">{r.locale}</span>
              </Td>
              <Td className="hidden max-w-[360px] md:table-cell">
                <span className="line-clamp-1 text-zinc-500">{r.preview || "—"}</span>
              </Td>
              <Td>
                <span className="flex items-center gap-1.5">
                  <Badge tone={STATUS_TONE[r.status as keyof typeof STATUS_TONE] ?? "neutral"}>{r.status.toLowerCase()}</Badge>
                  {r.notifyError && (
                    <Tooltip content={`Notification not sent: ${r.notifyError}`}>
                      <AlertTriangle className="size-4 text-amber-500" aria-label="Notification not sent" />
                    </Tooltip>
                  )}
                </span>
              </Td>
              <Td className="whitespace-nowrap text-right tabular-nums text-zinc-500">
                {new Date(r.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        destructive
        title={`Delete ${selected.length} submission${selected.length === 1 ? "" : "s"}?`}
        description="This permanently removes the selected submissions. This cannot be undone."
        confirmLabel="Delete"
        loading={pending}
        onConfirm={() => run(() => deleteSubmissions({ ids: selected }), "Deleted")}
      />
    </>
  );
}
