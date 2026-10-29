"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { processSubmission, type SubmitResult } from "@/lib/forms/submit";
import { retryPendingNotifications } from "@/lib/forms/notify";
import { isLocale } from "@/lib/i18n";
import { clientIpFrom } from "@/lib/client-ip";

/** Public form submission (contact, sponsorship, report download, press, newsletter). */
export async function submitForm(_prev: SubmitResult | null, formData: FormData): Promise<SubmitResult> {
  const h = await headers();
  const formKey = String(formData.get("_form") ?? "");
  const locale = String(formData.get("_locale") ?? "en");
  const fields: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("_") && typeof v === "string") fields[k] = v;
  }
  const started = Number(formData.get("_t") ?? 0);
  const result = await processSubmission({
    formKey,
    locale: isLocale(locale) ? locale : "en",
    fields,
    honeypot: String(formData.get("_hp") ?? ""),
    elapsedMs: started ? Date.now() - started : 0,
    ip: clientIpFrom(h),
    userAgent: h.get("user-agent"),
    downloadId: (formData.get("_download") as string | null) || null,
  });
  // After the visitor has their answer, catch up on a few notifications that failed earlier
  // (the scheduled job at /api/cron/notifications does the same on a timer).
  if (result.ok) {
    after(async () => {
      try {
        await retryPendingNotifications({ limit: 3 });
      } catch (err) {
        console.error("notification retry failed:", err instanceof Error ? err.message : "unknown error");
      }
    });
  }
  return result;
}
