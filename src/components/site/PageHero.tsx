import Link from "next/link";

type Crumb = { href: string; label: string };

export function PageHero({ eyebrow, title, lead, crumbs }: { eyebrow?: string; title: string; lead?: React.ReactNode; crumbs?: Crumb[] }) {
  return (
    <section className="border-b border-line bg-white">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 md:pb-14 md:pt-12">
        {crumbs ? (
          <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
            <ol className="flex flex-wrap gap-1">
              {crumbs.map((c, i) => (
                <li key={c.href} className="flex gap-1">
                  {i > 0 ? <span aria-hidden="true">/</span> : null}
                  {i < crumbs.length - 1 ? (
                    <Link href={c.href} className="hover:underline">
                      {c.label}
                    </Link>
                  ) : (
                    <span aria-current="page">{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        {eyebrow ? <p className="text-sm font-semibold uppercase tracking-wide text-force">{eyebrow}</p> : null}
        <h1 className="mt-1 max-w-3xl font-display text-4xl leading-tight text-ink md:text-5xl">{title}</h1>
        {lead ? <div className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">{lead}</div> : null}
      </div>
    </section>
  );
}

export function breadcrumbJsonLd(base: string, crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, item: new URL(c.href, base).toString() })),
  };
}

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
