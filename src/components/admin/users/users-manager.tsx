"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, MoreHorizontal, Pencil, Power, Trash2, UserPlus, Wand2 } from "lucide-react";
import { createUser, deleteUser, resetUserPassword, setUserActive, updateUser } from "@/app/admin/actions/users";
import {
  Badge, Button, Card, ConfirmDialog, Dialog, DropdownContent, DropdownItem, DropdownMenu, DropdownSeparator, DropdownTrigger,
  Field, Input, Select, Table, Td, Th,
} from "@/components/admin/ui";

type Role = "ADMIN" | "EDITOR" | "AUTHOR";
export type UserRow = {
  id: string; name: string; email: string; role: Role; active: boolean; lastLoginAt: string | null; createdAt: string; contentCount: number;
};

const ROLES: { value: Role; label: string; help: string }[] = [
  { value: "ADMIN", label: "Administrator", help: "Everything, including users, settings and redirects." },
  { value: "EDITOR", label: "Editor", help: "Create, edit and publish all content; manage media, menus, events and submissions." },
  { value: "AUTHOR", label: "Author", help: "Write their own posts and submit them for review; upload media." },
];
const roleTone = { ADMIN: "violet", EDITOR: "blue", AUTHOR: "neutral" } as const;

/** Strong random password using the Web Crypto API (no ambiguous characters). */
function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_!";
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let out = Array.from(bytes, (b) => chars[b % chars.length]).join("");
  if (!/\d/.test(out)) out = out.slice(0, -1) + "7";
  return out;
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Never");

