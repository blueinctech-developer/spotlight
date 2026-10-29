import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus_Jakarta_Sans, Urbanist } from "next/font/google";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getAutosave } from "@/lib/admin/revisions";
import { blocksFrom, loadBlockData } from "@/lib/content/public";
import { getAllSettings } from "@/lib/settings";
import { localizePath, t, type Locale } from "@/lib/i18n";
import { SiteShell } from "@/components/site/site-shell";
import { Blocks } from "@/components/blocks/render";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-jakarta", display: "swap" });
const urbanist = Urbanist({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-urbanist", display: "swap" });

export const metadata = { title: "Preview", robots: { index: false, follow: false } };

/** Renders a page exactly as the public site would, including unpublished changes. */
export default async function PreviewPage(props: PageProps<"/admin/preview/page/[id]">) {
  const user = await requireUser("pages.manage");
  const { id } = await props.params;
  const sp = await props.searchParams;
  const page = await db.page.findUnique({ where: { id } });
  if (!page) notFound();

  let data: Record<string, unknown> = page as unknown as Record<string, unknown>;
  let source = "Saved version";
  if (sp.autosave) {
    const auto = await getAutosave("PAGE", page.id, user.id);
    if (auto && auto.createdAt >= page.updatedAt) {
      data = { ...data, ...(auto.data as Record<string, unknown>) };
      source = "Unsaved changes";
    }
  }
  const locale = page.locale as Locale;
  const blocks = blocksFrom(data.blocks);
  const [blockData, settings] = await Promise.all([loadBlockData(blocks, locale), getAllSettings()]);
  const title = String(data.title ?? page.title);
  const embed = Boolean(sp.embed);

  return (
    <div lang={locale} className={`${jakarta.variable} ${urbanist.variable} bg-white font-sans text-body`}>
      {!embed && (
        <div className="fixed inset-x-0 bottom-0 z-[70] flex items-center justify-center gap-3 bg-zinc-900/95 px-4 py-2 text-xs text-white">
          <span className="rounded bg-amber-400 px-1.5 py-0.5 font-semibold uppercase text-zinc-900">Preview</span>
          <span>{source} of “{title}” — not necessarily published.</span>
          <Link href={`/admin/pages/${page.id}/`} className="underline">Back to editor</Link>
        </div>
      )}
      <SiteShell locale={locale} headerVariant={String(data.headerVariant ?? page.headerVariant)} footerVariant={String(data.footerVariant ?? page.footerVariant)}>
        <Blocks
          blocks={blocks}
          ctx={{
            locale,
            data: blockData,
            social: settings.social,
            basePath: localizePath(page.path, locale),
            breadcrumb: page.path === "" ? [] : [{ label: t("home", locale), href: localizePath("/", locale) }, { label: title }],
          }}
        />
      </SiteShell>
    </div>
  );
}
