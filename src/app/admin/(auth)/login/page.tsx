import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthCard, LoginForm } from "../auth-forms";

export const metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/admin/login">) {
  if (await getCurrentUser()) redirect("/admin/");
  if ((await db.user.count()) === 0) redirect("/admin/setup/");
  const sp = await props.searchParams;
  return (
    <AuthCard title="Sign in to Spotlight CMS" subtitle="Manage the Spotlight Nigeria website.">
      <LoginForm next={typeof sp.next === "string" ? sp.next : undefined} notice={sp.reset ? "Your password has been changed. Please sign in." : undefined} />
    </AuthCard>
  );
}
