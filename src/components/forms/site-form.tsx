"use client";

import { startTransition, useActionState, useEffect, useId, useRef, type FormEvent } from "react";
import type { SubmitResult } from "@/lib/forms/submit";
import { submitForm } from "@/app/actions/forms";
import { FORMS } from "@/lib/forms/definitions";
import type { FormKey } from "@/lib/blocks/schema";
import { t, type Locale } from "@/lib/i18n";
import { IconDownload } from "@/components/site/icons";

/**
 * Submit through a handler instead of <form action>: React would otherwise reset the form
 * after every attempt, wiping the visitor's answers and the anti-spam start time.
 */
export function useSiteFormSubmit() {
  const [state, action, pending] = useActionState<SubmitResult | null, FormData>(submitForm, null);
  const startedAt = useRef(0);
  // Recorded on the client after hydration (cached HTML must not carry a server timestamp).
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("_t", String(startedAt.current || Date.now()));
    startTransition(() => action(fd));
  };
  return { state, pending, onSubmit };
}

/** Hidden anti-spam inputs shared by every public form. */
export function SpamGuards({ formKey, locale }: { formKey: string; locale: Locale }) {
  return (
    <>
      <input type="hidden" name="_form" value={formKey} />
      <input type="hidden" name="_locale" value={locale} />
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Leave this field empty
          <input type="text" name="_hp" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
    </>
  );
}

export function SiteForm({
  formKey,
  locale,
  downloadId,
  compact,
}: {
  formKey: FormKey;
  locale: Locale;
  downloadId?: string | null;
  compact?: boolean;
}) {
  const def = FORMS[formKey];
  const { state, pending, onSubmit } = useSiteFormSubmit();
  const uid = useId();

  if (state?.ok) {
    return (
      <div role="status" className="animate-pop rounded-md border border-brand/30 bg-brand-50 p-6 text-center text-ink">
        <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-brand text-white shadow-[0_10px_24px_-8px_rgba(33,179,84,0.8)]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path className="check-draw" d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </span>
        <p className="font-semibold">{def.success[locale]}</p>
        {state.downloadUrl && (
          <a href={state.downloadUrl} className="btn btn-primary mt-4" download>
            <IconDownload /> {t("downloadReport", locale)}
          </a>
        )}
      </div>
    );
  }

  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form method="post" onSubmit={onSubmit} className={`relative grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 ${compact ? "" : ""}`}>
      <SpamGuards formKey={formKey} locale={locale} />
      {downloadId && <input type="hidden" name="_download" value={downloadId} />}
      {def.fields.map((f) => {
        const id = `${uid}-${f.name}`;
        const label = f.label[locale] || f.label.en;
        const err = errors[f.name];
        const common = {
          id,
          name: f.name,
          required: f.required,
          "aria-invalid": err ? true : undefined,
          "aria-describedby": err ? `${id}-err` : undefined,
          className: "site-field",
        };
        return (
          <div key={f.name} className={f.half ? "" : "sm:col-span-2"}>
            <label htmlFor={id} className="sr-only">{label}</label>
            {f.type === "textarea" ? (
              <textarea {...common} placeholder={label} rows={5} maxLength={f.max} />
            ) : f.type === "select" ? (
              <select {...common} defaultValue="">
                <option value="" disabled>{label}</option>
                {f.options!.map((o) => (
                  <option key={o.value} value={o.value}>{o.label[locale] || o.label.en}</option>
                ))}
              </select>
            ) : (
              <input {...common} type={f.type} placeholder={label} maxLength={f.max} autoComplete={f.type === "email" ? "email" : f.type === "tel" ? "tel" : undefined} />
            )}
            {err && <p id={`${id}-err`} className="mt-1 text-sm text-red-600">{err}</p>}
          </div>
        );
      })}
      {state && !state.ok && (
        <p role="alert" className="text-sm text-red-600 sm:col-span-2">
          {state.error === "rate_limited" ? t("formRateLimited", locale) : t("formError", locale)}
        </p>
      )}
      <div className="flex justify-center sm:col-span-2">
        <button type="submit" disabled={pending} className="btn btn-primary min-w-[146px] disabled:opacity-60">
          {pending ? t("sending", locale) : def.submit[locale]}
        </button>
      </div>
    </form>
  );
}
