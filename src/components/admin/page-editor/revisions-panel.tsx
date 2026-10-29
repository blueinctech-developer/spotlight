"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { getPageRevisions, getRevisionData, restoreRevision } from "@/app/admin/actions/pages";
import { Button, ConfirmDialog, Spinner, cn } from "@/components/admin/ui";
import { parseBlocks } from "@/lib/blocks/schema";
import { BLOCK_META, summarize } from "./catalog";

type Rev = { id: string; createdAt: string; note: string | null; author: string };

export function RevisionsPanel({ pageId, dirty, onRestored }: { pageId: string; dirty: boolean; onRestored: () => void }) {
  const [revs, setRevs] = useState<Rev[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ title: string; blocks: { type: string; summary: string; hidden: boolean }[] } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    void getPageRevisions({ id: pageId }).then((r) => (r.ok ? setRevs(r.data) : toast.error(r.error)));
  }, [pageId]);

  const open = (id: string) => {
    setSelected(id);
    setDetail(null);
    void getRevisionData({ revisionId: id }).then((r) => {
      if (!r.ok) return toast.error(r.error);
      const blocks = parseBlocks(r.data.blocks).blocks;
      setDetail({
        title: String(r.data.title ?? ""),
        blocks: blocks.map((b) => ({ type: BLOCK_META[b.type]?.label ?? b.type, summary: summarize(b), hidden: b.hidden })),
      });
    });
  };

  if (!revs) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (!revs.length) return <p className="py-10 text-center text-sm text-zinc-500">No revisions yet. Each save creates one.</p>;

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">The last 50 saved versions. Restoring brings back the content, layout and SEO fields; the page address and status stay as they are.</p>
      <ol className="space-y-1">
        {revs.map((r, i) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => open(r.id)}
              className={cn("w-full rounded-lg border px-3 py-2 text-left text-[13px]", selected === r.id ? "border-brand bg-brand/5" : "border-zinc-200 hover:border-zinc-300")}
            >
              <span className="flex justify-between gap-2">
                <span className="font-medium text-zinc-800">{new Date(r.createdAt).toLocaleString()}</span>
                {i === 0 && <span className="text-[11px] font-semibold uppercase text-emerald-700">Current</span>}
              </span>
              <span className="block text-xs text-zinc-500">{r.author}{r.note ? ` · ${r.note}` : ""}</span>
            </button>
          </li>
        ))}
      </ol>
      {selected && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          {!detail ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : (
            <>
              <p className="text-[13px] font-semibold text-zinc-900">{detail.title}</p>
              <ol className="mt-2 space-y-1 text-xs">
                {detail.blocks.map((b, i) => (
                  <li key={i} className={cn("truncate", b.hidden ? "text-zinc-500" : "text-zinc-600")}>
                    <span className="font-medium text-zinc-800">{b.type}</span> — {b.summary || "empty"}{b.hidden ? " (hidden)" : ""}
                  </li>
                ))}
              </ol>
              <Button size="sm" className="mt-3" onClick={() => setConfirm(true)}><RotateCcw /> Restore this version</Button>
            </>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Restore this version?"
        description={dirty ? "You have unsaved changes; they will be lost. The current version stays available in the history." : "The current version stays available in the history."}
        confirmLabel="Restore"
        loading={pending}
        onConfirm={() => start(async () => {
          const r = await restoreRevision({ revisionId: selected! });
          if (r.ok) { toast.success("Version restored"); setConfirm(false); onRestored(); } else toast.error(r.error);
        })}
      />
    </div>
  );
}
