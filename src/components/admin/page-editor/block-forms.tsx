"use client";

import type { ReactNode } from "react";
import { formKeys, iconNames, isAllowedEmbed, youtubeEmbedUrl, type BlockOf } from "@/lib/blocks/schema";
import type { ReferenceOptions } from "@/app/admin/actions/references";
import type { AnyBlock } from "./tree";
import {
  BoolField, HtmlField, ImageField, ImageListField, LinkField, NumberField, RefListField, Repeater, SelectField, StringListField, TextField,
} from "./fields";
import { textOf } from "./util";

type Props<T extends AnyBlock["type"]> = { b: BlockOf<T>; set: (patch: Partial<BlockOf<T>>) => void; refs: ReferenceOptions };
const emptyLink = { label: "", href: "", newTab: false };
const ICON_OPTIONS = iconNames.map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{title}</h3>
      {children}
    </section>
  );
}

function Hero({ b, set, refs }: Props<"hero">) {
  return (
    <>
      <TextField label="Eyebrow" value={b.eyebrow} onChange={(v) => set({ eyebrow: v })} placeholder="#SNFEvent2026" />
      <TextField label="Title (H1)" value={b.title} onChange={(v) => set({ title: v })} />
      <TextField label="Subtitle" value={b.subtitle} onChange={(v) => set({ subtitle: v })} />
      <Repeater
        label="Event facts"
        items={b.facts}
        onChange={(facts) => set({ facts })}
        create={() => ({ icon: "info" as const, text: "", highlight: false })}
        itemLabel={(f) => f.text}
        max={6}
        render={(f, up) => (
          <>
            <SelectField label="Icon" value={f.icon} onChange={(icon) => up({ icon })} options={ICON_OPTIONS} />
            <TextField label="Text" value={f.text} onChange={(text) => up({ text })} />
            <BoolField label="Highlight (green, uppercase)" value={f.highlight} onChange={(highlight) => up({ highlight })} />
          </>
        )}
      />
      <LinkField label="Primary button" value={b.primary} onChange={(primary) => set({ primary })} links={refs.links} />
      <TextField label="Video URL (YouTube)" value={b.videoUrl} onChange={(videoUrl) => set({ videoUrl })} mono error={b.videoUrl && !youtubeEmbedUrl(b.videoUrl) ? "Not a recognised YouTube link." : undefined} />
      <TextField label="Video label" value={b.videoLabel} onChange={(videoLabel) => set({ videoLabel })} />
      <ImageField label="Photo" value={b.image} onChange={(image) => set({ image })} />
    </>
  );
}

function IntroBand({ b, set }: Props<"introBand">) {
  return (
    <>
      <TextField label="Title" value={b.title} onChange={(title) => set({ title })} />
      <HtmlField label="Text" value={b.body} onChange={(body) => set({ body })} minimal />
      <SelectField label="Background" value={b.tone} onChange={(tone) => set({ tone })} options={["grey", "white", "green", "navy"] as const} />
    </>
  );
}

const statsRepeater = (items: { value: number; suffix: string; label: string }[], onChange: (v: typeof items) => void) => (
  <Repeater
    label="Statistics"
    items={items}
    onChange={onChange}
    create={() => ({ value: 0, suffix: "+", label: "" })}
    itemLabel={(s) => `${s.value}${s.suffix} ${s.label}`}
    max={8}
    render={(s, up) => (
      <div className="grid grid-cols-3 gap-2">
        <NumberField label="Number" value={s.value} onChange={(value) => up({ value })} min={0} />
        <TextField label="Suffix" value={s.suffix} onChange={(suffix) => up({ suffix })} />
        <TextField label="Label" value={s.label} onChange={(label) => up({ label })} />
      </div>
    )}
  />
);

function Glance({ b, set }: Props<"glance">) {
  return (
    <>
      <TextField label="Title" value={b.title} onChange={(title) => set({ title })} />
      <TextField label="Title accent" value={b.titleAccent} onChange={(titleAccent) => set({ titleAccent })} hint="End of the title shown in black, e.g. “at a glance”." />
      <ImageListField label="Collage images (up to 3)" value={b.images} onChange={(images) => set({ images })} max={3} />
      <TextField label="Video URL (YouTube)" value={b.videoUrl} onChange={(videoUrl) => set({ videoUrl })} mono />
      <HtmlField label="Text" value={b.body} onChange={(body) => set({ body })} minimal />
      {statsRepeater(b.stats, (stats) => set({ stats }))}
    </>
  );
}

