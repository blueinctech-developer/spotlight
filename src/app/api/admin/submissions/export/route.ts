import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { FORMS, displayValue } from "@/lib/forms/definitions";
import type { FormKey } from "@/lib/blocks/schema";
import { parseSubmissionFilters, submissionWhere } from "@/components/admin/submissions/filters";
import { csvCell } from "@/components/admin/submissions/csv";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Not signed in", { status: 401 });
  if (!can(user.role, "submissions.view")) return new Response("Forbidden", { status: 403 });

  const url = new URL(req.url);
  const f = parseSubmissionFilters(url.searchParams);
  const rows = await db.formSubmission.findMany({ where: await submissionWhere(f), orderBy: { createdAt: "desc" }, take: 20_000 });

  // Columns: fixed metadata + union of form fields (in definition order) + any unknown keys.
  const fieldCols: { key: string; label: string; form?: FormKey }[] = [];
  const forms = f.form ? [f.form as FormKey] : [...new Set(rows.map((r) => r.formKey as FormKey))];
  for (const fk of forms) {
    for (const field of FORMS[fk]?.fields ?? []) {
      if (!fieldCols.some((c) => c.key === field.name)) fieldCols.push({ key: field.name, label: field.label.en.replace(/\s*\*$/, ""), form: fk });
    }
  }
  for (const r of rows) {
    for (const k of Object.keys(r.data as object)) if (!fieldCols.some((c) => c.key === k)) fieldCols.push({ key: k, label: k });
  }

  const header = ["Received (UTC)", "Form", "Status", "Language", ...fieldCols.map((c) => c.label)];
  const lines = [header.map(csvCell).join(",")];
  for (const r of rows) {
    const data = r.data as Record<string, unknown>;
    const def = FORMS[r.formKey as FormKey];
    lines.push(
      [
        r.createdAt.toISOString(),
        def?.title.en ?? r.formKey,
        r.status,
        r.locale,
        ...fieldCols.map((c) => (def ? displayValue(def, c.key, data[c.key] ?? "") : data[c.key] ?? "")),
      ].map(csvCell).join(","),
    );
  }

  await audit({ userId: user.id, action: "submission.export", entityType: "SUBMISSION", summary: `Exported ${rows.length} submission${rows.length === 1 ? "" : "s"} to CSV`, meta: { ...f } });
  const name = `submissions-${f.form || "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
