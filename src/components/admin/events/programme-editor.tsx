"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, CalendarPlus, Clock, Copy, MapPin, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { saveSessions } from "@/app/admin/actions/events";
import {
  Badge, Button, Card, ConfirmDialog, Dialog, DropdownContent, DropdownItem, DropdownMenu, DropdownSeparator, DropdownTrigger, EmptyState, Field, Input, Select,
} from "@/components/admin/ui";
import { RichTextEditor } from "@/components/admin/rich-text";
import { SortableList, moveItem } from "./sortable";
import { Avatar, SpeakerSearch } from "./pickers";
import { KIND_LABELS, ROLE_LABELS, type SessionDraft, type SessionKind, type SessionRole } from "./types";

let keySeq = 0;
const newKey = () => `new-${Date.now()}-${keySeq++}`;

const emptySession = (day: number): SessionDraft => ({
  key: newKey(), day, startTime: "", endTime: "", title: "", titleFr: "", theme: "", themeFr: "",
  description: "", descriptionFr: "", location: "", kind: "session", speakers: [],
});

export function ProgrammeEditor({ eventId, initial, onDirty }: { eventId: string; initial: SessionDraft[]; onDirty: (v: boolean) => void }) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [editing, setEditing] = useState<SessionDraft | null>(null);
  const [deleting, setDeleting] = useState<SessionDraft | null>(null);
  const [pending, start] = useTransition();
  const dirty = useMemo(() => JSON.stringify(sessions) !== JSON.stringify(saved), [sessions, saved]);
  useEffect(() => onDirty(dirty), [dirty, onDirty]);

  const days = useMemo(() => {
    const set = new Set(sessions.map((s) => s.day));
    if (!set.size) set.add(1);
    return [...set].sort((a, b) => a - b);
  }, [sessions]);

  const byDay = (day: number) => sessions.filter((s) => s.day === day);
  const replaceDay = (day: number, list: SessionDraft[]) => {
    // Keep global order: days ascending, sessions in the given order.
    const others = sessions.filter((s) => s.day !== day);
    const all = [...others, ...list];
    setSessions([...all].sort((a, b) => a.day - b.day || all.indexOf(a) - all.indexOf(b)));
  };

  const upsert = (s: SessionDraft) => {
    setSessions((list) => {
      const idx = list.findIndex((x) => x.key === s.key);
      if (idx === -1) return [...list, s].sort((a, b) => a.day - b.day);
      const next = [...list];
      next[idx] = s;
      return next.sort((a, b) => a.day - b.day || list.indexOf(a) - list.indexOf(b));
    });
  };

  const duplicate = (s: SessionDraft) => {
    const copy = { ...s, key: newKey(), dbId: undefined, title: `${s.title} (copy)` };
    setSessions((list) => {
      const idx = list.findIndex((x) => x.key === s.key);
      const next = [...list];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const save = () =>
    start(async () => {
      const res = await saveSessions({
        eventId,
        sessions: sessions.map((s) => ({
          id: s.dbId, day: s.day, startTime: s.startTime, endTime: s.endTime, title: s.title, titleFr: s.titleFr,
          theme: s.theme, themeFr: s.themeFr, description: s.description, descriptionFr: s.descriptionFr,
          location: s.location, kind: s.kind, speakers: s.speakers.map((x) => ({ speakerId: x.speaker.id, role: x.role })),
        })),
      });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Programme saved");
      setSaved(sessions);
      router.refresh();
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          {sessions.length} session{sessions.length === 1 ? "" : "s"} across {days.length} day{days.length === 1 ? "" : "s"}. Drag sessions to reorder them within a day.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => setEditing(emptySession(Math.max(...days) + (sessions.length ? 1 : 0)))}><CalendarPlus /> Add day</Button>
          {dirty && <Button onClick={() => setSessions(saved)}>Discard</Button>}
          <Button variant="primary" loading={pending} disabled={!dirty} onClick={save}>Save programme</Button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarPlus />}
            title="No sessions yet"
            description="Build the programme session by session. Pages with a Schedule block show it automatically."
            action={<Button variant="primary" onClick={() => setEditing(emptySession(1))}><Plus /> Add first session</Button>}
          />
        </Card>
      ) : (
        days.map((day) => {
          const list = byDay(day);
          return (
            <Card key={day}>
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
                <h2 className="text-sm font-semibold text-zinc-900">Day {day}</h2>
                <Button size="sm" variant="ghost" onClick={() => setEditing(emptySession(day))}><Plus /> Add session</Button>
              </div>
              <SortableList
                items={list.map((s) => ({ ...s, id: s.key }))}
                onReorder={(next) => replaceDay(day, next)}
                className="divide-y divide-zinc-100"
                render={(s, handle, i) => (
                  <div className="flex items-start gap-3 bg-white px-3 py-3 sm:px-4">
                    <div className="pt-0.5">{handle}</div>
                    <div className="w-24 shrink-0 pt-0.5 text-[13px] tabular-nums text-zinc-500">
                      {s.startTime || s.endTime ? (
                        <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {[s.startTime, s.endTime].filter(Boolean).join("–")}</span>
                      ) : (
                        "—"
                      )}
                    </div>
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditing(s)}>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-zinc-900">{s.title || <em className="text-zinc-500">Untitled</em>}</span>
                        {s.kind !== "session" && <Badge tone={s.kind === "break" || s.kind === "networking" ? "amber" : "blue"}>{KIND_LABELS[s.kind]}</Badge>}
                        {!s.titleFr && <Badge tone="neutral">No FR title</Badge>}
                      </span>
                      {s.theme && <span className="mt-0.5 block truncate text-[13px] text-zinc-500">{s.theme}</span>}
                      {s.location && <span className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500"><MapPin className="size-3" /> {s.location}</span>}
                      {s.speakers.length > 0 && (
                        <span className="mt-2 flex flex-wrap gap-1.5">
                          {s.speakers.map((sp) => (
                            <span key={sp.speaker.id} className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 py-0.5 pl-0.5 pr-2 text-xs text-zinc-700">
                              <Avatar url={sp.speaker.photoUrl} name={sp.speaker.name} className="size-5 text-[9px]" />
                              {sp.speaker.name}
                              {sp.role !== "SPEAKER" && <span className="text-zinc-500">· {ROLE_LABELS[sp.role]}</span>}
                            </span>
                          ))}
                        </span>
                      )}
                    </button>
                    <div className="flex shrink-0 items-center">
                      <Button size="icon-sm" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => replaceDay(day, moveItem(list, i, -1))}><ArrowUp /></Button>
                      <Button size="icon-sm" variant="ghost" aria-label="Move down" disabled={i === list.length - 1} onClick={() => replaceDay(day, moveItem(list, i, 1))}><ArrowDown /></Button>
                      <DropdownMenu>
                        <DropdownTrigger asChild><Button size="icon-sm" variant="ghost" aria-label="Session actions"><MoreHorizontal /></Button></DropdownTrigger>
                        <DropdownContent>
                          <DropdownItem onSelect={() => setEditing(s)}><Pencil /> Edit</DropdownItem>
                          <DropdownItem onSelect={() => duplicate(s)}><Copy /> Duplicate</DropdownItem>
                          <DropdownSeparator />
                          <DropdownItem destructive onSelect={() => setDeleting(s)}><Trash2 /> Delete</DropdownItem>
                        </DropdownContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}
              />
            </Card>
          );
        })
      )}

      {editing && (
        <SessionDialog
          key={editing.key}
          initial={editing}
          maxDay={Math.max(...days) + 1}
          onClose={() => setEditing(null)}
          onApply={(s) => { upsert(s); setEditing(null); }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this session?"
        description={<>“{deleting?.title}” will be removed when you save the programme.</>}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setSessions((l) => l.filter((x) => x.key !== deleting?.key)); setDeleting(null); }}
      />
    </div>
  );
}

