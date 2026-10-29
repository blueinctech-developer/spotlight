import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/admin/ui";
import { UsersManager } from "@/components/admin/users/users-manager";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requireUser("users.manage");
  const users = await db.user.findMany({
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true, createdAt: true, _count: { select: { posts: true, pages: true } } },
  });
  return (
    <div>
      <PageHeader title="Users" description="People who can sign in to the CMS, and what they are allowed to do." />
      <UsersManager
        meId={me.id}
        users={users.map((u) => ({
          ...u,
          lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
          createdAt: u.createdAt.toISOString(),
          contentCount: u._count.posts + u._count.pages,
        }))}
      />
    </div>
  );
}
