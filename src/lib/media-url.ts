/** Public URL of a stored object. Safe to import from client components. */
export function mediaUrl(storageKey: string): string {
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
  if (base) return `${base.replace(/\/$/, "")}/${storageKey}`;
  return `/media/${storageKey}`;
}

export type MediaRef = {
  id: string;
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  mimeType: string;
};