function SessionDialog({ initial, maxDay, onClose, onApply }: { initial: SessionDraft; maxDay: number; onClose: () => void; onApply: (s: SessionDraft) => void }) {
  const [s, setS] = useState(initial);
  const [error, setError] = useState<string>();
  const set = <K extends keyof SessionDraft>(k: K, v: SessionDraft[K]) => setS((x) => ({ ...x, [k]: v }));
  const apply = () => {
    if (!s.title.trim()) return setError("Enter a session title.");
    onApply({ ...s, title: s.title.trim() });
  };
  const moveSpeaker = (i: number, d: number) => set("speakers", moveItem(s.speakers, i, d));

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={initial.dbId || initial.title ? "Edit session" : "New session"}
      description="Changes are applied to the programme; remember to save the programme."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={apply}>Apply</Button>
        </>
      }
    >
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); apply(); }}>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Day">
            {(p) => (
              <Select {...p} value={s.day} onChange={(e) => set("day", Number(e.target.value))}>
                {Array.from({ length: Math.max(maxDay, s.day) }, (_, i) => i + 1).map((d) => <option key={d} value={d}>Day {d}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Start">{(p) => <Input {...p} value={s.startTime} onChange={(e) => set("startTime", e.target.value)} placeholder="09:00" />}</Field>
          <Field label="End">{(p) => <Input {...p} value={s.endTime} onChange={(e) => set("endTime", e.target.value)} placeholder="10:30" />}</Field>
          <Field label="Type">
            {(p) => (
              <Select {...p} value={s.kind} onChange={(e) => set("kind", e.target.value as SessionKind)}>
                {Object.entries(KIND_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </Select>
            )}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title (English)" required error={error}>{(p) => <Input {...p} value={s.title} onChange={(e) => { set("title", e.target.value); setError(undefined); }} autoFocus />}</Field>
          <Field label="Title (French)">{(p) => <Input {...p} value={s.titleFr} onChange={(e) => set("titleFr", e.target.value)} />}</Field>
          <Field label="Theme (English)">{(p) => <Input {...p} value={s.theme} onChange={(e) => set("theme", e.target.value)} />}</Field>
          <Field label="Theme (French)">{(p) => <Input {...p} value={s.themeFr} onChange={(e) => set("themeFr", e.target.value)} />}</Field>
          <Field label="Location / room" className="sm:col-span-2">{(p) => <Input {...p} value={s.location} onChange={(e) => set("location", e.target.value)} placeholder="Main hall" />}</Field>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-medium text-zinc-700">Speakers & moderators</p>
          {s.speakers.length > 0 && (
            <ul className="mb-3 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
              {s.speakers.map((sp, i) => (
                <li key={sp.speaker.id} className="flex items-center gap-2.5 px-3 py-2">
                  <Avatar url={sp.speaker.photoUrl} name={sp.speaker.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-900">{sp.speaker.name}</span>
                    <span className="block truncate text-xs text-zinc-500">{[sp.speaker.jobTitle, sp.speaker.organization].filter(Boolean).join(", ")}</span>
                  </span>
                  <Select
                    aria-label={`Role of ${sp.speaker.name}`}
                    className="h-8 w-32"
                    value={sp.role}
                    onChange={(e) => set("speakers", s.speakers.map((x, j) => (j === i ? { ...x, role: e.target.value as SessionRole } : x)))}
                  >
                    {Object.entries(ROLE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </Select>
                  <Button size="icon-sm" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => moveSpeaker(i, -1)}><ArrowUp /></Button>
                  <Button size="icon-sm" variant="ghost" aria-label="Move down" disabled={i === s.speakers.length - 1} onClick={() => moveSpeaker(i, 1)}><ArrowDown /></Button>
                  <Button size="icon-sm" variant="danger-ghost" aria-label={`Remove ${sp.speaker.name}`} onClick={() => set("speakers", s.speakers.filter((_, j) => j !== i))}><X /></Button>
                </li>
              ))}
            </ul>
          )}
          <SpeakerSearch
            exclude={s.speakers.map((x) => x.speaker.id)}
            onPick={(speaker) => set("speakers", [...s.speakers, { speaker, role: "SPEAKER" }])}
          />
        </div>

        <div>
          <p className="mb-1.5 text-[13px] font-medium text-zinc-700">Description (English)</p>
          <RichTextEditor minimal value={s.description} onChange={(h) => set("description", h)} />
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-zinc-700">Description (French)</p>
          <RichTextEditor minimal value={s.descriptionFr} onChange={(h) => set("descriptionFr", h)} />
        </div>
      </form>
    </Dialog>
  );
}