export function UsersManager({ users, meId }: { users: UserRow[]; meId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<UserRow | "new" | null>(null);
  const [resetting, setResetting] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [shownPassword, setShownPassword] = useState<{ email: string; password: string } | null>(null);

  const toggleActive = (u: UserRow) =>
    start(async () => {
      const res = await setUserActive({ id: u.id, active: !u.active });
      if (!res.ok) return void toast.error(res.error);
      toast.success(u.active ? `${u.name} deactivated and signed out` : `${u.name} reactivated`);
      router.refresh();
    });

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button variant="primary" onClick={() => setEditing("new")}><UserPlus /> Add user</Button>
      </div>
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th className="hidden sm:table-cell">Last sign-in</Th>
              <Th className="hidden md:table-cell">Added</Th>
              <Th className="w-12"><span className="sr-only">Actions</span></Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.active ? "" : "opacity-60"}>
                <Td>
                  <span className="block font-medium text-zinc-900">
                    {u.name} {u.id === meId && <span className="text-xs font-normal text-zinc-500">(you)</span>}
                  </span>
                  <span className="block text-xs text-zinc-500">{u.email}</span>
                </Td>
                <Td>
                  <span className="flex flex-wrap gap-1.5">
                    <Badge tone={roleTone[u.role]}>{ROLES.find((r) => r.value === u.role)?.label}</Badge>
                    {!u.active && <Badge tone="red">Deactivated</Badge>}
                  </span>
                </Td>
                <Td className="hidden whitespace-nowrap text-zinc-500 sm:table-cell">{fmt(u.lastLoginAt)}</Td>
                <Td className="hidden whitespace-nowrap text-zinc-500 md:table-cell">{fmt(u.createdAt)}</Td>
                <Td>
                  <DropdownMenu>
                    <DropdownTrigger asChild>
                      <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${u.name}`} disabled={pending}><MoreHorizontal /></Button>
                    </DropdownTrigger>
                    <DropdownContent>
                      <DropdownItem onSelect={() => setEditing(u)}><Pencil /> Edit</DropdownItem>
                      {u.id !== meId && (
                        <>
                          <DropdownItem onSelect={() => setResetting(u)}><KeyRound /> Set new password</DropdownItem>
                          <DropdownItem onSelect={() => toggleActive(u)}><Power /> {u.active ? "Deactivate" : "Reactivate"}</DropdownItem>
                          <DropdownSeparator />
                          <DropdownItem destructive onSelect={() => setDeleting(u)}><Trash2 /> Delete</DropdownItem>
                        </>
                      )}
                    </DropdownContent>
                  </DropdownMenu>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {editing && (
        <UserDialog
          user={editing === "new" ? null : editing}
          isSelf={editing !== "new" && editing.id === meId}
          onClose={() => setEditing(null)}
          onCreated={(email, password) => setShownPassword({ email, password })}
        />
      )}
      {resetting && (
        <ResetDialog user={resetting} onClose={() => setResetting(null)} onDone={(password) => setShownPassword({ email: resetting.email, password })} />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        destructive
        title={`Delete ${deleting?.name}?`}
        description={
          <>
            Their account will be removed and they will no longer be able to sign in.
            {deleting?.contentCount ? ` Their ${deleting.contentCount} page(s)/post(s) stay on the site without an author.` : ""} Consider deactivating instead if you may need the account again.
          </>
        }
        confirmLabel="Delete user"
        loading={pending}
        onConfirm={() =>
          start(async () => {
            const res = await deleteUser({ id: deleting!.id });
            if (!res.ok) return void toast.error(res.error);
            toast.success("User deleted");
            setDeleting(null);
            router.refresh();
          })
        }
      />
      <Dialog
        open={!!shownPassword}
        onOpenChange={(v) => !v && setShownPassword(null)}
        title="Password set"
        description="This password is shown only once."
        footer={<Button variant="primary" onClick={() => setShownPassword(null)}>Done</Button>}
      >
        <p className="text-sm text-zinc-600">
          Share it with <strong>{shownPassword?.email}</strong> through a secure channel (not in the same email as the username) and ask them to change it from their account page after signing in.
        </p>
        <div className="mt-4 flex gap-2">
          <Input readOnly value={shownPassword?.password ?? ""} className="font-mono" aria-label="Temporary password" onFocus={(e) => e.currentTarget.select()} />
          <Button
            onClick={() => {
              void navigator.clipboard.writeText(shownPassword?.password ?? "").then(() => toast.success("Copied to clipboard"));
            }}
          >
            <Copy /> Copy
          </Button>
        </div>
      </Dialog>
    </>
  );
}

function PasswordInput({ value, onChange, id, ...rest }: { value: string; onChange: (v: string) => void; id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) {
  return (
    <div className="flex gap-2">
      <Input id={id} {...rest} value={value} onChange={(e) => onChange(e.target.value)} className="font-mono" autoComplete="new-password" />
      <Button onClick={() => onChange(generatePassword())} title="Generate a strong password"><Wand2 /> Generate</Button>
    </div>
  );
}

function UserDialog({ user, isSelf, onClose, onCreated }: { user: UserRow | null; isSelf: boolean; onClose: () => void; onCreated: (email: string, password: string) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ name: user?.name ?? "", email: user?.email ?? "", role: (user?.role ?? "AUTHOR") as Role, password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = () =>
    start(async () => {
      const res = user
        ? await updateUser({ id: user.id, name: form.name, email: form.email, role: form.role })
        : await createUser({ name: form.name, email: form.email, role: form.role, password: form.password });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        return void toast.error(res.error);
      }
      toast.success(user ? "User updated" : "User created");
      if (!user) onCreated(form.email.trim().toLowerCase(), form.password);
      onClose();
      router.refresh();
    });
  return (
    <Dialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={user ? `Edit ${user.name}` : "Add user"}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={pending} onClick={submit}>{user ? "Save changes" : "Create user"}</Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Field label="Name" required error={errors.name}>{(p) => <Input {...p} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
        <Field label="Email" required error={errors.email}>{(p) => <Input {...p} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}</Field>
        <Field label="Role" hint={isSelf ? "You cannot change your own role." : ROLES.find((r) => r.value === form.role)?.help} error={errors.role}>
          {(p) => (
            <Select {...p} value={form.role} disabled={isSelf} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </Select>
          )}
        </Field>
        {!user && (
          <Field label="Temporary password" required hint="At least 12 characters, mixing letters with numbers or symbols. You'll see it once after creating the user." error={errors.password}>
            {(p) => <PasswordInput {...p} value={form.password} onChange={(password) => setForm({ ...form, password })} />}
          </Field>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Dialog>
  );
}

function ResetDialog({ user, onClose, onDone }: { user: UserRow; onClose: () => void; onDone: (password: string) => void }) {
  const [pending, start] = useTransition();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  return (
    <Dialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={`Set a new password for ${user.name}`}
      description="They will be signed out everywhere and must use the new password."
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await resetUserPassword({ id: user.id, password });
                if (!res.ok) {
                  setError(res.fieldErrors?.password ?? res.error);
                  return;
                }
                onDone(password);
                onClose();
              })
            }
          >
            Set password
          </Button>
        </>
      }
    >
      <Field label="New password" error={error}>{(p) => <PasswordInput {...p} value={password} onChange={setPassword} />}</Field>
    </Dialog>
  );
}
