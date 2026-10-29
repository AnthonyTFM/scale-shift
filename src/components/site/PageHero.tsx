import Link from "next/link";
import { SpaceGlobe } from "./SpaceGlobe";

type Crumb = { href: string; label: string };

/**
 * `center` lines the heading up with a centered column below it (the daily challenge).
 * `compact` keeps the hero short on every screen so what's below it (a game) starts on the first screen, laptops included.
 * `game` (above a game) also folds it away on phones held sideways, for screen readers only, so the game fits the screen.
 *
 * Deep space with stars behind the title (see .space-sky in globals.css). A full header also has the Earth: spinning on
 * the right on wide screens, and on phones and tablets its curve along the bottom (a still picture, so phones load no
 * globe code). A compact one (above a game) is just the stars, so the game still starts on the first screen.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  crumbs,
  center,
  compact,
  game,
}: {
  eyebrow?: string;
  title: string;
  lead?: React.ReactNode;
  crumbs?: Crumb[];
  center?: boolean;
  compact?: boolean;
  game?: boolean;
}) {
  return (
    <section
      className={`space-sky space-hero relative overflow-hidden border-b border-[#0a1033] text-white ${game ? "[@media(max-height:500px)]:sr-only" : ""}`}
    >
      <div aria-hidden="true" className="space-stars" />
      <div aria-hidden="true" className="space-stars-bright" />
      {compact ? null : (
        <>
          {/* phones and tablets: the Earth's curve along the bottom edge */}
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-[1240px] left-1/2 w-[1320px] -translate-x-1/2 lg:hidden">
            <div className="absolute inset-[1.7%] rounded-full bg-[radial-gradient(circle_at_50%_0%,#f1f8ff,#a9d3f0_30%)] shadow-[0_0_40px_12px_rgba(96,165,250,0.55)]" />
            {/* eslint-disable-next-line @next/next/no-img-element -- a fixed decorative SVG, nothing to optimise */}
            <img src="/globe-still.svg" alt="" width={480} height={480} decoding="async" className="relative h-auto w-full" />
          </div>
          <SpaceGlobe />
        </>
      )}
      <div
        className={`relative mx-auto max-w-6xl px-4 ${compact ? "pb-4 pt-3 md:pb-6 md:pt-6" : "pb-24 pt-8 md:pt-12 lg:pb-14"} ${center ? "text-center" : ""}`}
      >
        {crumbs ? (
          <nav aria-label="Breadcrumb" className="mb-2 text-sm text-[#dbeafe]">
            <ol className="flex flex-wrap gap-1">
              {crumbs.map((c, i) => (
                <li key={c.href} className="flex items-center gap-1">
                  {i > 0 ? <span aria-hidden="true">/</span> : null}
                  {i < crumbs.length - 1 ? (
                    <Link href={c.href} className="inline-flex min-h-11 items-center font-medium text-[#93c5fd] hover:underline">
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
        {eyebrow ? <p className="text-sm font-bold uppercase tracking-wide text-[#93c5fd]">{eyebrow}</p> : null}
        <h1 className={`mt-1 max-w-3xl font-display ${center ? "mx-auto" : ""} text-3xl leading-tight text-white md:text-[2.5rem]`}>{title}</h1>
        {lead ? (
          <div
            className={`leading-relaxed text-[#dbeafe] ${compact ? "mt-1.5 max-w-3xl text-base md:mt-2" : "mt-4 max-w-2xl text-lg"} ${center ? "mx-auto" : ""} ${game ? "max-sm:hidden" : ""}`}
          >
            {lead}
          </div>
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
