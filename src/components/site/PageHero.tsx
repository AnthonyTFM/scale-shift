import Link from "next/link";
import { preload } from "react-dom";

type Crumb = { href: string; label: string };

/**
 * `center` lines the heading up with a centered column below it (the daily challenge).
 * `compact` keeps the hero short on phones so what's below it (a game) starts on the first screen.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  crumbs,
  center,
  compact,
}: {
  eyebrow?: string;
  title: string;
  lead?: React.ReactNode;
  crumbs?: Crumb[];
  center?: boolean;
  compact?: boolean;
}) {
  // the band's world map (a CSS background) is the largest thing on the first screen: fetch it before the CSS arrives
  preload("/world.svg", { as: "image", fetchPriority: "high" });
  return (
    <section className="ocean-band text-panel-text">
      <div className={`mx-auto max-w-6xl px-4 ${compact ? "pb-4 pt-3" : "pb-10 pt-8"} md:pb-14 md:pt-12 ${center ? "text-center" : ""}`}>
        {crumbs ? (
          <nav aria-label="Breadcrumb" className="mb-4 text-sm text-panel-muted">
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
        {eyebrow ? <p className="text-sm font-semibold uppercase tracking-wide text-accent">{eyebrow}</p> : null}
        <h1 className={`mt-1 max-w-3xl font-display ${center ? "mx-auto" : ""} ${compact ? "text-3xl" : "text-4xl"} leading-tight text-white md:text-5xl`}>{title}</h1>
        {lead ? (
          <div className={`max-w-2xl leading-relaxed text-panel-muted ${compact ? "mt-1.5 text-base md:mt-4 md:text-lg" : "mt-4 text-lg"} ${center ? "mx-auto" : ""}`}>{lead}</div>
        ) : null}
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
