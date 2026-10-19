import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-force">404</p>
        <h1 className="mt-2 font-display text-4xl text-ink md:text-5xl">This page has been lost to history.</h1>
        <p className="mt-4 text-lg text-ink-soft">The link may be old, or the page may have moved. The map is still here.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/map" className="inline-flex h-12 items-center rounded-lg bg-accent px-5 font-bold text-panel hover:bg-accent-strong">
            Open the map
          </Link>
          <Link href="/eras" className="inline-flex h-12 items-center rounded-lg border border-line bg-white px-5 font-semibold hover:bg-paper">
            Browse eras
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
