import Image from "next/image";
import type { MediaRef } from "@/lib/media-url";

/** next/image wrapper that copes with assets whose dimensions are unknown (e.g. SVG logos). */
export function MediaImage({
  media,
  className,
  sizes = "100vw",
  priority,
  fill,
  alt,
  quality = 90,
}: {
  media: MediaRef | null | undefined;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  alt?: string;
  /** Encoding quality for optimised images (allowed: 75, 90). */
  quality?: 75 | 90;
}) {
  if (!media) return null;
  const altText = alt ?? media.alt ?? "";
  const unoptimized = media.mimeType === "image/svg+xml";
  if (fill || !media.width || !media.height) {
    return (
      <Image
        src={media.url}
        alt={altText}
        fill
        sizes={sizes}
        className={className ?? "object-cover"}
        priority={priority}
        quality={quality}
        unoptimized={unoptimized}
      />
    );
  }
  return (
    <Image
      src={media.url}
      alt={altText}
      width={media.width}
      height={media.height}
      sizes={sizes}
      className={className}
      priority={priority}
      quality={quality}
      unoptimized={unoptimized}
    />
  );
}
