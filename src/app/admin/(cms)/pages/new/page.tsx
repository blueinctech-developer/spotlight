import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/admin/ui";
import { NewPageForm } from "@/components/admin/page-editor/new-page-form";

export const metadata = { title: "New page" };

export default async function NewPage() {
  await requireUser("pages.manage");
  const pages = await db.page.findMany({
    where: { deletedAt: null, NOT: { path: "" } },
    orderBy: { path: "asc" },
    select: { id: true, title: true, path: true, locale: true },
  });
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        back={
          <Link href="/admin/pages/" className="mb-2 inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-800">
            <ArrowLeft className="size-3.5" /> Pages
          </Link>
        }
        title="New page"
        description="Create a draft, then add content blocks in the editor."
      />
      <NewPageForm parents={pages.map((p) => ({ ...p, locale: p.locale as "en" | "fr" }))} />
    </div>
  );
}
