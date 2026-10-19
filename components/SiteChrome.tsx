import Link from "next/link";
import { site } from "@/content/site";
import { LeadForm } from "./LeadForm";

export function SiteHeader() {
  return (
    <header className="border-b border-paper-3 bg-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 sm:px-6">
        <Link href="/" className="font-display text-[1.7rem] leading-none">
          {site.name}
        </Link>
        <nav aria-label="Main" className="-mx-3 flex flex-wrap items-center">
          {site.nav.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3 py-2.5 text-sm font-bold text-ink-soft hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <Link href="/" className="btn btn-accent ml-auto max-sm:hidden">
          Open the map
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-ink text-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="font-display text-3xl">{site.name}</p>
          <p className="mt-2 max-w-md text-paper/80">{site.footer.blurb}</p>
          <nav aria-label="Footer" className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {site.nav.map((n) => (
              <Link key={n.href} href={n.href} className="underline-offset-4 hover:underline">
                {n.label}
              </Link>
            ))}
          </nav>
          <p className="mt-6 max-w-md text-xs text-paper/60">{site.footer.credit}</p>
        </div>
        <div>
          <h2 className="font-display text-2xl">{site.updatesForm.title}</h2>
          <p className="mb-3 mt-1 text-sm text-paper/80">{site.updatesForm.body}</p>
          <LeadForm kind="updates" buttonLabel={site.updatesForm.button} successText={site.updatesForm.success} tone="dark" />
        </div>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
