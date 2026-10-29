"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { adminAction, UserError } from "@/lib/admin/action";
import { hashPassword, passwordSchema, verifyPassword } from "@/lib/auth/password";
import { destroyAllSessionsForUser } from "@/lib/auth/session";
import { hashIdentifier, rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export const updateProfile = adminAction(null, z.object({ name: z.string().trim().min(2, "Enter your name.").max(100) }), async ({ name }, me) => {
  await db.user.update({ where: { id: me.id }, data: { name } });
  await audit({ userId: me.id, action: "account.update", entityType: "USER", entityId: me.id, summary: "Updated their profile name" });
  revalidatePath("/admin", "layout");
  return null;
});

export const changePassword = adminAction(
  null,
  z
    .object({ current: z.string().min(1, "Enter your current password.").max(200), password: passwordSchema, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "Passwords do not match.", path: ["confirm"] }),
  async ({ current, password }, me) => {
    const limit = await rateLimit(`pwchange:${hashIdentifier(me.id)}`, 10, 900);
    if (!limit.allowed) throw new UserError("Too many attempts. Try again in a few minutes.");
    const user = await db.user.findUniqueOrThrow({ where: { id: me.id } });
    if (!(await verifyPassword(user.passwordHash, current))) {
      throw new UserError("Your current password is not correct.", { current: "Incorrect password." });
    }
    if (current === password) throw new UserError("Choose a password different from your current one.", { password: "Must differ from the current password." });
    await db.$transaction([
      db.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(password) } }),
      // Outstanding reset links stop working once the password has changed.
      db.passwordResetToken.deleteMany({ where: { userId: me.id } }),
    ]);
    await destroyAllSessionsForUser(me.id, true);
    await audit({ userId: me.id, action: "account.password_change", entityType: "USER", entityId: me.id, summary: "Changed their password (other sessions signed out)" });
    revalidatePath("/admin/account/");
    return null;
  },
);

export const signOutOtherSessions = adminAction(null, z.object({}), async (_input, me) => {
  await destroyAllSessionsForUser(me.id, true);
  await audit({ userId: me.id, action: "account.sessions_revoked", entityType: "USER", entityId: me.id, summary: "Signed out all other sessions" });
  revalidatePath("/admin/account/");
  return null;
});
