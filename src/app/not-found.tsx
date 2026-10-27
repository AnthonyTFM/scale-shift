import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-primary">404</p>
        <h1 className="mt-2 font-display text-3xl text-ink md:text-[2.5rem]">This page has been lost to history.</h1>
        <p className="mt-4 text-lg text-ink-soft">The link may be old, or the page may have moved. The map is still here.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/map" className="btn btn-primary btn-lg">
            Open the map
          </Link>
          <Link href="/eras" className="btn btn-white btn-lg">
            Browse eras
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
