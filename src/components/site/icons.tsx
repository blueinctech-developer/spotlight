import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...p,
});

export const IconLocation = (p: P) => (
  <svg {...base(p)}><path d="M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
);
export const IconCalendar = (p: P) => (
  <svg {...base(p)}><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
);
export const IconQuote = (p: P) => (
  <svg {...base({ ...p, fill: "currentColor", stroke: "none" })}><path d="M3 18v-5.3C3 8.2 5.3 5.6 9.4 5l.6 2.1c-2.2.6-3.3 2-3.4 4H10V18H3Zm11 0v-5.3c0-4.5 2.3-7.1 6.4-7.7l.6 2.1c-2.2.6-3.3 2-3.4 4H21V18h-7Z" /></svg>
);
export const IconPhone = (p: P) => (
  <svg {...base(p)}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>
);
export const IconEmail = (p: P) => (
  <svg {...base(p)}><path d="M3 9.5 12 4l9 5.5V19a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19V9.5Z" /><path d="m3 9.5 9 6 9-6" /></svg>
);
export const IconClock = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const IconUser = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
);
export const IconTicket = (p: P) => (
  <svg {...base(p)}><path d="M3 7.5V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v1.5a2.5 2.5 0 0 0 0 5V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5.5a2.5 2.5 0 0 0 0-5Z" /><path d="M9 5v14" strokeDasharray="2 2" /></svg>
);
export const IconCheck = (p: P) => <svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
export const IconInfo = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
);
export const IconGlobe = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" /></svg>
);
export const IconPlay = (p: P) => (
  <svg {...base({ ...p, fill: "currentColor", stroke: "none" })}><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5Z" /></svg>
);
export const IconChevronDown = (p: P) => <svg {...base(p)}><path d="m6 9 6 6 6-6" /></svg>;
export const IconChevronLeft = (p: P) => <svg {...base(p)}><path d="m15 6-6 6 6 6" /></svg>;
export const IconChevronRight = (p: P) => <svg {...base(p)}><path d="m9 6 6 6-6 6" /></svg>;
export const IconMenu = (p: P) => <svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
export const IconClose = (p: P) => <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const IconSearch = (p: P) => <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
export const IconArrowLeft = (p: P) => <svg {...base(p)}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>;
export const IconArrowRight = (p: P) => <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const IconDownload = (p: P) => <svg {...base(p)}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>;

const brand = (p: P) => ({ width: 16, height: 16, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true, ...p });
export const IconFacebook = (p: P) => (
  <svg {...brand(p)}><path d="M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.3A22 22 0 0 0 14.7 2C12.4 2 11 3.4 11 6v2.5H8.5V12H11v10h3V12h2.6l.4-3.5h-3Z" /></svg>
);
export const IconX = (p: P) => (
  <svg {...brand(p)}><path d="M17.8 3h3.1l-6.8 7.8 8 10.2h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.4L1.8 3h6.4l4.4 5.9L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" /></svg>
);
export const IconLinkedin = (p: P) => (
  <svg {...brand(p)}><path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1-.02-5ZM3 9.75h4V21H3V9.75Zm7 0h3.8v1.6h.06c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.6 4.77 6V21h-4v-5.1c0-1.22-.02-2.8-1.7-2.8-1.72 0-1.98 1.33-1.98 2.7V21h-4V9.75Z" /></svg>
);
export const IconInstagram = (p: P) => (
  <svg {...brand({ ...p, fill: "none", stroke: "currentColor", strokeWidth: 2 })}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></svg>
);
export const IconYoutube = (p: P) => (
  <svg {...brand(p)}><path d="M22 7.6a3 3 0 0 0-2.1-2.1C18 5 12 5 12 5s-6 0-7.9.5A3 3 0 0 0 2 7.6 31 31 0 0 0 1.5 12 31 31 0 0 0 2 16.4a3 3 0 0 0 2.1 2.1C6 19 12 19 12 19s6 0 7.9-.5a3 3 0 0 0 2.1-2.1c.4-1.4.5-2.9.5-4.4s-.1-3-.5-4.4ZM10 15V9l5.2 3L10 15Z" /></svg>
);
export const IconFlickr = (p: P) => (
  <svg {...brand(p)}><circle cx="6.5" cy="12" r="4" /><circle cx="17.5" cy="12" r="4" /></svg>
);

export const factIcons = {
  location: IconLocation, calendar: IconCalendar, quote: IconQuote, phone: IconPhone, email: IconEmail,
  clock: IconClock, user: IconUser, ticket: IconTicket, check: IconCheck, info: IconInfo, globe: IconGlobe,
} as const;
