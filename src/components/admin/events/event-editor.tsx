"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, MoreHorizontal, Trash2 } from "lucide-react";
import { deleteEvent, duplicateEvent, updateEventDetails } from "@/app/admin/actions/events";
import {
  Button, Card, CardHeader, ConfirmDialog, DropdownContent, DropdownItem, DropdownMenu, DropdownTrigger, Field, Input, Select, Switch, cn,
} from "@/components/admin/ui";
import { MediaField, MediaListField } from "@/components/admin/media-picker";
import { RichTextEditor } from "@/components/admin/rich-text";
import { ProgrammeEditor } from "./programme-editor";
import { EventPartnersEditor } from "./partners-editor";
import { useUnsavedWarning } from "./pickers";
import type { EventDetails, EventPartnerDraft, SessionDraft } from "./types";

const TABS = [
  { id: "details", label: "Details" },
  { id: "programme", label: "Programme" },
  { id: "partners", label: "Partners" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function EventEditor({ details, sessions, hiddenDays, partners }: { details: EventDetails; sessions: SessionDraft[]; hiddenDays: number[]; partners: EventPartnerDraft[] }) {
  const [tab, setTab] = useState<TabId>("details");
  const [dirty, setDirty] = useState<Record<TabId, boolean>>({ details: false, programme: false, partners: false });
  const anyDirty = Object.values(dirty).some(Boolean);
  useUnsavedWarning(anyDirty);
  const markDirty = (id: TabId) => (v: boolean) => setDirty((d) => (d[id] === v ? d : { ...d, [id]: v }));

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Event sections" className="flex gap-1 border-b border-zinc-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t.id ? "border-brand text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800",
            )}
          >
            {t.label}
            {t.id === "programme" && <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 text-xs text-zinc-600">{sessions.length}</span>}
            {t.id === "partners" && <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 text-xs text-zinc-600">{partners.length}</span>}
            {dirty[t.id] && <span className="ml-1.5 inline-block size-1.5 rounded-full bg-amber-500 align-middle" aria-label="Unsaved changes" />}
          </button>
        ))}
      </div>
      {/* Tabs stay mounted so switching never loses unsaved edits. */}
      <div hidden={tab !== "details"}><DetailsForm initial={details} onDirty={markDirty("details")} /></div>
      <div hidden={tab !== "programme"}><ProgrammeEditor eventId={details.id} initial={sessions} initialHiddenDays={hiddenDays} onDirty={markDirty("programme")} /></div>
      <div hidden={tab !== "partners"}><EventPartnersEditor eventId={details.id} initial={partners} onDirty={markDirty("partners")} /></div>
    </div>
  );
}

