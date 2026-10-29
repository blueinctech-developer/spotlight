import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { MenuManager, type MenuData, type PageOption } from "@/components/admin/navigation/menu-manager";
import { MENU_LOCATIONS } from "@/components/admin/navigation/locations";

export const metadata = { title: "Navigation" };

export default async function NavigationPage() {
  await requireUser("menus.manage");
  const [menus, pages] = await Promise.all([
    db.menu.findMany({ include: { items: { orderBy: { order: "asc" } } } }),
    db.page.findMany({
      where: { deletedAt: null },
      orderBy: [{ path: "asc" }],
      select: { translationGroup: true, locale: true, title: true, path: true, status: true },
    }),
  ]);

  const data: MenuData[] = [];
  for (const locale of ["en", "fr"] as const) {
    for (const location of MENU_LOCATIONS) {
      const menu = menus.find((m) => m.location === location && m.locale === locale);
      const items = menu?.items ?? [];
      const roots = items.filter((i) => !i.parentId);
      const flat = roots.flatMap((r) => [r, ...items.filter((c) => c.parentId === r.id)]);
      data.push({
        location,
        locale,
        name: menu?.name ?? "",
        items: flat.map((i) => ({
          key: i.id, parentKey: i.parentId, label: i.label, url: i.url, pageGroup: i.pageGroup, openInNewTab: i.openInNewTab, visible: i.visible,
        })),
      });
    }
  }
  const pageOptions: PageOption[] = pages.map((p) => ({ group: p.translationGroup, locale: p.locale, title: p.title, path: p.path, status: p.status }));

  return (
    <>
      <PageHeader title="Navigation" description="Header and footer menus for each language. Changes appear on the website as soon as you save." />
      <MenuManager menus={data} pages={pageOptions} />
    </>
  );
}
