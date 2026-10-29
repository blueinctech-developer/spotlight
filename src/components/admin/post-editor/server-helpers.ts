/**
 * Server-safe copies of helpers from components/admin/ui.tsx. That module is "use client",
 * so its functions cannot be called while rendering Server Components.
 * TODO(shared): move these into a non-client module (e.g. components/admin/ui-shared.ts) and re-export from ui.tsx.
 */
import { cva } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const linkButton = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand-700 text-white shadow-sm hover:bg-brand-800",
        secondary: "border border-zinc-200 bg-white text-zinc-800 shadow-sm hover:bg-zinc-50",
        ghost: "text-zinc-700 hover:bg-zinc-100",
      },
      size: { sm: "h-8 px-3 text-[13px]", md: "h-9 px-4" },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "In review",
  PUBLISHED: "Published",
  SCHEDULED: "Scheduled",
  ARCHIVED: "Archived",
  TRASH: "Trash",
};

export function effectiveStatus(row: { status: string; publishedAt: Date | string | null; deletedAt?: Date | string | null }): string {
  if (row.deletedAt) return "TRASH";
  if (row.status === "PUBLISHED" && row.publishedAt && new Date(row.publishedAt).getTime() > Date.now()) return "SCHEDULED";
  return row.status;
}
