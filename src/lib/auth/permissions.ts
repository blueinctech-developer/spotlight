import type { Role } from "@/generated/prisma/enums";

/**
 * Capability model, modelled on WordPress roles:
 * - ADMIN: everything, including users, settings, redirects and integrations.
 * - EDITOR: create/edit/publish any content, manage media, menus, events and submissions.
 * - AUTHOR: create and edit their own posts and submit them for review; upload media.
 */
export type Capability =
  | "content.edit_own"
  | "content.edit_any"
  | "content.publish"
  | "content.delete"
  | "pages.manage"
  | "media.upload"
  | "media.manage"
  | "menus.manage"
  | "events.manage"
  | "submissions.view"
  | "settings.manage"
  | "users.manage"
  | "redirects.manage"
  | "audit.view";

const CAPS: Record<Role, ReadonlySet<Capability>> = {
  ADMIN: new Set<Capability>([
    "content.edit_own", "content.edit_any", "content.publish", "content.delete", "pages.manage",
    "media.upload", "media.manage", "menus.manage", "events.manage", "submissions.view",
    "settings.manage", "users.manage", "redirects.manage", "audit.view",
  ]),
  EDITOR: new Set<Capability>([
    "content.edit_own", "content.edit_any", "content.publish", "content.delete", "pages.manage",
    "media.upload", "media.manage", "menus.manage", "events.manage", "submissions.view",
  ]),
  AUTHOR: new Set<Capability>(["content.edit_own", "media.upload"]),
};

export function can(role: Role, cap: Capability): boolean {
  return CAPS[role].has(cap);
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  EDITOR: "Editor",
  AUTHOR: "Author",
};

/** Can this user edit this post? Authors only their own, and not once published. */
export function canEditPost(
  user: { id: string; role: Role },
  post: { authorId: string | null; status: string },
): boolean {
  if (can(user.role, "content.edit_any")) return true;
  return post.authorId === user.id && post.status !== "PUBLISHED";
}