function Stats({ b, set }: Props<"stats">) {
  return statsRepeater(b.items, (items) => set({ items }));
}

function SplitCta({ b, set, refs }: Props<"splitCta">) {
  return (
    <>
      <ImageField label="Photo" value={b.image} onChange={(image) => set({ image })} />
      <SelectField label="Photo side" value={b.imageSide} onChange={(imageSide) => set({ imageSide })} options={["left", "right"] as const} />
      <TextField label="Eyebrow" value={b.eyebrow} onChange={(eyebrow) => set({ eyebrow })} />
      <TextField label="Title" value={b.title} onChange={(title) => set({ title })} />
      <HtmlField label="Text" value={b.body} onChange={(body) => set({ body })} minimal />
      <LinkField label="Button" value={b.button} onChange={(button) => set({ button })} links={refs.links} />
    </>
  );
}

function Partners({ b, set, refs }: Props<"partners">) {
  return (
    <>
      <TextField label="Title" value={b.title} onChange={(title) => set({ title })} />
      <TextField label="Subtitle" value={b.subtitle} onChange={(subtitle) => set({ subtitle })} />
      <Repeater
        label="Logo groups"
        items={b.groups}
        onChange={(groups) => set({ groups })}
        create={() => ({ heading: "", partnerIds: [] })}
        itemLabel={(g) => `${g.heading || "Untitled group"} (${g.partnerIds.length})`}
        max={10}
        addLabel="Add group"
        render={(g, up) => (
          <>
            <TextField label="Group heading" value={g.heading} onChange={(heading) => up({ heading })} />
            <RefListField label="Partners (in display order)" value={g.partnerIds} onChange={(partnerIds) => up({ partnerIds })} options={refs.partners} hint="Manage logos and names under Event → Partners." />
          </>
        )}
      />
    </>
  );
}

function Highlights({ b, set }: Props<"highlights">) {
  return (
    <>
      <TextField label="Title (optional)" value={b.title} onChange={(title) => set({ title })} />
      <Repeater
        label="Tiles"
        items={b.items}
        onChange={(items) => set({ items })}
        create={() => ({ image: null, title: "", caption: "" })}
        itemLabel={(i) => i.title}
        max={24}
        addLabel="Add tile"
        render={(i, up) => (
          <>
            <ImageField label="Photo" value={i.image} onChange={(image) => up({ image })} />
            <TextField label="Title" value={i.title} onChange={(title) => up({ title })} />
            <TextField label="Caption" value={i.caption} onChange={(caption) => up({ caption })} />
          </>
        )}
      />
    </>
  );
}

function Testimonials({ b, set, refs }: Props<"testimonials">) {
  return (
    <>
      <TextField label="Title" value={b.title} onChange={(title) => set({ title })} />
      <RefListField label="Testimonials" value={b.testimonialIds} onChange={(testimonialIds) => set({ testimonialIds })} options={refs.testimonials} emptyMeansAll="Showing all visible testimonials in their configured order." />
    </>
  );
}

function PageTitle({ b, set }: Props<"pageTitle">) {
  return (
    <>
      <TextField label="Title (H1)" value={b.title} onChange={(title) => set({ title })} />
      <TextField label="Subtitle" value={b.subtitle} onChange={(subtitle) => set({ subtitle })} multiline />
      <SelectField
        label="Style"
        value={b.variant}
        onChange={(variant) => set({ variant })}
        options={[{ value: "plain", label: "Plain (white, breadcrumb)" }, { value: "dark", label: "Dark texture" }, { value: "image", label: "Photo with overlay" }] as const}
      />
      <BoolField label="Show breadcrumb" value={b.showBreadcrumb} onChange={(showBreadcrumb) => set({ showBreadcrumb })} />
      {b.variant !== "plain" && <ImageField label="Background photo" value={b.background} onChange={(background) => set({ background })} />}
    </>
  );
}

