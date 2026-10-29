import "server-only";
import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";

// OWASP-recommended Argon2id parameters (19 MiB, 2 iterations, 1 lane).
const ARGON_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(200, "Password is too long.")
  .refine((v) => /[a-z]/i.test(v) && /[^a-z]/i.test(v), "Mix letters with numbers or symbols.");

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON_OPTS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

// A real hash used to keep login timing similar when the email does not exist.
let dummyHash: Promise<string> | null = null;
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword("not-a-real-password-placeholder");
  await verifyPassword(await dummyHash, password);
}
