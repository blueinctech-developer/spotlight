import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AuthCard, SetupForm } from "../auth-forms";

export const metadata = { title: "First-time setup" };

export default async function SetupPage() {
  if ((await db.user.count()) > 0) redirect("/admin/login/");
  const tokenMissing =
    !process.env.SETUP_TOKEN && process.env.NODE_ENV === "production" && process.env.ALLOW_SETUP_WITHOUT_TOKEN !== "true";
  if (tokenMissing) {
    return (
      <AuthCard title="Setup is locked" subtitle="No administrator exists yet, but this server has no SETUP_TOKEN.">
        <p className="text-sm text-neutral-600">
          To protect a fresh deployment, set the <code>SETUP_TOKEN</code> environment variable and redeploy, then reload this
          page. Alternatively, create the administrator from a terminal with <code>npm run admin:create</code>.
        </p>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Create the first administrator" subtitle="This page is only available until the first account exists.">
      <SetupForm needsToken={Boolean(process.env.SETUP_TOKEN)} />
    </AuthCard>
  );
}