function RichText({ b, set }: Props<"richText">) {
  return (
    <>
      <HtmlField label="Content" value={b.html} onChange={(html) => set({ html })} />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Width" value={b.width} onChange={(width) => set({ width })} options={["narrow", "normal", "wide"] as const} />
        <SelectField label="Alignment" value={b.align} onChange={(align) => set({ align })} options={["left", "center"] as const} />
      </div>
    </>
  );
}

function Heading({ b, set }: Props<"heading">) {
  return (
    <>
      <TextField label="Text" value={b.text} onChange={(text) => set({ text })} />
      <TextField label="Subtitle" value={b.subtitle} onChange={(subtitle) => set({ subtitle })} multiline />
      <div className="grid grid-cols-3 gap-2">
        <SelectField label="Level" value={b.level} onChange={(level) => set({ level })} options={["h1", "h2", "h3", "h4", "h5", "h6"].map((v) => ({ value: v as "h1", label: v.toUpperCase() }))} />
        <SelectField label="Align" value={b.align} onChange={(align) => set({ align })} options={["left", "center", "right"] as const} />
        <SelectField label="Colour" value={b.tone} onChange={(tone) => set({ tone })} options={["dark", "brand", "muted"] as const} />
      </div>
      {b.level === "h1" && <p className="text-xs text-amber-700">Use only one H1 per page (usually the page title).</p>}
    </>
  );
}

function ImageB({ b, set, refs }: Props<"image">) {
  return (
    <>
      <ImageField label="Image" value={b.image} onChange={(image) => set({ image })} hint="Alt text is edited in the media library." />
      <TextField label="Caption" value={b.caption} onChange={(caption) => set({ caption })} />
      <TextField label="Link (optional)" value={b.link} onChange={(link) => set({ link })} mono />
      <datalist id="links">{refs.links.map((l) => <option key={l.href} value={l.href} />)}</datalist>
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Size" value={b.size} onChange={(size) => set({ size })} options={["small", "medium", "full"] as const} />
        <SelectField label="Alignment" value={b.align} onChange={(align) => set({ align })} options={["left", "center"] as const} />
      </div>
    </>
  );
}

function Gallery({ b, set }: Props<"gallery">) {
  return (
    <>
      <ImageListField
        label="Images"
        value={b.images.map((i) => i.image)}
        onChange={(ids) => set({ images: ids.map((id) => b.images.find((i) => i.image === id) ?? { image: id, title: "", caption: "" }) })}
      />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Layout" value={b.layout} onChange={(layout) => set({ layout })} options={[{ value: "grid", label: "Grid" }, { value: "mosaic", label: "Mosaic" }] as const} />
        <NumberField label="Columns (grid)" value={b.columns} onChange={(columns) => set({ columns: Math.min(6, Math.max(2, columns)) })} min={2} max={6} />
      </div>
      <BoolField label="Open images in a lightbox" value={b.lightbox} onChange={(lightbox) => set({ lightbox })} />
    </>
  );
}

function Buttons({ b, set, refs }: Props<"buttons">) {
  return (
    <>
      <Repeater
        label="Buttons"
        items={b.items}
        onChange={(items) => set({ items })}
        create={() => ({ ...emptyLink, variant: "primary" as const })}
        itemLabel={(i) => i.label}
        max={4}
        addLabel="Add button"
        render={(i, up) => (
          <>
            <LinkField label="Link" value={i} onChange={(v) => up(v)} links={refs.links} />
            <SelectField label="Style" value={i.variant} onChange={(variant) => up({ variant })} options={["primary", "dark", "outline"] as const} />
          </>
        )}
      />
      <SelectField label="Alignment" value={b.align} onChange={(align) => set({ align })} options={["left", "center", "right"] as const} />
    </>
  );
}

function Video({ b, set }: Props<"video">) {
  return (
    <>
      <TextField label="YouTube URL" value={b.url} onChange={(url) => set({ url })} mono error={b.url && !youtubeEmbedUrl(b.url) ? "Not a recognised YouTube link." : undefined} />
      <TextField label="Title (for accessibility)" value={b.title} onChange={(title) => set({ title })} />
    </>
  );
}

