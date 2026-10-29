import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { AdminShell, type NavSection } from "@/components/admin/shell";

export default async function CmsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const newSubmissions = can(user.role, "submissions.view") ? await db.formSubmission.count({ where: { status: "NEW" } }) : 0;
  const pendingReview = can(user.role, "content.publish") ? await db.post.count({ where: { status: "PENDING_REVIEW", deletedAt: null } }) : 0;

  const sections: NavSection[] = [
    { items: [{ href: "/admin/", label: "Dashboard", icon: "dashboard" }] },
    {
      title: "Content",
      items: [
        can(user.role, "pages.manage") && { href: "/admin/pages/", label: "Pages", icon: "pages" },
        { href: "/admin/posts/", label: "Posts", icon: "posts", badge: pendingReview || undefined },
        can(user.role, "media.upload") && { href: "/admin/media/", label: "Media", icon: "media" },
        can(user.role, "menus.manage") && { href: "/admin/navigation/", label: "Navigation", icon: "navigation" },
      ],
    },
    {
      title: "Event",
      items: [
        can(user.role, "events.manage") && { href: "/admin/events/", label: "Events", icon: "events" },
        can(user.role, "events.manage") && { href: "/admin/speakers/", label: "Speakers", icon: "speakers" },
        can(user.role, "events.manage") && { href: "/admin/partners/", label: "Partners", icon: "partners" },
        can(user.role, "events.manage") && { href: "/admin/testimonials/", label: "Testimonials", icon: "testimonials" },
        can(user.role, "submissions.view") && { href: "/admin/submissions/", label: "Submissions", icon: "submissions", badge: newSubmissions || undefined },
      ],
    },
    {
      title: "Site",
      items: [
        can(user.role, "settings.manage") && { href: "/admin/settings/", label: "Settings", icon: "settings" },
        can(user.role, "redirects.manage") && { href: "/admin/redirects/", label: "Redirects", icon: "redirects" },
        can(user.role, "users.manage") && { href: "/admin/users/", label: "Users", icon: "users" },
        can(user.role, "audit.view") && { href: "/admin/activity/", label: "Activity log", icon: "activity" },
      ],
    },
  ].map((s) => ({ ...s, items: s.items.filter(Boolean) })) as NavSection[];

  return (
    <AdminShell user={user} sections={sections.filter((s) => s.items.length)}>
      {children}
    </AdminShell>
  );
}
