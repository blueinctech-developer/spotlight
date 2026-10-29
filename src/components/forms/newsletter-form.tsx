"use client";

import { useId } from "react";
import { FORMS } from "@/lib/forms/definitions";
import { t, type Locale } from "@/lib/i18n";
import { SpamGuards, useSiteFormSubmit } from "./site-form";

export function NewsletterForm({ locale }: { locale: Locale }) {
  const def = FORMS.newsletter;
  const { state, pending, onSubmit } = useSiteFormSubmit();
  const id = useId();
  if (state?.ok) {
    return <p role="status" className="text-lg font-semibold text-white">{def.success[locale]}</p>;
  }
  return (
    <form method="post" onSubmit={onSubmit} className="relative flex flex-col gap-3 sm:flex-row">
      <SpamGuards formKey="newsletter" locale={locale} />
      <label htmlFor={id} className="sr-only">{def.fields[0].label[locale]}</label>
      <input id={id} name="email" type="email" required autoComplete="email" placeholder={def.fields[0].label[locale]} className="min-w-0 flex-1 rounded-[3px] bg-white px-4 py-3.5 text-[15px] text-ink outline-none" />
      <button type="submit" disabled={pending} className="btn btn-dark rounded-[3px] px-8 disabled:opacity-60">
        {pending ? t("sending", locale) : def.submit[locale]}
      </button>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-white sm:absolute sm:-bottom-7">
          {state.error === "rate_limited" ? t("formRateLimited", locale) : state.fieldErrors?.email ?? t("formError", locale)}
        </p>
      )}
    </form>
  );
}
