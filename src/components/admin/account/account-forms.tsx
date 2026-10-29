"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { LogOut, Monitor } from "lucide-react";
import { changePassword, signOutOtherSessions, updateProfile } from "@/app/admin/actions/account";
import { Badge, Button, Card, CardHeader, Field, Input } from "@/components/admin/ui";

type SessionRow = { key: string; current: boolean; createdAt: string; ip: string | null; userAgent: string | null };

function describeAgent(ua: string | null): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

export function AccountForms({ name: initialName, sessions }: { name: string; sessions: SessionRow[] }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [pw, setPw] = useState({ current: "", password: "", confirm: "" });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [savingName, startName] = useTransition();
  const [savingPw, startPw] = useTransition();
  const [revoking, startRevoke] = useTransition();
  const others = sessions.filter((s) => !s.current).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Profile" />
        <form
          className="flex flex-wrap items-end gap-3 px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            startName(async () => {
              const res = await updateProfile({ name });
              if (!res.ok) return void toast.error(res.fieldErrors?.name ?? res.error);
              toast.success("Name updated");
              router.refresh();
            });
          }}
        >
          <Field label="Display name" className="min-w-[240px] flex-1">{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}</Field>
          <Button type="submit" variant="primary" loading={savingName} disabled={name.trim() === initialName}>Save</Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Change password" description="Other devices will be signed out after the change." />
        <form
          className="grid gap-4 px-5 py-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            startPw(async () => {
              const res = await changePassword(pw);
              if (!res.ok) {
                setPwErrors(res.fieldErrors ?? {});
                return void toast.error(res.error);
              }
              setPwErrors({});
              setPw({ current: "", password: "", confirm: "" });
              toast.success("Password changed. Other sessions were signed out.");
              router.refresh();
            });
          }}
        >
          <Field label="Current password" className="sm:col-span-2" error={pwErrors.current}>
            {(p) => <Input {...p} type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />}
          </Field>
          <Field label="New password" hint="At least 12 characters, mixing letters with numbers or symbols." error={pwErrors.password}>
            {(p) => <Input {...p} type="password" autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} required />}
          </Field>
          <Field label="Confirm new password" error={pwErrors.confirm}>
            {(p) => <Input {...p} type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required />}
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" variant="primary" loading={savingPw}>Change password</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Active sessions"
          description="Devices currently signed in to your account."
          action={
            others > 0 ? (
              <Button
                size="sm"
                loading={revoking}
                onClick={() =>
                  startRevoke(async () => {
                    const res = await signOutOtherSessions({});
                    if (!res.ok) return void toast.error(res.error);
                    toast.success("Other sessions signed out");
                    router.refresh();
                  })
                }
              >
                <LogOut /> Sign out {others} other{others === 1 ? "" : "s"}
              </Button>
            ) : undefined
          }
        />
        <ul className="divide-y divide-zinc-100">
          {sessions.map((s) => (
            <li key={s.key} className="flex items-center gap-3 px-5 py-3 text-sm">
              <Monitor className="size-4 shrink-0 text-zinc-500" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-medium text-zinc-800">
                  {describeAgent(s.userAgent)} {s.current && <Badge tone="green">This device</Badge>}
                </span>
                <span className="block text-xs text-zinc-500">
                  Signed in {new Date(s.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  {s.ip ? ` · IP ${s.ip}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
