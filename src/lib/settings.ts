import "server-only";
import { db } from "@/lib/db";
import { settingsSchemas, type AllSettings, type Settings, type SettingsKey } from "./settings-schema";

export async function getSetting<K extends SettingsKey>(key: K): Promise<Settings<K>> {
  const row = await db.setting.findUnique({ where: { key } });
  const parsed = settingsSchemas[key].safeParse(row?.value ?? {});
  // Fall back to defaults if a stored document is somehow invalid.
  return (parsed.success ? parsed.data : settingsSchemas[key].parse({})) as Settings<K>;
}

export async function getAllSettings(): Promise<AllSettings> {
  const rows = await db.setting.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const out = {} as Record<string, unknown>;
  for (const key of Object.keys(settingsSchemas) as SettingsKey[]) {
    const parsed = settingsSchemas[key].safeParse(byKey.get(key) ?? {});
    out[key] = parsed.success ? parsed.data : settingsSchemas[key].parse({});
  }
  return out as AllSettings;
}

export async function saveSetting<K extends SettingsKey>(key: K, value: unknown): Promise<Settings<K>> {
  const data = settingsSchemas[key].parse(value) as Settings<K>;
  await db.setting.upsert({
    where: { key },
    create: { key, value: data as object },
    update: { value: data as object },
  });
  return data;
}
