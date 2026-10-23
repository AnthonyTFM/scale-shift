import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site } from "@/content/site";
import { sizes as t } from "@/content/sizes";
import { eras, eraSlug } from "@/lib/eras";
import { capitalize, nameInSentence } from "@/lib/daily";
import { formatArea, KM2_PER_MI2 } from "@/lib/format";
import { mapUrl } from "@/lib/share";
import { ordinal, partnerFor, sameSize, sizeBySlug, sizeCountries, timesText, type SizeCountry } from "@/lib/sizes";
import { SizePicture } from "@/components/size/SizePicture";
import { breadcrumbJsonLd, JsonLd, PageHero } from "@/components/site/PageHero";

export function generateStaticParams() {
  return sizeCountries.map((c) => ({ slug: c.slug }));
}

// Every country is prerendered at build time, so the page is static HTML
export const instant = false;

const total = sizeCountries.length;
const name = (c: SizeCountry) => nameInSentence({ n: c.n, kind: "country" });
const Name = (c: SizeCountry) => capitalize(name(c));
/** "2.17 million km² (836,330 sq mi)" */
const areaWords = (a: number) =>
  `${a >= 1e6 ? `${(a / 1e6).toFixed(2)} million` : Math.round(a).toLocaleString("en-US")} km² (${Math.round(a / KM2_PER_MI2).toLocaleString("en-US")} sq mi)`;
/** "" for the largest, else "12th" */
const rankWord = (r: number) => (r === 1 ? "" : ordinal(r));
const latText = (lat: number) => `${Math.abs(Math.round(lat))}°${lat >= 0 ? "N" : "S"}`;
/** a web map draws it noticeably too big (the daily game's 15% line) */
const stretched = (c: SizeCountry) => c.stretch >= 1.15;

function pageFacts(c: SizeCountry) {
  const partner = partnerFor(c);
  const bigger = sizeCountries[c.rank - 2]; // the next country up, for "Is X bigger than Y?"
  return { partner, bigger: bigger && bigger.slug !== partner.slug ? bigger : null };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = sizeBySlug.get(slug);
  if (!c) return {};
  const { partner } = pageFacts(c);
  const stretchLine = stretched(c) ? `A normal web map draws it ${timesText(c.stretch)}× too big.` : "A normal web map shows it about the right size.";
  return {
    title: t.metaTitle(c.n, formatArea(c.a, "km2")),
    description: t.metaDescription(Name(c), areaWords(c.a), name(partner), stretchLine),
    alternates: { canonical: `/size/${c.slug}` },
  };
}

