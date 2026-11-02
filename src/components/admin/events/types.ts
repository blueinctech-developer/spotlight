export type SpeakerOption = { id: string; name: string; jobTitle: string | null; organization: string | null; photoUrl: string | null };
export type PartnerOption = { id: string; name: string; tier: string; logoUrl: string | null };

export type SessionKind = "session" | "plenary" | "panel" | "break" | "networking";
export type SessionRole = "SPEAKER" | "MODERATOR" | "PANELIST" | "KEYNOTE";

export type SessionDraft = {
  /** Client key (stable across edits); `dbId` is the persisted id, if any. */
  key: string;
  dbId?: string;
  day: number;
  startTime: string;
  endTime: string;
  title: string;
  titleFr: string;
  theme: string;
  themeFr: string;
  description: string;
  descriptionFr: string;
  location: string;
  kind: SessionKind;
  /** `label` (optional) replaces the role name on the public card; the role still sets its colour. */
  speakers: { speaker: SpeakerOption; role: SessionRole; label: string; labelFr: string }[];
};

export type EventDetails = {
  id: string;
  title: string;
  titleFr: string;
  slug: string;
  edition: number | null;
  year: number;
  timezone: string;
  startsAtLocal: string;
  endsAtLocal: string;
  venueName: string;
  venueAddress: string;
  theme: string;
  themeFr: string;
  description: string;
  descriptionFr: string;
  registrationUrl: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isCurrent: boolean;
  bannerId: string | null;
  galleryIds: string[];
};

export type EventPartnerDraft = { key: string; partner: PartnerOption; tier: string };

export const TIER_LABELS: Record<string, string> = {
  CO_ORGANIZER: "Co-organizer",
  SUPPORTER: "Supporter",
  SPONSOR: "Sponsor",
  PARTNER: "Partner",
  MEDIA_PARTNER: "Media partner",
};

export const KIND_LABELS: Record<SessionKind, string> = {
  session: "Session",
  plenary: "Plenary",
  panel: "Panel",
  break: "Break / meal",
  networking: "Networking",
};

export const ROLE_LABELS: Record<SessionRole, string> = {
  SPEAKER: "Speaker",
  MODERATOR: "Moderator",
  PANELIST: "Panelist",
  KEYNOTE: "Keynote",
};
