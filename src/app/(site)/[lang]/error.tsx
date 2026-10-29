"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="py-24 text-center">
      <div className="site-container">
        <h1 className="font-heading text-[34px] font-bold text-ink">Something went wrong</h1>
        <p className="mt-3">Une erreur est survenue. Please try again.</p>
        <div className="mt-8 flex justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary">Try again</button>
          <Link href="/" className="btn btn-outline">Home</Link>
        </div>
      </div>
    </section>
  );
}
