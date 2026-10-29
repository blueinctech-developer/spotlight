"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Handshake, Plus, X } from "lucide-react";
import { saveEventPartners } from "@/app/admin/actions/events";
import { Button, Card, CardHeader, Dialog, EmptyState, Select } from "@/components/admin/ui";
import { SortableList } from "./sortable";
import { PartnerSearch } from "./pickers";
import { TIER_LABELS, type EventPartnerDraft } from "./types";

const TIER_ORDER = ["CO_ORGANIZER", "SUPPORTER", "SPONSOR", "PARTNER", "MEDIA_PARTNER"];

export function EventPartnersEditor({ eventId, initial, onDirty }: { eventId: string; initial: EventPartnerDraft[]; onDirty: (v: boolean) => void }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();
  const dirty = useMemo(() => JSON.stringify(items) !== JSON.stringify(saved), [items, saved]);
  useEffect(() => onDirty(dirty), [dirty, onDirty]);

  const save = () =>
    start(async () => {
      const res = await saveEventPartners({ eventId, partners: items.map((i) => ({ partnerId: i.partner.id, tier: i.tier as "PARTNER" })) });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Partners saved");
      setSaved(items);
      router.refresh();
    });

  const counts = TIER_ORDER.map((t) => [t, items.filter((i) => i.tier === t).length] as const).filter(([, n]) => n);

  return (
    <Card>
      <CardHeader
        title="Partners & sponsors of this edition"
        description={counts.length ? counts.map(([t, n]) => `${n} ${TIER_LABELS[t].toLowerCase()}${n > 1 ? "s" : ""}`).join(" · ") : "Attach existing partners and choose their role for this edition."}
        action={
          <span className="flex gap-2">
            <Button size="sm" onClick={() => setAdding(true)}><Plus /> Add partners</Button>
            {dirty && <Button size="sm" onClick={() => setItems(saved)}>Discard</Button>}
            <Button size="sm" variant="primary" loading={pending} disabled={!dirty} onClick={save}>Save</Button>
          </span>
        }
      />
      {items.length === 0 ? (
        <EmptyState icon={<Handshake />} title="No partners attached" description="Partners are shared records: create them once under Partners, then attach them to each edition." />
      ) : (
        <SortableList
          items={items.map((i) => ({ ...i, id: i.key }))}
          onReorder={(next) => setItems(next)}
          className="divide-y divide-zinc-100"
          render={(item, handle) => (
            <div className="flex items-center gap-3 bg-white px-3 py-2.5 sm:px-4">
              {handle}
              <span className="flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded border border-zinc-100 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {item.partner.logoUrl ? <img src={item.partner.logoUrl} alt="" className="max-h-9 max-w-14 object-contain" /> : null}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900">{item.partner.name}</span>
              <Select
                aria-label={`Role of ${item.partner.name}`}
                className="h-8 w-40"
                value={item.tier}
                onChange={(e) => setItems((l) => l.map((x) => (x.key === item.key ? { ...x, tier: e.target.value } : x)))}
              >
                {TIER_ORDER.map((t) => <option key={t} value={t}>{TIER_LABELS[t]}</option>)}
              </Select>
              <Button size="icon-sm" variant="danger-ghost" aria-label={`Remove ${item.partner.name}`} onClick={() => setItems((l) => l.filter((x) => x.key !== item.key))}><X /></Button>
            </div>
          )}
        />
      )}
      <Dialog open={adding} onOpenChange={setAdding} title="Add partners" description="Click partners to add them. Their default tier is used; you can change it afterwards." size="lg" footer={<Button variant="primary" onClick={() => setAdding(false)}>Done</Button>}>
        <PartnerSearch
          exclude={items.map((i) => i.partner.id)}
          onPick={(p) => setItems((l) => [...l, { key: p.id, partner: p, tier: p.tier }])}
        />
      </Dialog>
    </Card>
  );
}
