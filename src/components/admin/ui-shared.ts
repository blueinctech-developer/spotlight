/**
 * Styling helpers shared by server and client components.
 * (ui.tsx is a client module, so server pages must import these from here.)
 */
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand-700 text-white shadow-sm hover:bg-brand-800",
        secondary: "border border-zinc-200 bg-white text-zinc-800 shadow-sm hover:bg-zinc-50",
        ghost: "text-zinc-700 hover:bg-zinc-100",
        danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
        "danger-ghost": "text-red-600 hover:bg-red-50",
        link: "px-0 text-brand-700 underline-offset-4 hover:underline",
      },
      size: { sm: "h-8 px-3 text-[13px]", md: "h-9 px-4", lg: "h-10 px-5", icon: "size-9", "icon-sm": "size-8" },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export const badgeVariants = cva("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", {
  variants: {
    tone: {
      neutral: "bg-zinc-100 text-zinc-600",
      green: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15",
      amber: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
      blue: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/15",
      red: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15",
      violet: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/15",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export type BadgeTone = VariantProps<typeof badgeVariants>["tone"];

export const STATUS_TONES: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  PENDING_REVIEW: "amber",
  PUBLISHED: "green",
  SCHEDULED: "blue",
  ARCHIVED: "violet",
  TRASH: "red",
};
export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "In review",
  PUBLISHED: "Published",
  SCHEDULED: "Scheduled",
  ARCHIVED: "Archived",
  TRASH: "Trash",
};

/** Effective status, taking scheduling and trash into account. */
export function effectiveStatus(row: { status: string; publishedAt: Date | string | null; deletedAt?: Date | string | null }): string {
  if (row.deletedAt) return "TRASH";
  if (row.status === "PUBLISHED" && row.publishedAt && new Date(row.publishedAt).getTime() > Date.now()) return "SCHEDULED";
  return row.status;
}
