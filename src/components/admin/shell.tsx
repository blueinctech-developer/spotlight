"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity, ArrowUpRight, CalendarDays, ChevronsUpDown, FileText, Handshake, Image as ImageIcon, Inbox, LayoutDashboard,
  LogOut, Menu as MenuIcon, MessageSquareQuote, Mic2, Navigation, Newspaper, Settings, Shuffle, Users, X,
} from "lucide-react";
import { logout } from "@/app/admin/actions/auth";
import { cn, DropdownContent, DropdownItem, DropdownMenu, DropdownSeparator, DropdownTrigger } from "./ui";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";

const ICONS = {
  dashboard: LayoutDashboard, pages: FileText, posts: Newspaper, media: ImageIcon, navigation: Navigation,
  events: CalendarDays, speakers: Mic2, partners: Handshake, testimonials: MessageSquareQuote, submissions: Inbox,
  settings: Settings, redirects: Shuffle, users: Users, activity: Activity,
} as const;

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number };
export type NavSection = { title?: string; items: NavItem[] };

export function AdminShell({ user, sections, children }: { user: SessionUser; sections: NavSection[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <nav aria-label="CMS" className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {sections.map((s, i) => (
        <div key={i}>
          {s.title && <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">{s.title}</p>}
          <ul className="space-y-0.5">
            {s.items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = item.href === "/admin/" ? pathname === "/admin" || pathname === "/admin/" : pathname.startsWith(item.href.replace(/\/$/, ""));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] font-medium transition-colors",
                      active ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200" : "text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900",
                    )}
                  >
                    <Icon className={cn("size-4", active ? "text-brand" : "text-zinc-500")} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className="rounded-full bg-brand px-1.5 text-[11px] font-semibold leading-[18px] text-white">{item.badge}</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const brand = (
    <div className="flex h-14 items-center gap-2 border-b border-zinc-200/70 px-5">
      <Image src="/brand/logo.png" alt="Spotlight Nigeria" width={104} height={29} />
      <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">CMS</span>
    </div>
  );

  const userMenu = (
    <DropdownMenu>
      <DropdownTrigger className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-zinc-200/50">
        <span className="flex size-8 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand-800">
          {user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-zinc-900">{user.name}</span>
          <span className="block truncate text-xs text-zinc-600">{ROLE_LABELS[user.role]}</span>
        </span>
        <ChevronsUpDown className="size-4 text-zinc-500" />
      </DropdownTrigger>
      <DropdownContent align="start" side="top" className="w-56">
        <div className="px-2.5 py-1.5 text-xs text-zinc-500">{user.email}</div>
        <DropdownSeparator />
        <DropdownItem asChild>
          <Link href="/admin/account/"><Settings /> Account & password</Link>
        </DropdownItem>
        <DropdownItem asChild>
          <a href="/" target="_blank" rel="noreferrer"><ArrowUpRight /> View website</a>
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem onSelect={() => void logout()}>
          <LogOut /> Sign out
        </DropdownItem>
      </DropdownContent>
    </DropdownMenu>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-zinc-200 bg-zinc-100/60 lg:flex">
        {brand}
        {nav}
        <div className="border-t border-zinc-200/70 p-3">{userMenu}</div>
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:hidden">
        <button type="button" onClick={() => setMobileOpen(true)} className="rounded-md p-1.5 hover:bg-zinc-100" aria-label="Open navigation">
          <MenuIcon className="size-5" />
        </button>
        <Image src="/brand/logo.png" alt="Spotlight Nigeria" width={96} height={27} />
        <a href="/" target="_blank" rel="noreferrer" className="text-sm text-zinc-500">Site</a>
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-zinc-950/40" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-zinc-50 shadow-xl">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button type="button" onClick={() => setMobileOpen(false)} className="rounded-md p-1.5 hover:bg-zinc-200" aria-label="Close navigation">
                <X className="size-5" />
              </button>
            </div>
            {nav}
            <div className="border-t border-zinc-200 p-3">{userMenu}</div>
          </aside>
        </div>
      )}

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-[1240px]">{children}</div>
      </main>
    </div>
  );
}
