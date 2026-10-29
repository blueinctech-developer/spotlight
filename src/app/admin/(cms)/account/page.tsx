import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { requireUser, SESSION_COOKIE, hashToken } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/admin/ui";
import { AccountForms } from "@/components/admin/account/account-forms";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const me = await requireUser();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const currentId = token ? hashToken(token) : null;
  const sessions = await db.session.findMany({
    where: { userId: me.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, expiresAt: true, ip: true, userAgent: true },
  });
  return (
    <div className="max-w-3xl">
      <PageHeader title="Your account" description={`${me.email} · ${ROLE_LABELS[me.role]}`} />
      <AccountForms
        name={me.name}
        sessions={sessions.map((s) => ({
          // Never send session ids (token hashes) to the browser; only a display key.
          key: s.id.slice(0, 8),
          current: s.id === currentId,
          createdAt: s.createdAt.toISOString(),
          ip: s.ip,
          userAgent: s.userAgent,
        }))}
      />
    </div>
  );
}
