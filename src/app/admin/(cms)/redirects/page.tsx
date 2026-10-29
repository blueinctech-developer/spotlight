import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { RedirectsManager } from "./redirects-manager";

export const metadata = { title: "Redirects" };

export default async function RedirectsPage() {
  await requireUser("redirects.manage");
  const rows = await db.redirect.findMany({ orderBy: { fromPath: "asc" } });
  return (
    <>
      <PageHeader title="Redirects" description="Send visitors and search engines from old addresses to the right page." />
      <RedirectsManager
        initial={rows.map((r) => ({ id: r.id, fromPath: r.fromPath, toPath: r.toPath, statusCode: r.statusCode, hits: r.hits, note: r.note, updatedAt: r.updatedAt.toISOString() }))}
      />
    </>
  );
}