function DetailsForm({ initial, onDirty }: { initial: EventDetails; onDirty: (v: boolean) => void }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();
  const dirty = useMemo(() => JSON.stringify(v) !== JSON.stringify(saved), [v, saved]);
  useEffect(() => onDirty(dirty), [dirty, onDirty]);

  const set = <K extends keyof EventDetails>(k: K, val: EventDetails[K]) => setV((s) => ({ ...s, [k]: val }));

  const save = () =>
    start(async () => {
      const res = await updateEventDetails(v);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      setErrors({});
      const next = { ...v, slug: res.data.slug };
      setV(next);
      setSaved(next);
      toast.success("Event saved");
      router.refresh();
    });

  return (
    <form className="grid gap-5 lg:grid-cols-[1fr_320px]" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <div className="space-y-5">
        <Card>
          <CardHeader title="General" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Title (English)" required error={errors.title}>{(p) => <Input {...p} value={v.title} onChange={(e) => set("title", e.target.value)} />}</Field>
            <Field label="Title (French)" error={errors.titleFr} hint="Falls back to English when empty.">{(p) => <Input {...p} value={v.titleFr} onChange={(e) => set("titleFr", e.target.value)} />}</Field>
            <Field label="Slug" required error={errors.slug} hint="Internal identifier; lowercase letters, numbers and dashes.">{(p) => <Input {...p} value={v.slug} onChange={(e) => set("slug", e.target.value)} />}</Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Edition" error={errors.edition}>{(p) => <Input {...p} type="number" min={1} value={v.edition ?? ""} onChange={(e) => set("edition", e.target.value ? Number(e.target.value) : null)} />}</Field>
              <Field label="Year" required error={errors.year}>{(p) => <Input {...p} type="number" min={2000} max={2100} value={v.year} onChange={(e) => set("year", Number(e.target.value))} />}</Field>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Date & venue" description="Times are entered in the event's time zone and stored in UTC." />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Starts" error={errors.startsAtLocal}>{(p) => <Input {...p} type="datetime-local" value={v.startsAtLocal} onChange={(e) => set("startsAtLocal", e.target.value)} />}</Field>
            <Field label="Ends" error={errors.endsAtLocal}>{(p) => <Input {...p} type="datetime-local" value={v.endsAtLocal} onChange={(e) => set("endsAtLocal", e.target.value)} />}</Field>
            <Field label="Time zone" error={errors.timezone} hint="IANA name, e.g. Europe/Paris or Africa/Lagos.">
              {(p) => (
                <Input {...p} list="tz-list" value={v.timezone} onChange={(e) => set("timezone", e.target.value)} />
              )}
            </Field>
            <datalist id="tz-list">
              {["Europe/Paris", "Europe/London", "Africa/Lagos", "UTC"].map((z) => <option key={z} value={z} />)}
            </datalist>
            <Field label="Venue name" error={errors.venueName}>{(p) => <Input {...p} value={v.venueName} onChange={(e) => set("venueName", e.target.value)} />}</Field>
            <Field label="Venue address" className="sm:col-span-2" error={errors.venueAddress}>{(p) => <Input {...p} value={v.venueAddress} onChange={(e) => set("venueAddress", e.target.value)} />}</Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Theme & description" />
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Theme (English)" error={errors.theme}>{(p) => <Input {...p} value={v.theme} onChange={(e) => set("theme", e.target.value)} />}</Field>
              <Field label="Theme (French)" error={errors.themeFr}>{(p) => <Input {...p} value={v.themeFr} onChange={(e) => set("themeFr", e.target.value)} />}</Field>
            </div>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-zinc-700">Description (English)</p>
              <RichTextEditor value={v.description} onChange={(h) => set("description", h)} />
            </div>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-zinc-700">Description (French)</p>
              <RichTextEditor value={v.descriptionFr} onChange={(h) => set("descriptionFr", h)} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Gallery" description="Photos from this edition." />
          <div className="p-5"><MediaListField value={v.galleryIds} onChange={(ids) => set("galleryIds", ids)} /></div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card className="lg:sticky lg:top-6">
          <CardHeader
            title="Publishing"
            action={
              <DropdownMenu>
                <DropdownTrigger asChild>
                  <Button size="icon-sm" variant="ghost" aria-label="More actions"><MoreHorizontal /></Button>
                </DropdownTrigger>
                <DropdownContent>
                  <DropdownItem
                    onSelect={async () => {
                      const res = await duplicateEvent({ id: v.id });
                      if (!res.ok) return void toast.error(res.error);
                      toast.success("Event duplicated as a draft");
                      router.push(`/admin/events/${res.data.id}/`);
                    }}
                  >
                    <Copy /> Duplicate event
                  </DropdownItem>
                  <DropdownItem destructive onSelect={() => setConfirmDelete(true)}><Trash2 /> Delete event</DropdownItem>
                </DropdownContent>
              </DropdownMenu>
            }
          />
          <div className="space-y-4 p-5">
            <Field label="Status">
              {(p) => (
                <Select {...p} value={v.status} onChange={(e) => set("status", e.target.value as EventDetails["status"])}>
                  <option value="DRAFT">Draft (not shown on the site)</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived (past edition, still viewable)</option>
                </Select>
              )}
            </Field>
            <Switch checked={v.isCurrent} onCheckedChange={(c) => set("isCurrent", c)} label="Current edition" />
            <p className="-mt-2 text-xs text-zinc-500">The current edition is the one promoted across the site. Only one edition can be current.</p>
            <Field label="Registration URL" error={errors.registrationUrl} hint="Ticketing page or /registration/.">
              {(p) => <Input {...p} value={v.registrationUrl} onChange={(e) => set("registrationUrl", e.target.value)} placeholder="https://" />}
            </Field>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-zinc-700">Banner image</p>
              <MediaField value={v.bannerId} onChange={(id) => set("bannerId", id)} />
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-4">
              <span className="text-xs text-zinc-500">{dirty ? "Unsaved changes" : "All changes saved"}</span>
              <span className="flex gap-2">
                {dirty && <Button onClick={() => { setV(saved); setErrors({}); }}>Discard</Button>}
                <Button type="submit" variant="primary" loading={pending} disabled={!dirty}>Save</Button>
              </span>
            </div>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this event?"
        description="The event, its programme sessions and its partner list are permanently deleted. Speakers and partners themselves are kept. Consider archiving instead."
        confirmLabel="Delete event"
        destructive
        loading={deleting}
        onConfirm={() =>
          startDelete(async () => {
            const res = await deleteEvent({ id: v.id });
            if (!res.ok) return void toast.error(res.error);
            toast.success("Event deleted");
            router.push("/admin/events/");
          })
        }
      />
    </form>
  );
}
