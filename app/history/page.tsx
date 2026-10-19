import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, PageShell } from "@/components/SiteChrome";
import { featuredGroups } from "@/content/featured";
import { site } from "@/content/site";
import { getEntity, getIndex } from "@/lib/data-server";
import { formatKm2, peakOf, spanLabel, yearLabel } from "@/lib/format";

export const metadata: Metadata = {
  title: "Empire timelines: how big each empire really was",
  description:
    "Area-over-time timelines for the Roman, Mongol, Ottoman, Qing, British and 50 more empires and countries, from 1 BC to today, measured at true size.",
  alternates: { canonical: "/history" },
};

export default function HistoryIndex() {
  const ix = getIndex();
  return (
    <PageShell>
      <h1 className="font-display text-[2.6rem] leading-[1.05] sm:text-[3.4rem]">Empire timelines</h1>
      <p className="mt-3 max-w-[60ch] text-lg text-ink-soft">
        How large each power really was at every snapshot it appears in, measured on the globe rather than on a stretched flat map.
      </p>

      {featuredGroups.map((g) => {
        const items = g.ids.map((id) => getEntity(id)).filter(Boolean);
        if (!items.length) return null;
        return (
          <section key={g.era} className="mt-12" aria-labelledby={`era-${g.era}`}>
            <h2 id={`era-${g.era}`} className="font-display text-[1.9rem]">
              {g.era}
            </h2>
            <ul className="mt-3 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((e) => {
                const peak = peakOf(e!, ix.years);
                return (
                  <li key={e!.i} className="border-b border-paper-3">
                    <Link href={`/history/${e!.i}`} className="block py-3 hover:underline">
                      <span className="block font-bold">{e!.n}</span>
                      <span className="block text-sm text-ink-soft">
                        Largest {formatKm2(peak.area)} in {yearLabel(peak.year)}. Mapped {spanLabel(e!, ix.years)}.
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Empire timelines",
          url: `${site.url}/history`,
        }}
      />
    </PageShell>
  );
}
