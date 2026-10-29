import { AuthCard, RequestResetForm, ResetForm } from "../auth-forms";

export const metadata = { title: "Reset password" };

export default async function ResetPasswordPage(props: PageProps<"/admin/reset-password">) {
  const { token } = await props.searchParams;
  if (typeof token === "string" && token) {
    return (
      <AuthCard title="Choose a new password">
        <ResetForm token={token} />
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Reset your password" subtitle="We'll email you a link to choose a new password.">
      <RequestResetForm />
    </AuthCard>
  );
}
