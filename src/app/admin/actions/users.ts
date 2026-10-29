"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { adminAction, isUniqueError, UserError } from "@/lib/admin/action";
import { hashPassword, passwordSchema } from "@/lib/auth/password";
import { audit } from "@/lib/audit";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import type { Prisma } from "@/generated/prisma/client";

const role = z.enum(["ADMIN", "EDITOR", "AUTHOR"]);
const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(200);
const name = z.string().trim().min(2, "Enter a name.").max(100);

type Tx = Prisma.TransactionClient;

/**
 * Run a user change only if it keeps at least one active administrator. The check and the
 * write share one serializable transaction, so two admins demoting each other at the same
 * moment cannot leave the site without one.
 */
async function withAdminGuard<T>(
  userId: string,
  next: { role?: string; active?: boolean; deleted?: boolean },
  write: (tx: Tx, target: { id: string; name: string; email: string; role: string }) => Promise<T>,
) {
  try {
    return await db.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({ where: { id: userId } });
        if (!target) throw new UserError("User not found.");
        const losesAdmin =
          target.role === "ADMIN" && target.active && (next.deleted || next.active === false || (next.role && next.role !== "ADMIN"));
        if (losesAdmin) {
          const others = await tx.user.count({ where: { role: "ADMIN", active: true, id: { not: userId } } });
          if (others === 0) throw new UserError("There must always be at least one active administrator.");
        }
        return { target, result: await write(tx, target) };
      },
      { isolationLevel: "Serializable" },
    );
  } catch (err) {
    // P2034: serialization conflict with a simultaneous change.
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2034") {
      throw new UserError("Another change to users happened at the same time. Please try again.");
    }
    throw err;
  }
}

export const createUser = adminAction(
  "users.manage",
  z.object({ name, email, role, password: passwordSchema }),
  async (input, me) => {
    try {
      const user = await db.user.create({
        data: { name: input.name, email: input.email, role: input.role, passwordHash: await hashPassword(input.password) },
      });
      await audit({ userId: me.id, action: "user.create", entityType: "USER", entityId: user.id, summary: `Created ${ROLE_LABELS[input.role].toLowerCase()} ${user.email}` });
      revalidatePath("/admin/users/");
      return { id: user.id };
    } catch (err) {
      if (isUniqueError(err)) throw new UserError("A user with this email already exists.", { email: "This email is already in use." });
      throw err;
    }
  },
);

export const updateUser = adminAction(
  "users.manage",
  z.object({ id: z.string().min(1), name, email, role }),
  async (input, me) => {
    if (input.id === me.id && input.role !== me.role) throw new UserError("You cannot change your own role.");
    let before: { name: string; email: string; role: string };
    try {
      ({ target: before } = await withAdminGuard(input.id, { role: input.role }, (tx) =>
        tx.user.update({ where: { id: input.id }, data: { name: input.name, email: input.email, role: input.role } }),
      ));
    } catch (err) {
      if (isUniqueError(err)) throw new UserError("A user with this email already exists.", { email: "This email is already in use." });
      throw err;
    }
    // A role change takes effect immediately on the next request (role is read from the DB per request).
    const changes = [
      before.name !== input.name && "name",
      before.email !== input.email && "email",
      before.role !== input.role && `role ${before.role} → ${input.role}`,
    ].filter(Boolean);
    await audit({ userId: me.id, action: "user.update", entityType: "USER", entityId: input.id, summary: `Updated ${input.email}${changes.length ? ` (${changes.join(", ")})` : ""}` });
    revalidatePath("/admin/users/");
    return null;
  },
);

export const setUserActive = adminAction(
  "users.manage",
  z.object({ id: z.string().min(1), active: z.boolean() }),
  async ({ id, active }, me) => {
    if (id === me.id) throw new UserError("You cannot deactivate your own account.");
    const { target: user } = await withAdminGuard(id, { active }, async (tx) => {
      await tx.user.update({ where: { id }, data: { active } });
      if (!active) {
        await tx.session.deleteMany({ where: { userId: id } });
        await tx.passwordResetToken.deleteMany({ where: { userId: id } });
      }
    });
    await audit({ userId: me.id, action: active ? "user.reactivate" : "user.deactivate", entityType: "USER", entityId: id, summary: `${active ? "Reactivated" : "Deactivated"} ${user.email}` });
    revalidatePath("/admin/users/");
    return null;
  },
);

export const resetUserPassword = adminAction(
  "users.manage",
  z.object({ id: z.string().min(1), password: passwordSchema }),
  async ({ id, password }, me) => {
    if (id === me.id) throw new UserError("Change your own password from your account page.");
    const user = await db.user.findUnique({ where: { id } });
    if (!user) throw new UserError("User not found.");
    await db.$transaction([
      db.user.update({ where: { id }, data: { passwordHash: await hashPassword(password) } }),
      db.session.deleteMany({ where: { userId: id } }),
      db.passwordResetToken.deleteMany({ where: { userId: id } }),
    ]);
    await audit({ userId: me.id, action: "user.password_reset", entityType: "USER", entityId: id, summary: `Set a new password for ${user.email} and signed them out` });
    return null;
  },
);

export const deleteUser = adminAction("users.manage", z.object({ id: z.string().min(1) }), async ({ id }, me) => {
  if (id === me.id) throw new UserError("You cannot delete your own account.");
  // Content keeps existing: authorId / uploadedById are set to null by the foreign keys.
  const { target: user } = await withAdminGuard(id, { deleted: true }, (tx) => tx.user.delete({ where: { id } }));
  await audit({ userId: me.id, action: "user.delete", entityType: "USER", entityId: id, summary: `Deleted user ${user.email}` });
  revalidatePath("/admin/users/");
  return null;
});
