import {
  AlignLeft, BarChart3, CalendarClock, Columns3, Contact, FileInput, FormInput, Frame, GalleryHorizontalEnd, Heading, Image as ImageIcon,
  LayoutTemplate, Megaphone, Mic2, MousePointerClick, Newspaper, PanelTop, Quote, Rows3, ScanLine, Shapes, SplitSquareHorizontal,
  Star, Tags, Ticket, Users2, Video, Minus, Space, Building2, type LucideIcon,
} from "lucide-react";
import type { BlockType } from "@/lib/blocks/schema";
import type { AnyBlock } from "./tree";
import { textOf } from "./util";

export type BlockMeta = { label: string; description: string; category: string; icon: LucideIcon; leaf: boolean };

export const CATEGORIES = ["Page sections", "Text & media", "Event", "Layout", "Forms & embeds"] as const;

export const BLOCK_META: Record<BlockType, BlockMeta> = {
  hero: { label: "Hero", description: "Headline, event facts, register button, video popup and shaped photo.", category: "Page sections", icon: PanelTop, leaf: true },
  introBand: { label: "Intro band", description: "Centered green headline with text on a tinted band.", category: "Page sections", icon: AlignLeft, leaf: true },
  glance: { label: "At a glance", description: "Photo collage, video, text and the ticket-style statistics strip.", category: "Page sections", icon: LayoutTemplate, leaf: true },
  splitCta: { label: "Split call to action", description: "Photo beside a dark panel with title, text and button.", category: "Page sections", icon: SplitSquareHorizontal, leaf: true },
  pageTitle: { label: "Page title banner", description: "The page H1, plain with breadcrumb, dark, or over a photo.", category: "Page sections", icon: Heading, leaf: true },
  featureSplit: { label: "Feature with facts", description: "Title, text and “Where / When” facts beside an image collage.", category: "Page sections", icon: Rows3, leaf: true },
  tabs: { label: "Tabs", description: "Tabbed content with an image per tab (e.g. 5 reasons to attend).", category: "Page sections", icon: Tags, leaf: true },
  organizer: { label: "Organizer", description: "Logo and text about the organising body.", category: "Page sections", icon: Building2, leaf: true },
  richText: { label: "Rich text", description: "Formatted text with headings, lists, links and images.", category: "Text & media", icon: AlignLeft, leaf: true },
  heading: { label: "Heading", description: "A section heading with optional subtitle.", category: "Text & media", icon: Heading, leaf: true },
  image: { label: "Image", description: "A single image with optional caption and link.", category: "Text & media", icon: ImageIcon, leaf: true },
  gallery: { label: "Gallery", description: "Image grid or mosaic with lightbox.", category: "Text & media", icon: GalleryHorizontalEnd, leaf: true },
  highlights: { label: "Photo highlights", description: "Photo tiles with overlay titles.", category: "Text & media", icon: Frame, leaf: true },
  video: { label: "Video", description: "Embedded YouTube video.", category: "Text & media", icon: Video, leaf: true },
  buttons: { label: "Buttons", description: "One or more call-to-action buttons.", category: "Text & media", icon: MousePointerClick, leaf: true },
  stats: { label: "Statistics", description: "Animated counters on a green ticket strip.", category: "Event", icon: BarChart3, leaf: true },
  speakers: { label: "Speakers", description: "Grid of speaker profiles.", category: "Event", icon: Mic2, leaf: true },
  schedule: { label: "Event schedule", description: "Programme sessions of an event edition.", category: "Event", icon: CalendarClock, leaf: true },
  partners: { label: "Partners & sponsors", description: "Logo walls grouped by heading.", category: "Event", icon: Users2, leaf: true },
  testimonials: { label: "Testimonials", description: "Carousel of participant quotes.", category: "Event", icon: Quote, leaf: true },
  pricing: { label: "Registration options", description: "Ticket-style cards with features and a button, plus help contacts.", category: "Event", icon: Ticket, leaf: true },
  infoCards: { label: "Info cards", description: "Icon cards for addresses, phone and email.", category: "Event", icon: Contact, leaf: true },
  postList: { label: "Post list", description: "Paginated list of press releases / news.", category: "Event", icon: Newspaper, leaf: true },
  columns: { label: "Columns", description: "Two to four columns, each with its own blocks.", category: "Layout", icon: Columns3, leaf: false },
  spacer: { label: "Spacer", description: "Vertical space.", category: "Layout", icon: Space, leaf: true },
  divider: { label: "Divider", description: "A horizontal line.", category: "Layout", icon: Minus, leaf: true },
  form: { label: "Form", description: "Contact, sponsorship, report download, press or newsletter form.", category: "Forms & embeds", icon: FormInput, leaf: true },
  embed: { label: "Embed", description: "Google Form, YouTube, Flickr or Weezevent embed (allow-listed).", category: "Forms & embeds", icon: ScanLine, leaf: true },
  contactAside: { label: "Contact aside", description: "Short contact text with social links.", category: "Forms & embeds", icon: FileInput, leaf: true },
};

export const FALLBACK_ICON = Shapes;
export const StarIcon = Star;
export const MegaIcon = Megaphone;

/** One-line human summary shown on block cards. */
export function summarize(b: AnyBlock): string {
  switch (b.type) {
    case "hero": return b.title || b.eyebrow;
    case "introBand": return b.title;
    case "glance": return `${b.title} · ${b.stats.length} stats`;
    case "stats": return b.items.map((i) => `${i.value}${i.suffix} ${i.label}`).join(" · ");
    case "splitCta": return b.title;
    case "partners": return `${b.title || "Logos"} · ${b.groups.reduce((n, g) => n + g.partnerIds.length, 0)} logos in ${b.groups.length} group(s)`;
    case "highlights": return `${b.items.length} tiles`;
    case "testimonials": return `${b.title} · ${b.testimonialIds.length ? `${b.testimonialIds.length} selected` : "all visible"}`;
    case "pageTitle": return `${b.title} (${b.variant})`;
    case "richText": return textOf(b.html);
    case "heading": return `${b.level.toUpperCase()} · ${b.text}`;
    case "image": return b.caption || (b.image ? "Image" : "No image selected");
    case "gallery": return `${b.images.length} images · ${b.layout}`;
    case "buttons": return b.items.map((i) => i.label).join(" · ");
    case "video": return b.title || b.url;
    case "spacer": return `Size ${b.size}`;
    case "divider": return "—";
    case "infoCards": return b.items.map((i) => i.title).join(" · ");
    case "featureSplit": return b.title;
    case "tabs": return `${b.title} · ${b.items.length} tabs`;
    case "pricing": return b.items.map((i) => i.title).join(" · ");
    case "organizer": return b.title;
    case "speakers": return `${b.title || "Speakers"} · ${b.speakerIds.length ? `${b.speakerIds.length} selected` : "all"}`;
    case "schedule": return b.title || b.emptyTitle || (b.eventId ? "Event programme" : "No event selected");
    case "postList": return `${b.categorySlug || "All posts"} · ${b.perPage} per page`;
    case "form": return `${b.form}${b.closed ? " (closed)" : ""}`;
    case "embed": return b.url;
    case "contactAside": return b.title;
    case "columns": return `${b.columns.length} columns (${b.ratio})`;
  }
}
