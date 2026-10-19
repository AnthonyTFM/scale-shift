import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MapApp } from "@/components/map/MapApp";
import { JsonLd, PageShell } from "@/components/SiteChrome";
import { comparisons, getComparison, type Comparison } from "@/content/comparisons";
import { site } from "@/content/site";
import { centreAt, getEntity, getIndex } from "@/lib/data-server";
import { formatKm2, formatMi2, formatRatio, yearLabel, areaAt } from "@/lib/format";
import { mercatorInflation } from "@/lib/geo";
import { encodeState } from "@/lib/state";

export function generateStaticParams() {
  return comparisons.map((c) => ({ slug: c.slug }));
}

function facts(c: Comparison) {
  const ix = getIndex();
  const ea = getEntity(c.a.id);
  const eb = getEntity(c.b.id);
  if (!ea || !eb) return null;
  const areaA = areaAt(ea, ix.years, c.a.year) ?? 0;
  const areaB = areaAt(eb, ix.years, c.b.year) ?? 0;
  const ca = centreAt(c.a.id, c.a.year);
  const cb = centreAt(c.b.id, c.b.year);
  const nameA = c.a.year === c.b.year ? ea.n : `${ea.n} (${yearLabel(c.a.year)})`;
  const nameB = c.a.year === c.b.year ? eb.n : `${eb.n} (${yearLabel(c.b.year)})`;
  return {
    ea,
    eb,
    nameA,
    nameB,
    areaA,
    areaB,
    inflA: ca ? mercatorInflation(ca[1]) : 1,
    inflB: cb ? mercatorInflation(cb[1]) : 1,
  };
}

function mapQuery(c: Comparison) {
  return encodeState({
    year: c.year,
    overlays: [c.a, c.b].map((s, i) => ({
      uid: String(i),
      id: s.id,
      year: s.year,
      follow: s.year === c.year,
      pos: s.at ?? null,
      rot: 0,
      color: i,
    })),
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) return {};
  const f = facts(c);
  const desc = f
    ? `${f.nameA}: ${formatKm2(f.areaA)}. ${f.nameB}: ${formatKm2(f.areaB)}. ${c.intro}`
    : c.intro;
  return {
    title: `${c.title}: true size comparison`,
    description: desc.slice(0, 300),
    alternates: { canonical: `/compare/${slug}` },
    openGraph: { title: `${c.title} at true size`, description: desc.slice(0, 300) },
  };
}

async function CompareContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) notFound();
  const f = facts(c);
  if (!f) notFound();
  const bigger = f.areaA >= f.areaB ? f.nameA : f.nameB;
  const smaller = f.areaA >= f.areaB ? f.nameB : f.nameA;
  const ratio = Math.max(f.areaA, f.areaB) / Math.max(1, Math.min(f.areaA, f.areaB));
  const query = mapQuery(c);
  const start = {
    year: c.year,
    overlays: [c.a, c.b].map((s) => ({ id: s.id, year: s.year, at: s.at, follow: s.year === c.year })),
  };

  const faq = [
    {
      q: `Which is bigger, ${f.nameA} or ${f.nameB}?`,
      a: `${bigger} is bigger: about ${formatRatio(ratio)} the area of ${smaller}. ${f.nameA} covers ${formatKm2(f.areaA)} and ${f.nameB} covers ${formatKm2(f.areaB)}.`,
    },
    {
      q: `Why do they look a different size on most maps?`,
      a: `Web maps use the Mercator projection, which inflates area away from the equator. Where ${f.nameA} really sits, the map draws it ${f.inflA.toFixed(1)}× larger than it would at the equator. For ${f.nameB} the factor is ${f.inflB.toFixed(1)}×.`,
    },
    {
      q: "How are these areas measured?",
      a: "We measure each outline on a sphere the size of the Earth, not on the flat map, so the figure stays the same wherever you drag the shape. Historical borders are approximate.",
    },
  ];

  const others = comparisons.filter((o) => o.slug !== c.slug).slice(0, 6);

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-ink-soft">
        <Link href="/compare" className="underline underline-offset-4">
          Comparisons
        </Link>
      </nav>
      <h1 className="font-display mt-2 text-[2.4rem] leading-[1.05] sm:text-[3.2rem]">{c.title}</h1>
      <p className="mt-2 max-w-[62ch] text-lg text-ink-soft">{c.intro}</p>

      <div className="mt-6">
        <MapApp variant="embed" start={start} fullMapHref={`/?${query}`} />
      </div>

      <div className="mt-10 grid gap-10 md:grid-cols-[1fr_1.2fr]">
        <section aria-labelledby="numbers">
          <h2 id="numbers" className="font-display text-[1.8rem]">
            The numbers
          </h2>
          <dl className="mt-3 divide-y divide-paper-3 border-y border-paper-3">
            <div className="py-3">
              <dt className="font-bold">{f.nameA}</dt>
              <dd>
                {formatKm2(f.areaA)} <span className="text-ink-soft">({formatMi2(f.areaA)})</span>
              </dd>
            </div>
            <div className="py-3">
              <dt className="font-bold">{f.nameB}</dt>
              <dd>
                {formatKm2(f.areaB)} <span className="text-ink-soft">({formatMi2(f.areaB)})</span>
              </dd>
            </div>
            <div className="py-3">
              <dt className="font-bold">Difference</dt>
              <dd>
                {bigger} is {formatRatio(ratio)} the size of {smaller}.
              </dd>
            </div>
          </dl>
        </section>
        <section aria-labelledby="faq" className="prose-atlas">
          <h2 id="faq" className="!mt-0">
            Questions
          </h2>
          {faq.map((item) => (
            <div key={item.q}>
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </div>
          ))}
        </section>
      </div>

      <section className="mt-12" aria-labelledby="more">
        <h2 id="more" className="font-display text-[1.8rem]">
          More comparisons
        </h2>
        <ul className="mt-3 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((o) => (
            <li key={o.slug} className="border-b border-paper-3">
              <Link href={`/compare/${o.slug}`} className="block py-3 font-bold hover:underline">
                {o.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          url: `${site.url}/compare/${c.slug}`,
          mainEntity: faq.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }}
      />
    </>
  );
}

/** The header and footer render instantly on navigation; the content streams in (and is prerendered at build). */
export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <PageShell>
      <Suspense fallback={<div className="min-h-[70vh]" aria-busy="true" />}>
        <CompareContent params={params} />
      </Suspense>
    </PageShell>
  );
}