function InfoCards({ b, set }: Props<"infoCards">) {
  return (
    <Repeater
      label="Cards"
      items={b.items}
      onChange={(items) => set({ items })}
      create={() => ({ icon: "info" as const, title: "", text: "", href: "" })}
      itemLabel={(i) => i.title}
      max={8}
      addLabel="Add card"
      render={(i, up) => (
        <>
          <SelectField label="Icon" value={i.icon} onChange={(icon) => up({ icon })} options={ICON_OPTIONS} />
          <TextField label="Title" value={i.title} onChange={(title) => up({ title })} />
          <TextField label="Text" value={i.text} onChange={(text) => up({ text })} multiline />
          <TextField label="Link (tel:, mailto: or URL)" value={i.href} onChange={(href) => up({ href })} mono />
        </>
      )}
    />
  );
}

function FeatureSplit({ b, set, refs }: Props<"featureSplit">) {
  return (
    <>
      <TextField label="Title" value={b.title} onChange={(title) => set({ title })} />
      <HtmlField label="Text" value={b.body} onChange={(body) => set({ body })} minimal />
      <Repeater
        label="Facts"
        items={b.facts}
        onChange={(facts) => set({ facts })}
        create={() => ({ label: "", text: "" })}
        itemLabel={(f) => `${f.label}: ${f.text}`}
        max={4}
        addLabel="Add fact"
        render={(f, up) => (
          <>
            <TextField label="Label" value={f.label} onChange={(label) => up({ label })} placeholder="Where" />
            <TextField label="Text" value={f.text} onChange={(text) => up({ text })} />
          </>
        )}
      />
      <ImageListField label="Images (up to 3)" value={b.images} onChange={(images) => set({ images })} max={3} />
      <SelectField label="Images side" value={b.imageSide} onChange={(imageSide) => set({ imageSide })} options={["left", "right"] as const} />
      <LinkField label="Button (optional)" value={b.button} onChange={(button) => set({ button })} links={refs.links} />
    </>
  );
}

function Tabs({ b, set }: Props<"tabs">) {
  return (
    <>
      <TextField label="Title" value={b.title} onChange={(title) => set({ title })} />
      <HtmlField label="Introduction" value={b.intro} onChange={(intro) => set({ intro })} minimal />
      <Repeater
        label="Tabs"
        items={b.items}
        onChange={(items) => set({ items })}
        create={() => ({ label: "", body: "", image: null })}
        itemLabel={(i) => i.label}
        max={10}
        addLabel="Add tab"
        render={(i, up) => (
          <>
            <TextField label="Tab label" value={i.label} onChange={(label) => up({ label })} />
            <HtmlField label="Text (optional)" value={i.body} onChange={(body) => up({ body })} minimal />
            <ImageField label="Image" value={i.image} onChange={(image) => up({ image })} />
          </>
        )}
      />
    </>
  );
}

function Pricing({ b, set, refs }: Props<"pricing">) {
  return (
    <>
      <Repeater
        label="Options"
        items={b.items}
        onChange={(items) => set({ items })}
        create={() => ({ title: "", price: "", features: [], button: emptyLink, highlight: false })}
        itemLabel={(i) => i.title}
        max={4}
        addLabel="Add option"
        render={(i, up) => (
          <>
            <TextField label="Title" value={i.title} onChange={(title) => up({ title })} />
            <TextField label="Price (optional)" value={i.price} onChange={(price) => up({ price })} />
            <StringListField label="Features" value={i.features} onChange={(features) => up({ features })} placeholder="Access to…" />
            <LinkField label="Button" value={i.button} onChange={(button) => up({ button })} links={refs.links} />
            <BoolField label="Green highlight" value={i.highlight} onChange={(highlight) => up({ highlight })} />
          </>
        )}
      />
      <TextField label="Help title" value={b.helpTitle} onChange={(helpTitle) => set({ helpTitle })} />
      <HtmlField label="Help text" value={b.helpText} onChange={(helpText) => set({ helpText })} minimal />
      <Repeater
        label="Help contacts"
        items={b.helpContacts}
        onChange={(helpContacts) => set({ helpContacts })}
        create={() => ({ icon: "phone" as const, text: "", href: "" })}
        itemLabel={(c) => c.text}
        max={6}
        addLabel="Add contact"
        render={(c, up) => (
          <>
            <SelectField label="Icon" value={c.icon} onChange={(icon) => up({ icon })} options={ICON_OPTIONS} />
            <TextField label="Text" value={c.text} onChange={(text) => up({ text })} />
            <TextField label="Link" value={c.href} onChange={(href) => up({ href })} mono placeholder="tel:+33… or mailto:…" />
          </>
        )}
      />
    </>
  );
}

