export const locales = ["en", "fr"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export function isLocale(v: string | undefined | null): v is Locale {
  return v === "en" || v === "fr";
}

/** "/about/" in a locale → "/fr/about/". Paths are stored without locale prefix. */
export function localizePath(path: string, locale: Locale): string {
  const clean = "/" + path.replace(/^\/+|\/+$/g, "");
  const withSlash = clean === "/" ? "/" : `${clean}/`;
  if (locale === "en") return withSlash;
  return withSlash === "/" ? "/fr/" : `/fr${withSlash}`;
}

/** Localize an internal href from content (keeps external links and anchors unchanged). */
export function localizeHref(href: string, locale: Locale): string {
  if (!href || locale === "en") return href;
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  if (href === "/fr" || href.startsWith("/fr/")) return href;
  if (/^\/(media|admin|api)\//.test(href) || /\.[a-z0-9]{2,5}$/i.test(href.split("?")[0])) return href;
  const [p, rest] = href.split(/(?=[?#])/);
  return localizePath(p, locale) + (rest ?? "");
}

export function formatDate(date: Date | string, locale: Locale, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Europe/Paris",
    ...opts,
  }).format(d);
}

const dict = {
  home: { en: "Home", fr: "Maison" },
  readMore: { en: "Read more", fr: "Lire la suite" },
  previousPost: { en: "previous post", fr: "article précédent" },
  nextPost: { en: "next post", fr: "article suivant" },
  relatedPosts: { en: "Related Post", fr: "Article similaire" },
  latestPosts: { en: "Latest Post", fr: "Dernier article" },
  categories: { en: "Categories", fr: "Catégories" },
  tags: { en: "Tag", fr: "Étiqueter" },
  search: { en: "Search", fr: "Recherche" },
  searchPlaceholder: { en: "Search...", fr: "Recherche..." },
  connect: { en: "Connect with us", fr: "Connectez-vous avec nous" },
  share: { en: "Share", fr: "Partager" },
  shareVia: { en: "Share via:", fr: "Partager via :" },
  minsRead: { en: "mins read", fr: "minutes de lecture" },
  sessionsBy: { en: "Sessions by", fr: "Séances par" },
  otherSpeakers: { en: "Other Speakers", fr: "Autres intervenants" },
  speakersArchive: { en: "Speakers Archive", fr: "Archives des intervenants" },
  day: { en: "Day", fr: "Jour" },
  moderator: { en: "Moderator", fr: "Modérateur" },
  noPosts: { en: "Nothing found.", fr: "Rien n'a été trouvé." },
  pageNotFound: { en: "Page not found", fr: "Page introuvable" },
  notFoundText: {
    en: "The page you are looking for does not exist or has been moved.",
    fr: "La page que vous recherchez n'existe pas ou a été déplacée.",
  },
  backHome: { en: "Back to home", fr: "Retour à l'accueil" },
  watchVideo: { en: "Play video", fr: "Lire la vidéo" },
  close: { en: "Close", fr: "Fermer" },
  menu: { en: "Menu", fr: "Menu" },
  language: { en: "Language", fr: "Langue" },
  sending: { en: "Sending…", fr: "Envoi…" },
  formError: {
    en: "Your submission could not be sent. Please check the form and try again.",
    fr: "Votre envoi n'a pas pu aboutir. Veuillez vérifier le formulaire et réessayer.",
  },
  formRateLimited: {
    en: "Too many submissions. Please wait a few minutes and try again.",
    fr: "Trop d'envois. Veuillez patienter quelques minutes puis réessayer.",
  },
  downloadReport: { en: "Download the report", fr: "Télécharger le rapport" },
  formClosed: { en: "This form is closed.", fr: "Ce formulaire est fermé." },
  cookieAccept: { en: "Accept", fr: "Accepter" },
  cookieDecline: { en: "Decline", fr: "Refuser" },
  privacyPolicy: { en: "Privacy policy", fr: "Politique de confidentialité" },
  page: { en: "Page", fr: "Page" },
  previous: { en: "Previous", fr: "Précédent" },
  next: { en: "Next", fr: "Suivant" },
  archive: { en: "Archive", fr: "Archives" },
  postsBy: { en: "Posts by", fr: "Articles de" },
  untranslated: {
    en: "",
    fr: "Ce contenu n'est pas encore disponible en français.",
  },
  skipToContent: { en: "Skip to content", fr: "Aller au contenu" },
  backToTop: { en: "Back to top", fr: "Retour en haut" },
} as const;

export type DictKey = keyof typeof dict;
export function t(key: DictKey, locale: Locale): string {
  return dict[key][locale] || dict[key].en;
}
