import { z } from "zod";
import type { FormKey } from "@/lib/blocks/schema";

/**
 * Form definitions recreated from the WordPress (Elementor Pro) forms, including the
 * French wording served by TranslatePress. Labels are kept verbatim from the live site.
 */
type L = { en: string; fr: string };
export type FieldDef = {
  name: string;
  type: "text" | "email" | "tel" | "textarea" | "select";
  label: L;
  required: boolean;
  half?: boolean;
  options?: { value: string; label: L }[];
  max?: number;
};
export type FormDef = {
  key: FormKey;
  title: L;
  submit: L;
  success: L;
  fields: FieldDef[];
};

const opt = (value: string, en: string, fr: string) => ({ value, label: { en, fr } });

const nameFields: FieldDef[] = [
  { name: "firstName", type: "text", label: { en: "First Name *", fr: "Prénom *" }, required: true, half: true, max: 100 },
  { name: "lastName", type: "text", label: { en: "Last Name *", fr: "Nom de famille *" }, required: true, half: true, max: 100 },
  { name: "phone", type: "tel", label: { en: "Phone Number *", fr: "Numéro de téléphone *" }, required: true, half: true, max: 40 },
  { name: "email", type: "email", label: { en: "Email *", fr: "E-mail *" }, required: true, half: true, max: 200 },
];