function Organizer({ b, set }: Props<"organizer">) {
  return (
    <>
      <TextField label="Title" value={b.title} onChange={(title) => set({ title })} />
      <ImageField label="Logo" value={b.logo} onChange={(logo) => set({ logo })} />
      <HtmlField label="Text" value={b.body} onChange={(body) => set({ body })} />
    </>
  );
}

function Speakers({ b, set, refs }: Props<"speakers">) {
  return (
    <>
      <TextField label="Title" value={b.title} onChange={(title) => set({ title })} />
      <TextField label="Subtitle" value={b.subtitle} onChange={(subtitle) => set({ subtitle })} />
      <RefListField label="Speakers" value={b.speakerIds} onChange={(speakerIds) => set({ speakerIds })} options={refs.speakers} emptyMeansAll="Showing all published speakers." />
      <NumberField label="Columns" value={b.columns} onChange={(columns) => set({ columns: Math.min(5, Math.max(2, columns)) })} min={2} max={5} />
    </>
  );
}

function Schedule({ b, set, refs }: Props<"schedule">) {
  return (
    <>
      <TextField label="Title" value={b.title} onChange={(title) => set({ title })} />
      <SelectField
        label="Event edition"
        value={b.eventId ?? ""}
        onChange={(v) => set({ eventId: v || null })}
        options={[{ value: "", label: "— Choose an event —" }, ...refs.events.map((e) => ({ value: e.id, label: `${e.label} (${e.sublabel})` }))]}
        hint="Sessions are edited under Event → Events."
      />
      <TextField label="Message when there are no sessions yet" value={b.emptyTitle} onChange={(emptyTitle) => set({ emptyTitle })} placeholder="Coming soon" />
      <TextField label="Secondary message" value={b.emptySubtitle} onChange={(emptySubtitle) => set({ emptySubtitle })} />
    </>
  );
}

function PostList({ b, set, refs }: Props<"postList">) {
  const cats = refs.links.filter((l) => l.href.startsWith("/category/"));
  return (
    <>
      <TextField label="Title (optional)" value={b.title} onChange={(title) => set({ title })} />
      <SelectField
        label="Category"
        value={b.categorySlug}
        onChange={(categorySlug) => set({ categorySlug })}
        options={[{ value: "", label: "All posts" }, ...cats.map((c) => ({ value: c.href.split("/")[2], label: c.label.replace("Category: ", "") }))]}
      />
      <NumberField label="Posts per page" value={b.perPage} onChange={(perPage) => set({ perPage: Math.min(50, Math.max(1, perPage)) })} min={1} max={50} />
    </>
  );
}

function Form({ b, set }: Props<"form">) {
  return (
    <>
      <SelectField
        label="Form"
        value={b.form}
        onChange={(form) => set({ form })}
        options={formKeys.map((k) => ({ value: k, label: { contact: "Contact", sponsorship: "Sponsorship", "report-download": "Report download", press: "Press registration", newsletter: "Newsletter" }[k] }))}
        hint="Submissions appear under Event → Submissions."
      />
      <TextField label="Title" value={b.title} onChange={(title) => set({ title })} />
      <HtmlField label="Introduction" value={b.intro} onChange={(intro) => set({ intro })} minimal />
      {b.form === "report-download" && <ImageField label="File offered after submission" value={b.download} onChange={(download) => set({ download })} accept="document" hint="Usually a PDF report." />}
      <BoolField label="Form is closed" value={b.closed} onChange={(closed) => set({ closed })} />
      {b.closed && <TextField label="Closed message" value={b.closedMessage} onChange={(closedMessage) => set({ closedMessage })} />}
    </>
  );
}

