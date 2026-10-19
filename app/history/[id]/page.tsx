import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AreaChart } from "@/components/map/AreaChart";
import { JsonLd, PageShell } from "@/components/SiteChrome";
import { featuredIds } from "@/content/featured";
import { lineage, successorsOf } from "@/content/lineage";
import { site } from "@/content/site";
import { getEntity, getIndex, similarModern } from "@/lib/data-server";
import { KIND_LABEL, PRECISION_LABEL, formatKm2, formatMi2, peakOf, spanLabel, yearLabel, yearsOf } from "@/lib/format";

export function generateStaticParams() {
  return featuredIds.filter((id) => getEntity(id)).map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const e = getEntity(id);
  if (!e) return {};
  const ix = getIndex();
  const peak = peakOf(e, ix.years);
  return {
    title: `How big was the ${e.n}? True size from ${spanLabel(e, ix.years)}`,
    description: `The ${e.n} at its largest covered ${formatKm2(peak.area)} (${yearLabel(peak.year)}). See its area at every mapped year and drag it onto any modern country at true size.`,
    alternates: { canonical: `/history/${id}` },
  };
}

async function EntityContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = getEntity(id);
  if (!e) notFound();
  const ix = getIndex();
  const ys = yearsOf(e, ix.years);
  const peak = peakOf(e, ix.years);
  const similar = similarModern(peak.area, e.i);
  const todayIdx = ix.years.length - 1;
  const similarArea = similar ? similar.a[similar.y.indexOf(todayIdx)] : 0;
  const us = getEntity("united-states");
  const usArea = us ? us.a[us.y.indexOf(todayIdx)] : 0;
  const realm = getEntity(e.k === "r" ? e.i.replace(/-claims$/, "") : `${e.i}-claims`);
  const before = (lineage[e.i] ?? []).map(getEntity).filter(Boolean);
  const after = successorsOf(e.i).map(getEntity).filter(Boolean);
  const mapHref = `/?y=${peak.year}&o=${e.i}~${peak.year}~1~_~_~0`;
  const usHref = usArea && e.i !== "united-states" ? `/?y=2026&o=${e.i}~${peak.year}~0~-97.00~39.00~0!united-states~2026~1~_~_~0` : null;

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-ink-soft">
        <Link href="/history" className="underline underline-offset-4">
          Empire timelines
        </Link>
      </nav>
      <h1 className="font-display mt-2 text-[2.6rem] leading-[1.05] sm:text-[3.4rem]">{e.n}</h1>
      <p className="mt-1 text-ink-soft">{KIND_LABEL[e.k]}</p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="text-lg">
            {e.n} appears on {ys.length} of our {ix.years.length} world maps, {spanLabel(e, ix.years)}. At its largest, in{" "}
            {yearLabel(peak.year)}, it covered <strong>{formatKm2(peak.area)}</strong> ({formatMi2(peak.area)})
            {similar ? (
              <>
                , close to the size of {similar.n} today ({formatKm2(similarArea)})
              </>
            ) : null}
            {usArea ? <>, or {Math.round((peak.area / usArea) * 100)}% of the United States</> : null}.
          </p>
          <div className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-paper-3 sm:p-6">
            <h2 className="text-sm font-bold text-ink-soft">Area on each map</h2>
            <div className="mt-2">
              <AreaChart entity={e} years={ix.years} current={peak.year} width={640} height={240} large />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={mapHref} className="btn btn-primary">
              See it on the map in {yearLabel(peak.year)}
            </Link>
            {usHref && (
              <Link href={usHref} className="btn btn-ghost">
                Lay it over the United States
              </Link>
            )}
          </div>
        </div>

        <div>
          <h2 className="font-display text-[1.7rem]">Every snapshot</h2>
          <table className="mt-3 w-full text-left text-sm">
            <caption className="sr-only">
              Area of {e.n} by year
            </caption>
            <thead>
              <tr className="border-b border-paper-3 text-ink-soft">
                <th scope="col" className="py-2 font-bold">
                  Year
                </th>
                <th scope="col" className="py-2 text-right font-bold">
                  Area
                </th>
                <th scope="col" className="py-2 text-right font-bold">
                  vs peak
                </th>
              </tr>
            </thead>
            <tbody>
              {ys.map((y, j) => (
                <tr key={y} className="border-b border-paper-3">
                  <th scope="row" className="py-2 font-normal">
                    <Link href={`/?y=${y}&o=${e.i}~${y}~1~_~_~0`} className="underline-offset-4 hover:underline">
                      {yearLabel(y)}
                    </Link>
                  </th>
                  <td className="py-2 text-right tabular-nums">{formatKm2(e.a[j])}</td>
                  <td className="py-2 text-right tabular-nums text-ink-soft">{Math.round((e.a[j] / peak.area) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-sm text-ink-soft">{PRECISION_LABEL[e.q] ?? PRECISION_LABEL[1]} in the source data.</p>

          {realm && featuredIds.includes(realm.i) && (
            <p className="mt-4 text-sm">
              <Link href={`/history/${realm.i}`} className="font-bold underline underline-offset-4">
                {e.k === "r" ? `Core territory of ${realm.n}` : `${e.n} with everything it claimed`}
              </Link>
            </p>
          )}
          {before.length > 0 && (
            <div className="mt-6">
              <h2 className="font-bold">Came before</h2>
              <ul className="mt-1 flex flex-wrap gap-2 text-sm">
                {before.map((b) => (
                  <li key={b!.i}>
                    {featuredIds.includes(b!.i) ? (
                      <Link href={`/history/${b!.i}`} className="inline-block rounded-full bg-paper-2 px-3 py-1.5 hover:bg-paper-3">
                        {b!.n}
                      </Link>
                    ) : (
                      <Link href={`/?y=${yearsOf(b!, ix.years)[0]}&o=${b!.i}~${yearsOf(b!, ix.years)[0]}~1~_~_~0`} className="inline-block rounded-full bg-paper-2 px-3 py-1.5 hover:bg-paper-3">
                        {b!.n}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {after.length > 0 && (
            <div className="mt-6">
              <h2 className="font-bold">Lands now part of</h2>
              <ul className="mt-1 flex flex-wrap gap-2 text-sm">
                {after.map((b) => (
                  <li key={b!.i}>
                    <Link
                      href={featuredIds.includes(b!.i) ? `/history/${b!.i}` : `/?y=2026&o=${b!.i}~2026~1~_~_~0`}
                      className="inline-block rounded-full bg-paper-2 px-3 py-1.5 hover:bg-paper-3"
                    >
                      {b!.n}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `How big was the ${e.n}?`,
          url: `${site.url}/history/${e.i}`,
          about: { "@type": "Place", name: e.n },
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Empire timelines", item: `${site.url}/history` },
              { "@type": "ListItem", position: 2, name: e.n, item: `${site.url}/history/${e.i}` },
            ],
          },
        }}
      />
    </>
  );
}

/** The header and footer render instantly on navigation; the content streams in (and is prerendered at build). */
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PageShell>
      <Suspense fallback={<div className="min-h-[70vh]" aria-busy="true" />}>
        <EntityContent params={params} />
      </Suspense>
    </PageShell>
  );
}
