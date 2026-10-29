import { requireUser } from "@/lib/auth/session";
import { getAllSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { emailConfigured } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm, type EnvStatus } from "@/components/admin/settings/settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireUser("settings.manage");
  const settings = await getAllSettings();
  let dbOk = true;
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    dbOk = false;
  }
  const driver = process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";
  const env: EnvStatus = {
    database: dbOk,
    storageDriver: driver,
    storageWarning: driver === "local" && process.env.NODE_ENV === "production",
    mediaBaseUrl: process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? null,
    email: emailConfigured(),
    notifyFallback: Boolean(process.env.NOTIFY_EMAIL),
    siteUrl: siteUrl(),
    production: process.env.NODE_ENV === "production",
  };
  return (
    <>
      <PageHeader title="Settings" description="Site-wide content, contact details, SEO and integrations." />
      <SettingsForm initial={settings} env={env} />
    </>
  );
}
