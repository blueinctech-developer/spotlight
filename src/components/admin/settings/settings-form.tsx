"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Plus, Trash2, XCircle } from "lucide-react";
import { saveSettingsGroup } from "@/app/admin/actions/settings";
import type { AllSettings, I18nText, SettingsKey } from "@/lib/settings-schema";
import { Badge, Button, Card, CardHeader, Field, Input, Switch, Textarea, cn } from "@/components/admin/ui";
import { MediaField } from "@/components/admin/media-picker";

export type EnvStatus = {
  database: boolean;
  storageDriver: "local" | "s3";
  storageWarning: boolean;
  mediaBaseUrl: string | null;
  email: boolean;
  notifyFallback: boolean;
  siteUrl: string;
  production: boolean;
};

const TABS: { id: string; label: string; groups: SettingsKey[] }[] = [
  { id: "general", label: "General", groups: ["general"] },
  { id: "chrome", label: "Header & footer", groups: ["header", "footerCta", "footerSeat"] },
  { id: "contact", label: "Contact & social", groups: ["contact", "social"] },
  { id: "seo", label: "SEO", groups: ["seo"] },
  { id: "privacy", label: "Analytics & privacy", groups: ["analytics", "privacy"] },
  { id: "notifications", label: "Form notifications", groups: ["notifications"] },
  { id: "environment", label: "Environment", groups: [] },
];

type Errors = Record<string, string>;

function I18nField({
  label, value, onChange, error, textarea, hint,
}: {
  label: string; value: I18nText; onChange: (v: I18nText) => void; error?: (lang: "en" | "fr") => string | undefined; textarea?: boolean; hint?: string;
}) {
  const missing = value.en.trim() && !value.fr.trim();
  const C = textarea ? Textarea : Input;
  return (
    <fieldset className="space-y-1.5">
      <legend className="flex items-center gap-2 text-[13px] font-medium text-zinc-700">
        {label}
        {missing && <Badge tone="amber">French missing</Badge>}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {(["en", "fr"] as const).map((lang) => (
          <div key={lang} className="relative">
            <span className="pointer-events-none absolute right-2 top-2 z-10 rounded bg-zinc-100 px-1 text-[10px] font-semibold uppercase text-zinc-600">{lang}</span>
            <C
              aria-label={`${label} (${lang === "en" ? "English" : "French"})`}
              aria-invalid={error?.(lang) ? true : undefined}
              value={value[lang]}
              onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onChange({ ...value, [lang]: e.target.value })}
              className="pr-10"
              rows={textarea ? 3 : undefined}
            />
            {error?.(lang) && <p className="mt-1 text-xs text-red-600">{error(lang)}</p>}
          </div>
        ))}
      </div>
      {missing ? <p className="text-xs text-zinc-500">French pages fall back to the English text until a translation is added.</p> : hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
    </fieldset>
  );
}

