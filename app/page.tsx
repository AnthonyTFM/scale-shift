import Link from "next/link";
import { MapApp } from "@/components/map/MapApp";
import { JsonLd, SiteFooter } from "@/components/SiteChrome";
import { comparisons } from "@/content/comparisons";
import { featuredGroups } from "@/content/featured";
import { site } from "@/content/site";
import { getEntity, getIndex } from "@/lib/data-server";
import { formatKm2, peakOf, yearLabel } from "@/lib/format";

export default function Home() {
  const ix = getIndex();
  const empires = featuredGroups
    .flatMap((g) => g.ids)
    .map((id) => getEntity(id))
    .filter((e) => e && e.k !== "s")
    .slice(0, 12);

  return (
    <>
      <MapApp variant="full" />

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="why">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr]">
          <div className="prose-atlas">
            <h2 id="why" className="!mt-0">
              Why the map lies about size
            </h2>
            <p>
              Most web maps use the Mercator projection. It keeps angles true for navigation, but it stretches everything as you move away from
              the equator. At 60° north, land is drawn four times too large. Greenland looks like Africa; Africa is fourteen times bigger.
            </p>
            <p>
              Scale Shift rotates each shape across the globe before drawing it, so its real area never changes. Drag Russia to the equator and
              it shrinks to its honest size. Slide the timeline and the same tool works for {ix.years.length} maps of the world, from 1 BC to
              today.
            </p>
            <p>
              <Link href="/about">How the maps and measurements work</Link>
            </p>
          </div>
          <div>
            <h2 className="font-display text-[1.85rem] leading-tight">Popular comparisons</h2>
            <ul className="mt-3 divide-y divide-paper-3 border-y border-paper-3">
              {comparisons.slice(0, 6).map((c) => (
                <li key={c.slug}>
                  <Link href={`/compare/${c.slug}`} className="flex items-center justify-between gap-3 py-3 font-bold hover:underline">
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/compare" className="mt-3 inline-block text-sm font-bold underline underline-offset-4">
              All {comparisons.length} comparisons
            </Link>
          </div>
        </div>

        <h2 className="font-display mt-14 text-[1.85rem] leading-tight">Empires at their largest</h2>
        <ul className="mt-4 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          {empires.map((e) => {
            const peak = peakOf(e!, ix.years);
            return (
              <li key={e!.i} className="border-b border-paper-3">
                <Link href={`/history/${e!.i}`} className="flex items-baseline justify-between gap-3 py-3 hover:underline">
                  <span className="font-bold">{e!.n}</span>
                  <span className="shrink-0 text-sm text-ink-soft">
                    {formatKm2(peak.area)}, {yearLabel(peak.year)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <Link href="/history" className="mt-3 inline-block text-sm font-bold underline underline-offset-4">
          Browse every empire timeline
        </Link>
      </section>

      <SiteFooter />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: site.name,
          url: site.url,
          description: site.description,
          applicationCategory: "EducationalApplication",
          operatingSystem: "Any",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }}
      />
    </>
  );
}
