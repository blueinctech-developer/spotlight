import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/admin/ui";
import { MediaLibrary } from "@/components/admin/media-library/media-library";

export const metadata = { title: "Media" };

export default async function MediaPage() {
  const user = await requireUser("media.upload");
  return (
    <>
      <PageHeader title="Media library" description="Images and documents used across the website." />
      <MediaLibrary canManage={can(user.role, "media.manage")} />
    </>
  );
}
