import type { Metadata } from "next";
import Link from "next/link";
import { sizes as t } from "@/content/sizes";
import { formatArea } from "@/lib/format";
import { sizeCountries, timesText } from "@/lib/sizes";
import { PageHero } from "@/components/site/PageHero";

export const metadata: Metadata = {
  title: "How big is every country, really? Real sizes vs the map",
  description: t.index.lead.slice(0, 155),
  alternates: { canonical: "/size" },
};

const az = [...sizeCountries].sort((a, b) => a.n.localeCompare(b.n, "en"));
const mostStretched = [...sizeCountries].sort((a, b) => b.stretch - a.stretch).slice(0, 8);

export default function SizeIndex() {
  return (
    <>
      <PageHero eyebrow={t.index.eyebrow} title={t.index.title} lead={<p>{t.index.lead}</p>} compact />
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <h2 className="font-display text-2xl text-ink md:text-3xl">{t.index.mostTitle}</h2>
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {mostStretched.map((c) => (
            <li key={c.slug}>
              <Link href={`/size/${c.slug}`} className="press-card flex h-full flex-col rounded-card px-4 py-3 hover:border-primary">
                <span className="font-semibold text-ink">{c.n}</span>
                <span className="text-sm text-ink-soft">{timesText(c.stretch)}× too big on a normal map</span>
              </Link>
            </li>
          ))}
        </ul>
        <h2 className="mt-12 font-display text-2xl text-ink md:text-3xl">{t.index.allTitle}</h2>
        <ul className="card mt-4 grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3">
          {az.map((c) => (
            <li key={c.slug} className="sm:border-b sm:border-line">
              <Link href={`/size/${c.slug}`} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2 hover:bg-paper">
                <span className="font-semibold text-ink">{c.n}</span>
                <span className="shrink-0 text-sm tabular-nums text-ink-soft">{formatArea(c.a, "km2")}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
