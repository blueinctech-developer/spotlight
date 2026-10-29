"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteSpeaker, saveSpeaker } from "@/app/admin/actions/speakers";
import { Badge, Button, Card, CardHeader, ConfirmDialog, Field, Input, Switch } from "@/components/admin/ui";
import { MediaField } from "@/components/admin/media-picker";
import { RichTextEditor } from "@/components/admin/rich-text";
import { useUnsavedWarning } from "@/components/admin/events/pickers";
import { ROLE_LABELS, type SessionRole } from "@/components/admin/events/types";

type Values = {
  id: string; name: string; slug: string; jobTitle: string; jobTitleFr: string; organization: string; bio: string; bioFr: string;
  photoId: string | null; website: string; linkedin: string; twitter: string; order: number; published: boolean;
};
type SessionRef = { id: string; title: string; role: string; day: number; time: string; eventId: string; eventTitle: string };

export function SpeakerForm({ initial, sessions }: { initial: Values; sessions: SessionRef[] }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [deleting, startDelete] = useTransition();
  const dirty = useMemo(() => JSON.stringify(v) !== JSON.stringify(saved), [v, saved]);
  useUnsavedWarning(dirty);
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((s) => ({ ...s, [k]: val }));

  const save = () =>
    start(async () => {
      const res = await saveSpeaker(v);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        return void toast.error(res.error);
      }
      setErrors({});
      const next = { ...v, slug: res.data.slug };
      setV(next);
      setSaved(next);
      toast.success("Speaker saved");
      router.refresh();
    });

  return (
    <form className="grid gap-5 lg:grid-cols-[1fr_320px]" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <div className="space-y-5">
        <Card>
          <CardHeader title="Profile" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Full name" required error={errors.name}>{(p) => <Input {...p} value={v.name} onChange={(e) => set("name", e.target.value)} />}</Field>
            <Field label="URL slug" error={errors.slug} hint={`Public page: /speakers/${v.slug || "…"}/`}>{(p) => <Input {...p} value={v.slug} onChange={(e) => set("slug", e.target.value)} />}</Field>
            <Field label="Job title (English)" error={errors.jobTitle}>{(p) => <Input {...p} value={v.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} placeholder="CEO" />}</Field>
            <Field label="Job title (French)" error={errors.jobTitleFr} hint="Falls back to English when empty.">{(p) => <Input {...p} value={v.jobTitleFr} onChange={(e) => set("jobTitleFr", e.target.value)} />}</Field>
            <Field label="Organisation" className="sm:col-span-2" error={errors.organization}>{(p) => <Input {...p} value={v.organization} onChange={(e) => set("organization", e.target.value)} />}</Field>
          </div>
        </Card>
        <Card>
          <CardHeader title="Biography" />
          <div className="space-y-4 p-5">
            <div><p className="mb-1.5 text-[13px] font-medium text-zinc-700">English</p><RichTextEditor value={v.bio} onChange={(h) => set("bio", h)} allowImages={false} /></div>
            <div><p className="mb-1.5 text-[13px] font-medium text-zinc-700">French</p><RichTextEditor value={v.bioFr} onChange={(h) => set("bioFr", h)} allowImages={false} /></div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Links" />
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <Field label="Website" error={errors.website}>{(p) => <Input {...p} value={v.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />}</Field>
            <Field label="LinkedIn" error={errors.linkedin}>{(p) => <Input {...p} value={v.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="https://linkedin.com/in/…" />}</Field>
            <Field label="X (Twitter)" error={errors.twitter}>{(p) => <Input {...p} value={v.twitter} onChange={(e) => set("twitter", e.target.value)} placeholder="https://x.com/…" />}</Field>
          </div>
        </Card>
        <Card>
          <CardHeader title="Sessions" description="Assign speakers to sessions from an event's Programme tab." />
          {sessions.length === 0 ? (
            <p className="px-5 py-6 text-sm text-zinc-500">Not assigned to any session.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {sessions.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                  <span>
                    <span className="font-medium text-zinc-900">{s.title}</span>
                    <span className="block text-xs text-zinc-500">Day {s.day}{s.time ? ` · ${s.time}` : ""} · <Link href={`/admin/events/${s.eventId}/`} className="hover:underline">{s.eventTitle}</Link></span>
                  </span>
                  <Badge tone="blue">{ROLE_LABELS[s.role as SessionRole] ?? s.role}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="space-y-5">
        <Card className="lg:sticky lg:top-6">
          <CardHeader title="Publishing" />
          <div className="space-y-4 p-5">
            <Switch checked={v.published} onCheckedChange={(c) => set("published", c)} label={v.published ? "Published" : "Hidden from the site"} />
            <div><p className="mb-1.5 text-[13px] font-medium text-zinc-700">Photo</p><MediaField value={v.photoId} onChange={(id) => set("photoId", id)} aspect="aspect-square" /></div>
            <Field label="Display order" hint="Lower numbers appear first. You can also drag speakers in the list.">{(p) => <Input {...p} type="number" min={0} value={v.order} onChange={(e) => set("order", Number(e.target.value) || 0)} />}</Field>
            <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-4">
              <Button variant="danger-ghost" size="sm" onClick={() => setConfirm(true)}><Trash2 /> Delete</Button>
              <span className="flex gap-2">
                {dirty && <Button onClick={() => setV(saved)}>Discard</Button>}
                <Button type="submit" variant="primary" loading={pending} disabled={!dirty}>Save</Button>
              </span>
            </div>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete ${v.name}?`}
        destructive
        confirmLabel="Delete speaker"
        loading={deleting}
        description={
          sessions.length ? (
            <>
              <p>This speaker is assigned to {sessions.length} session{sessions.length > 1 ? "s" : ""} and will be removed from:</p>
              <ul className="mt-2 list-disc pl-5">{sessions.map((s) => <li key={s.id}>{s.title} ({s.eventTitle})</li>)}</ul>
              <p className="mt-2">Consider hiding the speaker instead.</p>
            </>
          ) : (
            "The speaker profile will be permanently deleted."
          )
        }
        onConfirm={() =>
          startDelete(async () => {
            const res = await deleteSpeaker({ id: v.id });
            if (!res.ok) return void toast.error(res.error);
            toast.success("Speaker deleted");
            router.push("/admin/speakers/");
          })
        }
      />
    </form>
  );
}
