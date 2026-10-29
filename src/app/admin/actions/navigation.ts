"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { adminAction, revalidatePublic, UserError } from "@/lib/admin/action";
import { audit } from "@/lib/audit";
import { safeHref } from "@/lib/sanitize";
import { MENU_LOCATIONS } from "@/components/admin/navigation/locations";


const itemSchema = z.object({
  key: z.string().max(64),
  parentKey: z.string().max(64).nullable(),
  label: z.string().trim().min(1, "Every item needs a label.").max(120),
  url: z.string().trim().max(2000).nullable(),
  pageGroup: z.string().max(100).nullable(),
  openInNewTab: z.boolean(),
  visible: z.boolean(),
});
export type MenuItemInput = z.infer<typeof itemSchema>;

const saveSchema = z.object({
  location: z.enum(MENU_LOCATIONS),
  locale: z.enum(["en", "fr"]),
  name: z.string().trim().min(1, "Give the menu a name.").max(120),
  items: z.array(itemSchema).max(100),
});

/** Replace a whole menu (name + item tree) in one transaction. */
export const saveMenu = adminAction("menus.manage", saveSchema, async ({ location, locale, name, items }, user) => {
  const keys = new Set(items.map((i) => i.key));
  for (const it of items) {
    if (it.parentKey && !keys.has(it.parentKey)) throw new UserError(`"${it.label}" points to a missing parent item.`);
    if (it.parentKey && items.find((p) => p.key === it.parentKey)?.parentKey) throw new UserError("Menus support one level of dropdown items.");
    if (!it.pageGroup) {
      const url = (it.url ?? "").trim();
      if (url !== "#" && safeHref(url) === "#") throw new UserError(`"${it.label}": enter a path like /about/ or a full https:// link.`);
    }
  }
  const groups = items.map((i) => i.pageGroup).filter((g): g is string => !!g);
  if (groups.length) {
    const found = await db.page.findMany({ where: { translationGroup: { in: groups } }, select: { translationGroup: true } });
    const ok = new Set(found.map((f) => f.translationGroup));
    const bad = items.find((i) => i.pageGroup && !ok.has(i.pageGroup));
    if (bad) throw new UserError(`"${bad.label}" links to a page that no longer exists.`);
  }

  await db.$transaction(async (tx) => {
    const menu = await tx.menu.upsert({
      where: { location_locale: { location, locale } },
      create: { location, locale, name },
      update: { name },
    });
    await tx.menuItem.deleteMany({ where: { menuId: menu.id } });
    const idByKey = new Map<string, string>();
    const ordered = [...items.filter((i) => !i.parentKey), ...items.filter((i) => i.parentKey)];
    const orderIn = new Map<string | null, number>();
    for (const it of ordered) {
      const parentId = it.parentKey ? idByKey.get(it.parentKey) ?? null : null;
      const order = orderIn.get(it.parentKey) ?? 0;
      orderIn.set(it.parentKey, order + 1);
      const row = await tx.menuItem.create({
        data: {
          menuId: menu.id,
          parentId,
          label: it.label,
          url: it.pageGroup ? null : (it.url ?? "#").trim() || "#",
          pageGroup: it.pageGroup,
          order,
          openInNewTab: it.openInNewTab,
          visible: it.visible,
        },
      });
      idByKey.set(it.key, row.id);
    }
  });
  await audit({ userId: user.id, action: "menu.save", entityType: "MENU", entityId: `${location}:${locale}`, summary: `Updated menu "${name}" (${location}, ${locale.toUpperCase()})`, meta: { items: items.length } });
  revalidatePublic();
  return { saved: items.length };
});

/** Load a menu as a flat, ordered list (parents followed by their children). */
export const loadMenu = adminAction(
  "menus.manage",
  z.object({ location: z.enum(MENU_LOCATIONS), locale: z.enum(["en", "fr"]) }),
  async ({ location, locale }) => {
    const menu = await db.menu.findUnique({
      where: { location_locale: { location, locale } },
      include: { items: { orderBy: { order: "asc" } } },
    });
    if (!menu) return { name: "", items: [] as MenuItemInput[] };
    const roots = menu.items.filter((i) => !i.parentId);
    const out: MenuItemInput[] = [];
    for (const r of roots) {
      out.push({ key: r.id, parentKey: null, label: r.label, url: r.url, pageGroup: r.pageGroup, openInNewTab: r.openInNewTab, visible: r.visible });
      for (const c of menu.items.filter((i) => i.parentId === r.id)) {
        out.push({ key: c.id, parentKey: r.id, label: c.label, url: c.url, pageGroup: c.pageGroup, openInNewTab: c.openInNewTab, visible: c.visible });
      }
    }
    return { name: menu.name, items: out };
  },
);
