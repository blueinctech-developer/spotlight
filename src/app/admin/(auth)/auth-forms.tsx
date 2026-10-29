"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { Button, Field, Input } from "@/components/admin/ui";
import { login, requestPasswordReset, resetPassword, setupFirstAdmin, type FormState } from "@/app/admin/actions/auth";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex justify-center">
          <Image src="/brand/logo.png" alt="Spotlight Nigeria" width={158} height={44} priority />
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
          <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}

function Alert({ state }: { state: FormState }) {
  if (state?.error) return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  if (state?.message) return <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.message}</p>;
  return null;
}

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="space-y-4">
      {notice && !state && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
      <Alert state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email">{(p) => <Input {...p} name="email" type="email" autoComplete="username" required autoFocus />}</Field>
      <Field label="Password">{(p) => <Input {...p} name="password" type="password" autoComplete="current-password" required />}</Field>
      <Button type="submit" variant="primary" className="w-full" loading={pending}>Sign in</Button>
      <p className="text-center text-sm">
        <Link href="/admin/reset-password/" className="text-zinc-500 hover:text-zinc-800">Forgot your password?</Link>
      </p>
    </form>
  );
}

export function SetupForm({ needsToken }: { needsToken: boolean }) {
  const [state, action, pending] = useActionState(setupFirstAdmin, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <Alert state={state} />
      {needsToken && (
        <Field label="Setup token" hint="The SETUP_TOKEN value from the server configuration." error={fe.setupToken}>
          {(p) => <Input {...p} name="setupToken" required autoComplete="off" />}
        </Field>
      )}
      <Field label="Your name" error={fe.name}>{(p) => <Input {...p} name="name" required autoComplete="name" />}</Field>
      <Field label="Email" error={fe.email}>{(p) => <Input {...p} name="email" type="email" required autoComplete="email" />}</Field>
      <Field label="Password" hint="At least 12 characters, mixing letters with numbers or symbols." error={fe.password}>
        {(p) => <Input {...p} name="password" type="password" required autoComplete="new-password" />}
      </Field>
      <Field label="Confirm password" error={fe.confirm}>{(p) => <Input {...p} name="confirm" type="password" required autoComplete="new-password" />}</Field>
      <Button type="submit" variant="primary" className="w-full" loading={pending}>Create administrator</Button>
    </form>
  );
}

export function RequestResetForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  return (
    <form action={action} className="space-y-4">
      <Alert state={state} />
      <Field label="Email">{(p) => <Input {...p} name="email" type="email" required autoComplete="email" />}</Field>
      <Button type="submit" variant="primary" className="w-full" loading={pending}>Send reset link</Button>
      <p className="text-center text-sm"><Link href="/admin/login/" className="text-zinc-500 hover:text-zinc-800">Back to sign in</Link></p>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, null);
  return (
    <form action={action} className="space-y-4">
      <Alert state={state} />
      <input type="hidden" name="token" value={token} />
      <Field label="New password" hint="At least 12 characters, mixing letters with numbers or symbols.">
        {(p) => <Input {...p} name="password" type="password" required autoComplete="new-password" />}
      </Field>
      <Field label="Confirm new password">{(p) => <Input {...p} name="confirm" type="password" required autoComplete="new-password" />}</Field>
      <Button type="submit" variant="primary" className="w-full" loading={pending}>Set new password</Button>
    </form>
  );
}
