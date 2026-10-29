/**
 * Create an administrator, or reset a user's password (account recovery without email).
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_NAME="Your Name" ADMIN_PASSWORD='…' npm run admin:create
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='…' npm run admin:create -- --reset
 *
 * The password is read from the environment (never from command-line arguments, which can
 * end up in shell history). Requires direct database access, i.e. server/operator access.
 */
import "dotenv/config";
import { db } from "@/lib/db";
import { hashPassword, passwordSchema } from "@/lib/auth/password";
import { audit } from "@/lib/audit";

async function main() {
  const reset = process.argv.includes("--reset");
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const name = (process.env.ADMIN_NAME ?? "").trim();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email) throw new Error("Set ADMIN_EMAIL.");
  const pw = passwordSchema.safeParse(password);
  if (!pw.success) throw new Error(`ADMIN_PASSWORD: ${pw.error.issues[0].message}`);
  const passwordHash = await hashPassword(password);

  const existing = await db.user.findUnique({ where: { email } });
  if (reset) {
    if (!existing) throw new Error(`No user with email ${email}.`);
    await db.user.update({ where: { id: existing.id }, data: { passwordHash, active: true } });
    await db.session.deleteMany({ where: { userId: existing.id } });
    await audit({ userId: existing.id, action: "auth.password_reset_cli", entityType: "USER", entityId: existing.id, summary: "Password reset from the command line" });
    console.log(`Password reset for ${email}. All their sessions were signed out.`);
    return;
  }
  if (existing) throw new Error(`${email} already exists. Use --reset to change the password.`);
  if (!name) throw new Error("Set ADMIN_NAME.");
  const user = await db.user.create({ data: { email, name, passwordHash, role: "ADMIN" } });
  await audit({ userId: user.id, action: "user.create_cli", entityType: "USER", entityId: user.id, summary: `Administrator ${email} created from the command line` });
  console.log(`Administrator ${email} created.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
