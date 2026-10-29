import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Spotlight CMS", template: "%s · Spotlight CMS" },
  robots: { index: false, follow: false },
  icons: { icon: "/brand/favicon.png" },
};

// The CMS is always rendered per request (it depends on the signed-in user).
export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-zinc-50 font-[family-name:var(--font-inter)] text-zinc-900 antialiased">
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