export default async function SizePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = sizeBySlug.get(slug);
  if (!c) notFound();
  const { partner, bigger } = pageFacts(c);
  const same = sameSize(c);
  const x = timesText(c.stretch);
  const crumbs = [
    { href: "/size", label: "Real sizes" },
    { href: `/size/${c.slug}`, label: c.n },
  ];
  const intro = !stretched(c)
    ? t.intro.right(Name(c), areaWords(c.a), name(partner))
    : c.stretch >= 1.6
      ? t.intro.stretched(Name(c), areaWords(c.a), name(partner), x, latText(c.lat), c.lat >= 0 ? "North" : "South")
      : t.intro.mild(Name(c), areaWords(c.a), name(partner), x);
  // first snapshot this name is on (the search index lists its eras oldest first)
  const firstYear = c.eras[0];
  const first = eras.find((e) => e.year === firstYear) ?? eras[eras.length - 1];
  const faq = [
    { q: t.faq.howBig(name(c)), a: t.faq.howBigA(Name(c), areaWords(c.a), rankWord(c.rank), total) },
    stretched(c) ? { q: t.faq.whyBig(name(c)), a: t.faq.whyBigA(Name(c), x) } : { q: t.faq.rightSize(name(c)), a: t.faq.rightSizeA(Name(c), x) },
    { q: t.faq.vs(name(c), name(partner)), a: t.faq.vsA(Name(c), name(partner), c.a / partner.a) },
    ...(bigger ? [{ q: t.faq.vs(name(c), name(bigger)), a: t.faq.vsA(Name(c), name(bigger), c.a / bigger.a) }] : []),
  ];
  const neighbours = sizeCountries.slice(Math.max(0, c.rank - 4), c.rank + 3).filter((o) => o.slug !== c.slug);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(site.url, crumbs)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />
      <PageHero crumbs={crumbs} eyebrow={t.eyebrow} title={t.title(c.n)} compact />
      <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
        {/* the answer first: what someone searching "how big is X" came for */}
        <div className="rounded-card bg-primary-soft p-5 ring-2 ring-primary">
          <p className="font-display text-4xl leading-tight text-ink">{formatArea(c.a, "km2", false)}</p>
          <p className="mt-1 text-ink-soft">
            {formatArea(c.a, "mi2", false)} · {t.rank(rankWord(c.rank), total)} · {t.aboutSize(name(partner))}
          </p>
          <p className="mt-3 inline-flex rounded-full bg-gold-soft px-3 py-1 text-sm font-semibold text-ink ring-1 ring-gold">
            {stretched(c) ? t.stretchChip(x) : t.rightChip}
          </p>
        </div>

        <p className="mt-6 text-lg leading-relaxed text-ink-soft">{intro}</p>

        <div className="mt-6">
          <SizePicture ids={[c.id, partner.id]} names={[c.n, partner.n]} labels={{ map: t.picture.map, real: t.picture.real }} alt={t.picture.alt(c.n, partner.n)} />
        </div>
        <Link
          href={mapUrl({ era: "present", shapes: [{ era: "present", name: c.src, color: 0 }, { era: "present", name: partner.src, color: 1 }] })}
          className="btn btn-primary btn-lg mt-5 w-full sm:w-auto"
        >
          {t.mapCta(c.n, partner.n)}
        </Link>

        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [t.facts.area, formatArea(c.a, "km2")],
            [t.facts.rank, `${ordinal(c.rank)} of ${total}`],
            [t.facts.stretch, stretched(c) ? `${x}× too big` : t.facts.right],
            [t.facts.lat, latText(c.lat)],
          ].map(([k, v]) => (
            <div key={k} className="card p-3">
              <dt className="text-xs font-bold uppercase tracking-wide text-muted">{k}</dt>
              <dd className="mt-1 font-semibold text-ink">{v}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-12 font-display text-2xl text-ink md:text-3xl">{t.sameTitle}</h2>
        <ul className="card mt-4 divide-y divide-line">
          {same.map((o) => (
            <li key={o.slug}>
              <Link href={`/size/${o.slug}`} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2 hover:bg-paper">
                <span className="font-semibold text-ink">{o.n}</span>
                <span className="text-right text-sm text-ink-soft">{t.sameRow(Name(c), Name(o), c.a / o.a)}</span>
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="mt-12 font-display text-2xl text-ink md:text-3xl">{t.historyTitle(Name(c))}</h2>
        <p className="mt-3 leading-relaxed text-ink-soft">{t.history(Name(c), c.eras.length, eras.length, first.label)}</p>
        <p className="mt-2 flex flex-wrap gap-x-5">
          {c.eras.length > 1 ? (
            <Link href={`/eras/${eraSlug(first.key)}`} className="inline-flex min-h-11 items-center font-semibold text-link hover:underline">
              {t.historyCta(first.label)} →
            </Link>
          ) : null}
          <Link href="/eras" className="inline-flex min-h-11 items-center font-semibold text-link hover:underline">
            {t.historyMap} →
          </Link>
        </p>

        <h2 className="mt-12 font-display text-2xl text-ink md:text-3xl">{t.faqTitle}</h2>
        <dl className="mt-4 space-y-4">
          {faq.map((f) => (
            <div key={f.q}>
              <dt className="font-semibold text-ink">{f.q}</dt>
              <dd className="mt-1 leading-relaxed text-ink-soft">{f.a}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-12 font-display text-2xl text-ink md:text-3xl">{t.others}</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {neighbours.map((o) => (
            <li key={o.slug}>
              <Link href={`/size/${o.slug}`} className="inline-flex min-h-11 items-center rounded-full border-2 border-line bg-white px-4 text-sm font-semibold text-ink hover:border-primary">
                {o.n}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/size" className="mt-3 inline-flex min-h-11 items-center font-semibold text-link hover:underline">
          {t.allLink}
        </Link>
      </div>
    </>
  );
}