export const FORMS: Record<FormKey, FormDef> = {
  contact: {
    key: "contact",
    title: { en: "Contact form", fr: "Formulaire de contact" },
    submit: { en: "Submit", fr: "Soumettre" },
    success: {
      en: "Thank you. Your message has been sent and a member of our team will contact you shortly.",
      fr: "Merci. Votre message a bien été envoyé, un membre de notre équipe vous contactera rapidement.",
    },
    fields: [
      ...nameFields,
      {
        name: "profile", type: "select", required: true,
        label: { en: "Which best describes you? *", fr: "Lequel vous décrit le mieux? *" },
        options: [
          opt("entrepreneur", "Entrepreneur/ Startup", "Entrepreneur / Start-up"),
          opt("investor", "Investor", "Investisseur"),
          opt("solutions-provider", "Solutions Provider", "Fournisseur de solutions"),
          opt("media", "Media/ PR", "Médias/ RP"),
          opt("non-profit", "Non-profit/ Industry Association", "Association à but non lucratif/industrielle"),
          opt("government", "Goverment", "Gouvernement"),
          opt("other", "Other", "Autre"),
        ],
      },
      {
        name: "inquiryType", type: "select", required: true,
        label: { en: "Inquiry Type *", fr: "Type de demande *" },
        options: [
          opt("general", "General", "Général"),
          opt("attendance", "Attendance", "Présence"),
          opt("sponsorship", "Sponsorship/Exhibition", "Parrainage/Exposition"),
          opt("speaking", "Speaking", "Parlant"),
        ],
      },
      // Shown with "*" on the live site but not enforced there; kept optional to match behaviour.
      { name: "message", type: "textarea", label: { en: "Your message *", fr: "Votre message *" }, required: false, max: 5000 },
    ],
  },
  "report-download": {
    key: "report-download",
    title: { en: "Post-event report download", fr: "Téléchargement du rapport" },
    submit: { en: "Download Report", fr: "Télécharger le rapport" },
    success: {
      en: "Thank you. Your download is ready.",
      fr: "Merci. Votre téléchargement est prêt.",
    },
    fields: [
      ...nameFields,
      {
        name: "industry", type: "select", required: true,
        label: {
          en: "Which best describes your company industry? *",
          fr: "Qu'est-ce qui décrit le mieux le secteur d'activité de votre entreprise ? *",
        },
        options: [
          opt("agriculture", "Agriculture", "Agriculture"),
          opt("fashion", "Fashion and Cosmetics", "Mode et Cosmétique"),
          opt("ict", "ICT", "TIC"),
          opt("digital", "Digital and Entertainment", "Numérique et divertissement"),
          opt("energy", "Energy", "Énergie"),
          opt("finance", "Finance", "Finance"),
          opt("media", "Media", "Médias"),
          opt("multisector", "Multisector Company", "Entreprise multisectorielle"),
          opt("consulting", "Consulting and services", "Conseils et services"),
          opt("ngo", "NGO/Foundation/Association", "ONG/Fondation/Association"),
          opt("government", "Government", "Gouvernement"),
          opt("regulator", "Regulator", "Régulateur"),
          opt("academic", "Academic/Research Institution", "Institution universitaire/de recherche"),
          opt("embassy", "Embassies/Consulates/Trade Mission", "Ambassades/Consulats/Mission commerciale"),
        ],
      },
      { name: "city", type: "text", label: { en: "City", fr: "Ville" }, required: true, half: true, max: 100 },
      { name: "jobTitle", type: "text", label: { en: "Job Title", fr: "Titre d'emploi" }, required: true, half: true, max: 150 },
      { name: "jobFunction", type: "text", label: { en: "Job Function", fr: "Fonction du poste" }, required: true, max: 150 },
    ],
  },
  sponsorship: {
    key: "sponsorship",
    title: { en: "Sponsorship form", fr: "Formulaire de parrainage" },
    submit: { en: "Submit", fr: "Soumettre" },
    success: {
      en: "Thank you for your interest in sponsoring. We will be in touch with you soon.",
      fr: "Merci pour votre intérêt. Nous vous contacterons très prochainement.",
    },
    fields: [
      { name: "name", type: "text", label: { en: "Your Name", fr: "votre nom" }, required: false, max: 150 },
      { name: "company", type: "text", label: { en: "Company name", fr: "Nom de l'entreprise" }, required: false, max: 200 },
      { name: "email", type: "email", label: { en: "Your Email (name@website.com)", fr: "Votre e-mail (nom@siteweb.com)" }, required: true, max: 200 },
      { name: "message", type: "textarea", label: { en: "Your message", fr: "Votre message" }, required: false, max: 5000 },
    ],
  },
  press: {
    key: "press",
    title: { en: "Press registration", fr: "Inscription presse" },
    submit: { en: "Submit", fr: "Soumettre" },
    success: {
      en: "Thank you. Your accreditation request has been received.",
      fr: "Merci. Votre demande d'accréditation a bien été reçue.",
    },
    fields: [
      ...nameFields,
      { name: "jobTitle", type: "text", label: { en: "Job *", fr: "Poste *" }, required: true, max: 150 },
      { name: "organisation", type: "text", label: { en: "Media Organisation *", fr: "Organisation médiatique *" }, required: true, max: 200 },
      { name: "website", type: "text", label: { en: "Website Address", fr: "Adresse du site web" }, required: false, max: 300 },
      { name: "message", type: "textarea", label: { en: "Where will these be published? *", fr: "Où seront-ils publiés ? *" }, required: true, max: 2000 },
    ],
  },
  newsletter: {
    key: "newsletter",
    title: { en: "Newsletter", fr: "Newsletter" },
    submit: { en: "Subscribe", fr: "S'abonner" },
    success: { en: "Thank you for subscribing.", fr: "Merci pour votre inscription." },
    fields: [{ name: "email", type: "email", label: { en: "Enter your email", fr: "Entrer votre Email" }, required: true, max: 200 }],
  },
};

/** Build a server-side validator for a form definition. */
export function formValidator(def: FormDef) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of def.fields) {
    let s: z.ZodTypeAny;
    if (f.type === "email") s = z.string().trim().max(f.max ?? 200).email("Please enter a valid email address.");
    else if (f.type === "select") s = z.enum(f.options!.map((o) => o.value) as [string, ...string[]], { message: "Please choose an option." });
    else s = z.string().trim().max(f.max ?? 500, "This answer is too long.");
    if (f.required && f.type !== "select") s = (s as z.ZodString).min(1, "This field is required.");
    if (!f.required) s = z.union([s, z.literal("")]).optional().transform((v) => v ?? "");
    shape[f.name] = s;
  }
  return z.object(shape);
}

/** Human-readable label of a stored value (for admin views and emails). */
export function displayValue(def: FormDef, field: string, value: unknown): string {
  const f = def.fields.find((x) => x.name === field);
  if (f?.type === "select") return f.options?.find((o) => o.value === value)?.label.en ?? String(value ?? "");
  return String(value ?? "");
}
