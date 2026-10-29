"use server";

import { z } from "zod";
import { adminAction, revalidatePublic, UserError } from "@/lib/admin/action";
import { audit } from "@/lib/audit";
import { saveSetting } from "@/lib/settings";
import { settingsSchemas, type SettingsKey } from "@/lib/settings-schema";
import { syncMediaUsage } from "@/lib/media/usage";
import { getAllSettings } from "@/lib/settings";

const KEYS = Object.keys(settingsSchemas) as [SettingsKey, ...SettingsKey[]];

/** Validate and save one settings group. Field errors use dotted paths (e.g. "tagline.fr"). */
export const saveSettingsGroup = adminAction(
  "settings.manage",
  z.object({ key: z.enum(KEYS), value: z.record(z.string(), z.unknown()) }),
  async ({ key, value }, user) => {
    const parsed = settingsSchemas[key].safeParse(value);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
      throw new UserError("Some values are not valid. Check the highlighted fields.", fieldErrors);
    }
    const saved = await saveSetting(key, parsed.data);
    if (key === "general" || key === "seo") {
      const all = await getAllSettings();
      await syncMediaUsage("SETTINGS", "site", "Site settings", [all.general.logoId, all.general.faviconId, all.seo.ogImageId]);
    }
    await audit({ userId: user.id, action: "settings.update", entityType: "SETTINGS", entityId: key, summary: `Updated ${key} settings` });
    revalidatePublic();
    return saved;
  },
);
