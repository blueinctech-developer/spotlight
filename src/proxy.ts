import { NextResponse, type NextRequest } from "next/server";

/**
 * Public URLs match the WordPress site: English at "/about/", French at "/fr/about/".
 * Internally every public page lives under app/(site)/[lang]/, so English requests are
 * rewritten to "/en/...". Direct "/en/..." URLs are redirected to avoid duplicate content.
 *
 * Admin routes get an optimistic cookie check; real authorization happens on the server
 * in every page, action and route handler.
 */
const SESSION_COOKIES = ["__Host-snf_session", "snf_session"];
const PUBLIC_ADMIN = ["/admin/login", "/admin/setup", "/admin/reset-password"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const isPublic = PUBLIC_ADMIN.some((p) => pathname === p || pathname.startsWith(p + "/"));
    const hasCookie = SESSION_COOKIES.some((c) => request.cookies.has(c));
    if (!isPublic && !hasCookie) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login/";
      url.search = pathname === "/admin/" ? "" : `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // WordPress search URLs (/?s=…, /fr/?s=…) → the site search page.
  const wpSearch = request.nextUrl.searchParams.get("s");
  if (wpSearch !== null && (pathname === "/" || pathname === "/fr" || pathname === "/fr/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith("/fr") ? "/fr/search/" : "/search/";
    url.search = wpSearch ? `?q=${encodeURIComponent(wpSearch.slice(0, 100))}` : "";
    return NextResponse.redirect(url, 301);
  }

  // Slugs are lowercase; an uppercase variant would otherwise be a duplicate page.
  // (Checked on the decoded path: percent-escapes such as %C3%A9 are uppercase by convention.)
  let decodedPath = pathname;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    /* malformed escape: leave as is */
  }
  if (/[A-Z]/.test(decodedPath)) {
    const url = request.nextUrl.clone();
    url.pathname = decodedPath.toLowerCase();
    return NextResponse.redirect(url, 301);
  }

  // Internal WordPress theme templates and the empty default category: gone for good.
  if (/^(\/fr)?\/(hf_template\/|category\/uncategorized\/?$)/.test(pathname)) {
    return new NextResponse("Gone", { status: 410, headers: { "X-Robots-Tag": "noindex" } });
  }

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 301);
  }

  if (pathname === "/fr" || pathname.startsWith("/fr/")) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/en${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip Next internals, API, media files, metadata routes and static files.
  matcher: [
    "/((?!_next/|api/|media/|brand/|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|txt|xml|pdf|woff2?)$).*)",
  ],
};
