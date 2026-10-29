import "server-only";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { AuthError, assertCan, type SessionUser } from "@/lib/auth/session";
import type { Capability } from "@/lib/auth/permissions";

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Wrap a Server Action with authentication, a capability check and input validation.
 * Every admin mutation goes through this, so authorization never depends on the UI.
 */
export function adminAction<S extends z.ZodTypeAny, T>(
  cap: Capability | null,
  schema: S,
  fn: (input: z.infer<S>, user: SessionUser) => Promise<T>,
): (input: z.input<S>) => Promise<ActionResult<T>> {
  return async (raw) => {
    try {
      const user = await assertCan(cap ?? undefined);
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
        return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
      }
      const data = await fn(parsed.data, user);
      return { ok: true, data };
    } catch (err) {
      if (err instanceof AuthError) return { ok: false, error: err.message };
      if (err instanceof UserError) return { ok: false, error: err.message, fieldErrors: err.fieldErrors };
      // Next.js uses thrown errors for redirect()/notFound(); let those through.
      if (err && typeof err === "object" && "digest" in err) throw err;
      console.error("admin action failed", err);
      return { ok: false, error: "Something went wrong. Please try again." };
    }
  };
}

/** An expected, user-facing failure (shown as-is in the UI). */
export class UserError extends Error {
  constructor(message: string, public fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "UserError";
  }
}

/** Refresh every public page after content changes (ISR cache). */
export function revalidatePublic() {
  // Public routes are rewritten to /[lang]/… by proxy.ts, so revalidate the route patterns
  // (not the visible URLs). This also clears cached 404s for URLs that now have content.
  revalidatePath("/", "layout");
  revalidatePath("/[lang]", "layout");
  revalidatePath("/[lang]/[[...slug]]", "page");
  revalidatePath("/sitemap.xml");
}

/** Prisma unique-constraint violation → friendly message. */
export function isUniqueError(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002");
}
