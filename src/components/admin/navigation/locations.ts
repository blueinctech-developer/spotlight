export const MENU_LOCATIONS = ["header", "footer-1", "footer-2", "footer-3", "footer-legal"] as const;
export type MenuLocation = (typeof MENU_LOCATIONS)[number];

export const LOCATION_INFO: Record<MenuLocation, { label: string; hint: string }> = {
  header: { label: "Header menu", hint: "Main navigation. Items with children show as dropdowns." },
  "footer-1": { label: "Footer column 1", hint: "The menu name is shown as the column heading." },
  "footer-2": { label: "Footer column 2", hint: "The menu name is shown as the column heading." },
  "footer-3": { label: "Footer column 3", hint: "The menu name is shown as the column heading." },
  "footer-legal": { label: "Footer legal links", hint: "Small links in the bottom bar (privacy, terms, sitemap)." },
};