export function SettingsForm({ initial, env }: { initial: AllSettings; env: EnvStatus }) {
  const [tab, setTab] = useState("general");
  const [s, setS] = useState<AllSettings>(initial);
  const [saved, setSaved] = useState<AllSettings>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const current = TABS.find((t) => t.id === tab)!;
  const dirtyGroups = useMemo(
    () => (Object.keys(s) as SettingsKey[]).filter((k) => JSON.stringify(s[k]) !== JSON.stringify(saved[k])),
    [s, saved],
  );
  useEffect(() => {
    if (!dirtyGroups.length) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirtyGroups.length]);

  const set = <K extends SettingsKey>(key: K, patch: Partial<AllSettings[K]>) => setS((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  const err = (path: string) => errors[path];
  const i18nErr = (path: string) => (lang: "en" | "fr") => errors[`${path}.${lang}`];

  const save = async () => {
    setSaving(true);
    const nextErrors: Errors = {};
    let failed = false;
    for (const key of current.groups) {
      if (!dirtyGroups.includes(key)) continue;
      const res = await saveSettingsGroup({ key, value: s[key] as Record<string, unknown> });
      if (res.ok) {
        setSaved((prev) => ({ ...prev, [key]: res.data }));
        setS((prev) => ({ ...prev, [key]: res.data }));
      } else {
        failed = true;
        for (const [k, v] of Object.entries(res.fieldErrors ?? {})) nextErrors[`${key}.${k}`] = v;
        toast.error(res.error);
      }
    }
    setErrors(nextErrors);
    setSaving(false);
    if (!failed) toast.success("Settings saved. The website has been updated.");
  };

  const tabDirty = current.groups.some((g) => dirtyGroups.includes(g));

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr] [&_label[for]]:block">
      <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto lg:flex-col">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id}
            className={cn("flex items-center justify-between whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm", tab === t.id ? "bg-white font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200" : "text-zinc-600 hover:bg-zinc-100")}
          >
            {t.label}
            {t.groups.some((g) => dirtyGroups.includes(g)) && <span className="ml-2 size-2 rounded-full bg-amber-500" aria-label="Unsaved changes" />}
          </button>
        ))}
      </nav>

      <div className="space-y-6">
        {tab === "general" && (
          <Card>
            <CardHeader title="General" description="Site identity and footer credits." />
            <div className="grid gap-5 p-5">
              <Field label="Site name" error={err("general.siteName")}>{(p) => <Input {...p} value={s.general.siteName} onChange={(e) => set("general", { siteName: e.target.value })} className="max-w-md" />}</Field>
              <I18nField label="Tagline" value={s.general.tagline} onChange={(v) => set("general", { tagline: v })} error={i18nErr("general.tagline")} hint="Used in the home page title." />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Logo" hint="Shown in the header. Leave empty to use the built-in logo.">{() => <MediaField value={s.general.logoId} onChange={(v) => set("general", { logoId: v })} aspect="aspect-[3/1]" />}</Field>
                <Field label="Favicon" hint="Square image, at least 512×512 px.">{() => <MediaField value={s.general.faviconId} onChange={(v) => set("general", { faviconId: v })} aspect="aspect-[3/1]" />}</Field>
              </div>
              <I18nField label="Copyright line" value={s.general.copyright} onChange={(v) => set("general", { copyright: v })} error={i18nErr("general.copyright")} />
              <I18nField label="Credit prefix" value={s.general.creditPrefix} onChange={(v) => set("general", { creditPrefix: v })} hint='E.g. "Designs by".' />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Credit name" error={err("general.creditLabel")}>{(p) => <Input {...p} value={s.general.creditLabel} onChange={(e) => set("general", { creditLabel: e.target.value })} />}</Field>
                <Field label="Credit link" error={err("general.creditUrl")}>{(p) => <Input {...p} value={s.general.creditUrl} onChange={(e) => set("general", { creditUrl: e.target.value })} placeholder="https://" />}</Field>
              </div>
              <I18nField label="Bottom note" value={s.general.bottomNote} onChange={(v) => set("general", { bottomNote: v })} />
              <Field label="Default language" hint="The language served at the root URL. English is unprefixed; French lives under /fr/.">
                {() => <p className="text-sm text-zinc-700">English (routing is fixed to match the original site’s URLs)</p>}
              </Field>
            </div>
          </Card>
        )}

        {tab === "chrome" && (
          <>
            <Card>
              <CardHeader title="Header buttons" />
              <div className="grid gap-5 p-5">
                <I18nField label="Register button label" value={s.header.ctaLabel} onChange={(v) => set("header", { ctaLabel: v })} error={i18nErr("header.ctaLabel")} />
                <Field label="Register button link" error={err("header.ctaHref")}>{(p) => <Input {...p} value={s.header.ctaHref} onChange={(e) => set("header", { ctaHref: e.target.value })} className="max-w-md" />}</Field>
                <I18nField label="Dark header button label" value={s.header.darkCtaLabel} onChange={(v) => set("header", { darkCtaLabel: v })} hint="Shown on pages using the dark header (registration pages, speakers)." />
                <Field label="Dark header button link" error={err("header.darkCtaHref")}>{(p) => <Input {...p} value={s.header.darkCtaHref} onChange={(e) => set("header", { darkCtaHref: e.target.value })} className="max-w-md" />}</Field>
              </div>
            </Card>
            <Card>
              <CardHeader title="Footer call to action" description="Green band above the footer on most pages." action={<Switch checked={s.footerCta.enabled} onCheckedChange={(v) => set("footerCta", { enabled: v })} label="Show" />} />
              <div className="grid gap-5 p-5">
                <I18nField label="Eyebrow" value={s.footerCta.eyebrow} onChange={(v) => set("footerCta", { eyebrow: v })} />
                <I18nField label="Title" value={s.footerCta.title} onChange={(v) => set("footerCta", { title: v })} error={i18nErr("footerCta.title")} />
                <I18nField label="Button label" value={s.footerCta.buttonLabel} onChange={(v) => set("footerCta", { buttonLabel: v })} />
                <Field label="Button link">{(p) => <Input {...p} value={s.footerCta.buttonHref} onChange={(e) => set("footerCta", { buttonHref: e.target.value })} className="max-w-md" />}</Field>
              </div>
            </Card>
            <Card>
              <CardHeader title="“Book your seat” footer" description="Dark registration band with newsletter sign-up (used on the About page)." />
              <div className="grid gap-5 p-5">
                <I18nField label="Title" value={s.footerSeat.title} onChange={(v) => set("footerSeat", { title: v })} />
                <I18nField label="Button label" value={s.footerSeat.buttonLabel} onChange={(v) => set("footerSeat", { buttonLabel: v })} />
                <Field label="Button link">{(p) => <Input {...p} value={s.footerSeat.buttonHref} onChange={(e) => set("footerSeat", { buttonHref: e.target.value })} className="max-w-md" />}</Field>
                <I18nField label="Newsletter eyebrow" value={s.footerSeat.newsletterEyebrow} onChange={(v) => set("footerSeat", { newsletterEyebrow: v })} />
                <I18nField label="Newsletter title" value={s.footerSeat.newsletterTitle} onChange={(v) => set("footerSeat", { newsletterTitle: v })} />
              </div>
            </Card>
          </>
        )}

        {tab === "contact" && (
          <>
            <Card>
              <CardHeader title="Contact details" />
              <div className="grid gap-5 p-5">
                <Field label="Email" error={err("contact.email")}>{(p) => <Input {...p} type="email" value={s.contact.email} onChange={(e) => set("contact", { email: e.target.value })} className="max-w-md" />}</Field>
                <Field label="Phone numbers" hint="One per line.">
                  {(p) => <Textarea {...p} rows={3} value={s.contact.phones.join("\n")} onChange={(e) => set("contact", { phones: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })} className="max-w-md" />}
                </Field>
                <I18nField label="Opening hours" value={s.contact.hours} onChange={(v) => set("contact", { hours: v })} />
                <div className="space-y-3">
                  <p className="text-[13px] font-medium text-zinc-700">Addresses</p>
                  {s.contact.addresses.map((a, i) => (
                    <div key={i} className="space-y-3 rounded-lg border border-zinc-200 p-3">
                      <I18nField label="Label" value={a.label} onChange={(v) => set("contact", { addresses: s.contact.addresses.map((x, j) => (j === i ? { ...x, label: v } : x)) })} />
                      <I18nField label="Address" value={a.text} onChange={(v) => set("contact", { addresses: s.contact.addresses.map((x, j) => (j === i ? { ...x, text: v } : x)) })} />
                      <Button size="sm" variant="danger-ghost" onClick={() => set("contact", { addresses: s.contact.addresses.filter((_, j) => j !== i) })}><Trash2 /> Remove address</Button>
                    </div>
                  ))}
                  {s.contact.addresses.length < 5 && (
                    <Button size="sm" onClick={() => set("contact", { addresses: [...s.contact.addresses, { label: { en: "", fr: "" }, text: { en: "", fr: "" } }] })}><Plus /> Add address</Button>
                  )}
                </div>
              </div>
            </Card>
            <Card>
              <CardHeader title="Social profiles" description="Full URLs. Empty profiles are hidden on the site." />
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                {(["facebook", "twitter", "linkedin", "instagram", "youtube", "flickr"] as const).map((k) => (
                  <Field key={k} label={k === "twitter" ? "X (Twitter)" : k[0].toUpperCase() + k.slice(1)} error={err(`social.${k}`)}>
                    {(p) => <Input {...p} value={s.social[k]} onChange={(e) => set("social", { [k]: e.target.value } as Partial<AllSettings["social"]>)} placeholder="https://" />}
                  </Field>
                ))}
              </div>
            </Card>
          </>
        )}

        {tab === "seo" && (
          <Card>
            <CardHeader title="Search engines & sharing" />
            <div className="grid gap-5 p-5">
              <Field label="Title template" hint="%s is replaced by the page title, e.g. “%s - Spotlight Nigeria”." error={err("seo.titleTemplate")}>
                {(p) => <Input {...p} value={s.seo.titleTemplate} onChange={(e) => set("seo", { titleTemplate: e.target.value })} className="max-w-md" />}
              </Field>
              <I18nField label="Default meta description" textarea value={s.seo.defaultDescription} onChange={(v) => set("seo", { defaultDescription: v })} error={i18nErr("seo.defaultDescription")} hint="Used when a page has no description of its own. Aim for 120–160 characters." />
              <Field label="Default social sharing image" hint="1200×630 px recommended.">{() => <div className="max-w-sm"><MediaField value={s.seo.ogImageId} onChange={(v) => set("seo", { ogImageId: v })} /></div>}</Field>
              <Field
                label="Google Search Console verification code"
                hint="The content of the google-site-verification meta tag. Keep the code used on the old site so Search Console ownership survives the move."
                error={err("seo.googleSiteVerification")}
              >
                {(p) => <Input {...p} value={s.seo.googleSiteVerification} onChange={(e) => set("seo", { googleSiteVerification: e.target.value.trim() })} className="max-w-md font-mono" />}
              </Field>
              <Field label="Bing Webmaster verification code" hint="The content of the msvalidate.01 meta tag (optional)." error={err("seo.bingSiteVerification")}>
                {(p) => <Input {...p} value={s.seo.bingSiteVerification} onChange={(e) => set("seo", { bingSiteVerification: e.target.value.trim() })} className="max-w-md font-mono" />}
              </Field>
              <div className={cn("rounded-lg border p-4", s.seo.discourageIndexing ? "border-red-200 bg-red-50" : "border-zinc-200")}>
                <Switch checked={s.seo.discourageIndexing} onCheckedChange={(v) => set("seo", { discourageIndexing: v })} label="Discourage search engines from indexing this site" />
                <p className={cn("mt-2 text-xs", s.seo.discourageIndexing ? "text-red-700" : "text-zinc-500")}>
                  {s.seo.discourageIndexing
                    ? "Warning: while this is on, every page asks search engines not to index it and robots.txt blocks crawling. Only use it on a staging copy."
                    : "Use only for staging or pre-launch copies of the site."}
                </p>
              </div>
            </div>
          </Card>
        )}

        {tab === "privacy" && (
          <>
            <Card>
              <CardHeader title="Analytics" />
              <div className="grid gap-5 p-5">
                <Field label="Google Analytics / Google tag ID" hint="Format G-XXXXXXXXXX or GT-XXXXXXX (the old site used a GT- Google tag). Leave empty to disable analytics." error={err("analytics.gaMeasurementId") && "Use the format G-XXXXXXXXXX or GT-XXXXXXX (find it in Google Analytics → Admin → Data streams)."}>
                  {(p) => <Input {...p} value={s.analytics.gaMeasurementId} onChange={(e) => set("analytics", { gaMeasurementId: e.target.value.trim() })} className="max-w-xs font-mono" placeholder="G-" />}
                </Field>
              </div>
            </Card>
            <Card>
              <CardHeader title="Cookie notice" description="When enabled, analytics only load after the visitor accepts." action={<Switch checked={s.privacy.cookieBanner} onCheckedChange={(v) => set("privacy", { cookieBanner: v })} label="Show" />} />
              <div className="grid gap-5 p-5">
                <I18nField label="Message" textarea value={s.privacy.message} onChange={(v) => set("privacy", { message: v })} />
                <Field label="Privacy policy link">{(p) => <Input {...p} value={s.privacy.privacyHref} onChange={(e) => set("privacy", { privacyHref: e.target.value })} className="max-w-md" />}</Field>
              </div>
            </Card>
          </>
        )}

        {tab === "notifications" && (
          <Card>
            <CardHeader title="Form notifications" description="Who receives an email when each form is submitted. Separate several addresses with commas." />
            <div className="grid gap-4 p-5">
              {!env.email && (
                <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" /> Email is not configured on the server, so no notifications are sent. Submissions are still saved and visible under Submissions.
                </p>
              )}
              {(
                [
                  ["contact", "Contact form"],
                  ["sponsorship", "Sponsorship form"],
                  ["report-download", "Report download"],
                  ["press", "Press registration"],
                  ["newsletter", "Newsletter sign-up"],
                ] as const
              ).map(([k, label]) => (
                <Field key={k} label={label} hint={env.notifyFallback ? "Empty = the NOTIFY_EMAIL address from the server configuration." : "Empty = no email notification."} error={err(`notifications.${k}`)}>
                  {(p) => <Input {...p} value={s.notifications[k]} onChange={(e) => set("notifications", { [k]: e.target.value } as Partial<AllSettings["notifications"]>)} placeholder="team@example.com" className="max-w-lg" />}
                </Field>
              ))}
            </div>
          </Card>
        )}

        {tab === "environment" && <EnvironmentCard env={env} />}

        {current.groups.length > 0 && (
          <div className="sticky bottom-4 flex flex-row-reverse items-center justify-end gap-3 rounded-xl border border-zinc-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
            {tabDirty ? <span className="ml-1 text-sm text-amber-700">Unsaved changes</span> : <span className="ml-1 text-sm text-zinc-500">All changes saved</span>}
            <Button
              disabled={!tabDirty}
              onClick={() => {
                setS((prev) => {
                  const next = { ...prev };
                  for (const g of current.groups) (next as Record<string, unknown>)[g] = saved[g];
                  return next;
                });
                setErrors({});
              }}
            >
              Discard
            </Button>
            <Button variant="primary" disabled={!tabDirty} loading={saving} onClick={() => void save()}>Save changes</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function EnvironmentCard({ env }: { env: EnvStatus }) {
  const Row = ({ ok, warn, label, detail }: { ok: boolean; warn?: boolean; label: string; detail: string }) => (
    <li className="flex items-start gap-3 px-5 py-3">
      {warn ? <AlertTriangle className="mt-0.5 size-4 text-amber-500" /> : ok ? <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" /> : <XCircle className="mt-0.5 size-4 text-red-500" />}
      <span>
        <span className="block text-sm font-medium text-zinc-900">{label}</span>
        <span className="block text-[13px] text-zinc-500">{detail}</span>
      </span>
    </li>
  );
  return (
    <Card>
      <CardHeader title="Environment status" description="Read-only. These values come from the server configuration (see docs/DEPLOYMENT.md)." />
      <ul className="divide-y divide-zinc-100">
        <Row ok={env.database} label="Database" detail={env.database ? "Connected" : "Not reachable"} />
        <Row
          ok
          warn={env.storageWarning}
          label="Media storage"
          detail={
            env.storageDriver === "s3"
              ? `S3-compatible object storage${env.mediaBaseUrl ? ` · served from ${env.mediaBaseUrl}` : " · served through /media/"}`
              : env.storageWarning
                ? "Local disk — not suitable for production. Configure STORAGE_DRIVER=s3."
                : "Local disk (development)"
          }
        />
        <Row ok={env.email} label="Email" detail={env.email ? "SMTP configured — notifications and password resets are sent." : "Not configured — notifications and password-reset emails are not sent."} />
        <Row ok label="Site URL" detail={`${env.siteUrl}${env.production ? "" : " · development mode"}`} />
      </ul>
    </Card>
  );
}
