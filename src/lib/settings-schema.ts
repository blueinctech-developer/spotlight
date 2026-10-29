import { z } from "zod";

/** Text shown publicly in both languages. French falls back to English when empty. */
export const i18nText = (max = 500) =>
  z.object({ en: z.string().max(max).default(""), fr: z.string().max(max).default("") }).default({ en: "", fr: "" });
export type I18nText = { en: string; fr: string };

/** Absolute web address only (z.string().url() alone also accepts "javascript:" URLs). */
const url = z.union([z.literal(""), z.string().max(500).regex(/^https?:\/\/\S+$/i, "Use a full https:// address.")]).default("");
/** Link target: a site path, an anchor, or an http(s)/mailto/tel address. */
const href = (fallback: string) =>
  z
    .string()
    .max(500)
    .regex(/^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i, "Use a path such as /registration/ or a full https:// address.")
    .default(fallback);

export const settingsSchemas = {
  general: z.object({
    siteName: z.string().max(120).default("Spotlight Nigeria"),
    tagline: i18nText(200),
    logoId: z.string().nullable().default(null),
    faviconId: z.string().nullable().default(null),
    copyright: i18nText(300),
    creditPrefix: i18nText(60),
    creditLabel: z.string().max(120).default(""),
    creditUrl: url,
    bottomNote: i18nText(300),
    defaultLocale: z.enum(["en", "fr"]).default("en"),
  }),
  header: z.object({
    ctaLabel: i18nText(60),
    ctaHref: href("/registration/"),
    /** Button on the dark header variant (registration pages). */
    darkCtaLabel: i18nText(60),
    darkCtaHref: href("/sponsorship-registration/"),
  }),
  footerCta: z.object({
    enabled: z.boolean().default(true),
    eyebrow: i18nText(120),
    title: i18nText(200),
    buttonLabel: i18nText(60),
    buttonHref: href("/registration/"),
  }),
  /** Footer used on pages with footerVariant = "seat" (About page). */
  footerSeat: z.object({
    title: i18nText(200),
    buttonLabel: i18nText(60),
    buttonHref: href("/registration/"),
    newsletterEyebrow: i18nText(120),
    newsletterTitle: i18nText(200),
  }),
  contact: z.object({
    email: z.string().max(200).default(""),
    phones: z.array(z.string().max(40)).max(5).default([]),
    addresses: z.array(z.object({ label: i18nText(80), text: i18nText(300) })).max(5).default([]),
    hours: i18nText(200),
  }),
  social: z.object({
    facebook: url,
    twitter: url,
    linkedin: url,
    instagram: url,
    youtube: url,
    flickr: url,
  }),
  seo: z.object({
    titleTemplate: z.string().max(120).default("%s - Spotlight Nigeria"),
    defaultDescription: i18nText(300),
    ogImageId: z.string().nullable().default(null),
    /** Emergency switch: tell search engines not to index the whole site (e.g. on staging). */
    discourageIndexing: z.boolean().default(false),
    /** Content of the google-site-verification meta tag (keeps Search Console ownership after cutover). */
    googleSiteVerification: z.string().max(100).regex(/^[\w-]*$/, "Paste only the code, without the HTML tag.").default(""),
    /** Content of the msvalidate.01 meta tag (Bing Webmaster Tools). */
    bingSiteVerification: z.string().max(100).regex(/^[\w-]*$/, "Paste only the code, without the HTML tag.").default(""),
  }),
  analytics: z.object({
    /** GA4 measurement ID (G-…) or Google tag ID (GT-…, as used by Site Kit on the old site). */
    gaMeasurementId: z.union([z.literal(""), z.string().regex(/^(G|GT)-[A-Z0-9]{4,12}$/)]).default(""),
  }),
  privacy: z.object({
    cookieBanner: z.boolean().default(true),
    message: i18nText(400),
    privacyHref: href("/privacy-policy/"),
  }),
  notifications: z.object({
    /** Where form notifications are emailed, per form. Empty = NOTIFY_EMAIL env var. */
    contact: z.string().max(300).default(""),
    sponsorship: z.string().max(300).default(""),
    "report-download": z.string().max(300).default(""),
    press: z.string().max(300).default(""),
    newsletter: z.string().max(300).default(""),
  }),
} as const;

export type SettingsKey = keyof typeof settingsSchemas;
export type Settings<K extends SettingsKey> = z.infer<(typeof settingsSchemas)[K]>;
export type AllSettings = { [K in SettingsKey]: Settings<K> };

export function tr(value: I18nText | undefined, locale: "en" | "fr"): string {
  if (!value) return "";
  return (locale === "fr" ? value.fr || value.en : value.en) ?? "";
}