function Embed({ b, set }: Props<"embed">) {
  return (
    <>
      <TextField
        label="Embed URL"
        value={b.url}
        onChange={(url) => set({ url })}
        mono
        error={b.url && !isAllowedEmbed(b.url) ? "Only https links from Google Forms, YouTube, Vimeo, Flickr or Weezevent are allowed." : undefined}
      />
      <TextField label="Title (for accessibility)" value={b.title} onChange={(title) => set({ title })} />
      <NumberField label="Height (px)" value={b.height} onChange={(height) => set({ height: Math.min(3000, Math.max(200, height)) })} min={200} max={3000} />
    </>
  );
}

function ContactAside({ b, set }: Props<"contactAside">) {
  return (
    <>
      <TextField label="Title" value={b.title} onChange={(title) => set({ title })} />
      <HtmlField label="Text" value={b.text} onChange={(text) => set({ text })} minimal />
      <BoolField label="Show social links" value={b.showSocial} onChange={(showSocial) => set({ showSocial })} hint="Links come from Settings → Social." />
    </>
  );
}

function Spacer({ b, set }: Props<"spacer">) {
  return <SelectField label="Size" value={b.size} onChange={(size) => set({ size })} options={["sm", "md", "lg", "xl"] as const} />;
}

function Columns({ b, set }: Props<"columns">) {
  const counts: Record<string, number> = { "1-1": 2, "1-2": 2, "2-1": 2, "1-1-1": 3, "1-1-1-1": 4 };
  return (
    <>
      <SelectField
        label="Layout"
        value={b.ratio}
        onChange={(ratio) => {
          const n = counts[ratio];
          const columns = [...b.columns];
          while (columns.length < n) columns.push({ blocks: [] });
          // Keep content of removed columns by merging it into the last remaining column.
          if (columns.length > n) {
            const extra = columns.splice(n).flatMap((c) => c.blocks);
            columns[n - 1] = { blocks: [...columns[n - 1].blocks, ...extra] };
          }
          set({ ratio, columns });
        }}
        options={[
          { value: "1-1", label: "Two equal" }, { value: "1-2", label: "Narrow + wide" }, { value: "2-1", label: "Wide + narrow" },
          { value: "1-1-1", label: "Three equal" }, { value: "1-1-1-1", label: "Four equal" },
        ] as const}
      />
      <p className="text-xs text-zinc-500">Add and edit the blocks inside each column directly in the block list.</p>
    </>
  );
}

const FORMS: { [T in AnyBlock["type"]]: (p: Props<T>) => ReactNode } = {
  hero: Hero, introBand: IntroBand, glance: Glance, stats: Stats, splitCta: SplitCta, partners: Partners, highlights: Highlights,
  testimonials: Testimonials, pageTitle: PageTitle, richText: RichText, heading: Heading, image: ImageB, gallery: Gallery,
  buttons: Buttons, video: Video, spacer: Spacer, divider: () => <p className="text-sm text-zinc-500">A divider has no settings.</p>,
  infoCards: InfoCards, featureSplit: FeatureSplit, tabs: Tabs, pricing: Pricing, organizer: Organizer, speakers: Speakers,
  schedule: Schedule, postList: PostList, form: Form, embed: Embed, contactAside: ContactAside, columns: Columns,
};

export function BlockSettings({ block, onChange, refs }: { block: AnyBlock; onChange: (b: AnyBlock) => void; refs: ReferenceOptions }) {
  const Form = FORMS[block.type] as (p: Props<typeof block.type>) => ReactNode;
  const set = (patch: Partial<AnyBlock>) => onChange({ ...block, ...patch } as AnyBlock);
  return (
    <div className="space-y-5">
      <Section title="Content">
        <Form b={block as never} set={set as never} refs={refs} />
      </Section>
      <Section title="Advanced">
        <BoolField label="Hide this block on the website" value={block.hidden} onChange={(hidden) => set({ hidden })} hint="Hidden blocks are kept (and versioned) but not shown." />
        <TextField
          label="Anchor ID"
          value={block.anchor}
          onChange={(anchor) => set({ anchor: anchor.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
          hint={block.anchor ? `Link to it with #${block.anchor}` : "Optional, for links like #programme"}
          mono
        />
      </Section>
    </div>
  );
}

export { textOf };
