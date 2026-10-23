import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { disputes } from "@/content/disputes";
import { site } from "@/content/site";
import { sizes as t } from "@/content/sizes";
import { capitalize, nameInSentence } from "@/lib/daily";
import { KM2_PER_MI2 } from "@/lib/format";
import { mapLink, mapUrl } from "@/lib/share";
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
/** 3 significant figures: our outlines can't honestly give more ("2.17 million", "604,000", "316") */
const sig3 = (v: number) => (v >= 1e6 ? `${Number((v / 1e6).toPrecision(3))} million` : Number(v.toPrecision(3)).toLocaleString("en-US"));
const km2 = (a: number) => `${sig3(a)} km²`;
const mi2 = (a: number) => `${sig3(a / KM2_PER_MI2)} sq mi`;
/** "2.17 million km² (836,000 sq mi)" */
const areaWords = (a: number) => `${km2(a)} (${mi2(a)})`;
/** counts from whichever end is nearer: "largest", "12th largest", "5th smallest", "smallest" */
const rankPhrase = (r: number) =>
  r <= total / 2 ? (r === 1 ? "largest" : `${ordinal(r)} largest`) : r === total ? "smallest" : `${ordinal(total - r + 1)} smallest`;
const latText = (lat: number) => `${Math.abs(Math.round(lat))}°${lat >= 0 ? "N" : "S"}`;
/** a web map draws it noticeably too big (the daily game's 15% line) */
const stretched = (c: SizeCountry) => c.stretch >= 1.15;

function pageFacts(c: SizeCountry) {
  const match = sameSize(c, 1)[0]; // "about the size of …": the nearest in area
  const partner = partnerFor(c); // drawn next to it: close in size, stretched differently
  const bigger = sizeCountries[c.rank - 2]; // the next country up, for "Is X bigger than Y?"
  const like = t.size(name(match), c.a / match.a, timesText);
  return { match, partner, like, bigger: bigger && bigger.slug !== partner.slug ? bigger : null };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = sizeBySlug.get(slug);
  if (!c) return {};
  const { like } = pageFacts(c);
  const stretchLine = stretched(c) ? t.metaStretch(timesText(c.stretch)) : t.metaRight;
  // search snippets cut off past ~155 characters: drop the square miles first
  const full = t.metaDescription(Name(c), areaWords(c.a), like, stretchLine);
  return {
    title: t.metaTitle(name(c)),
    description: full.length <= 155 ? full : t.metaDescription(Name(c), km2(c.a), like, stretchLine),
    alternates: { canonical: `/size/${c.slug}` },
  };
}

export default async function SizePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = sizeBySlug.get(slug);
  if (!c) notFound();
  const { match, partner, like, bigger } = pageFacts(c);
  const same = sameSize(c);
  const x = timesText(c.stretch);
  const crumbs = [
    { href: "/size", label: "Real sizes" },
    { href: `/size/${c.slug}`, label: c.n },
  ];
  const intro = !stretched(c)
    ? t.intro.right(Name(c), areaWords(c.a), like)
    : c.stretch >= 1.6
      ? t.intro.stretched(Name(c), areaWords(c.a), like, x, latText(c.lat), c.lat >= 0 ? "North" : "South")
      : t.intro.mild(Name(c), areaWords(c.a), like, x);
  // disputes this country is part of (Antarctica's frozen claims don't change any country's own area)
  const disputed = disputes.filter((d) => d.id !== "antarctica" && d.polities.includes(c.src)).length;
  const vs = (o: SizeCountry) => ({ q: t.faq.vs(name(c), name(o)), a: t.faq.vsA(Name(c), name(c), Name(o), name(o), c.a / o.a, timesText) });
  const faq = [
    { q: t.faq.howBig(name(c)), a: t.faq.howBigA(Name(c), areaWords(c.a), rankPhrase(c.rank), total) },
    stretched(c)
      ? { q: t.faq.whyBig(name(c)), a: t.faq.whyBigA(name(c), x) }
      : { q: t.faq.rightSize(name(c)), a: t.faq.rightSizeA(Name(c), x, c.stretch < 1.05) },
    vs(partner),
    ...(match.slug !== partner.slug ? [vs(match)] : []),
    ...(bigger && bigger.slug !== match.slug ? [vs(bigger)] : []),
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
      <PageHero crumbs={crumbs} eyebrow={t.eyebrow} title={t.title(name(c))} compact />
      <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
        {/* the answer first: what someone searching "how big is X" came for */}
        <div className="rounded-card bg-primary-soft p-5 ring-2 ring-primary">
          <p className="font-display text-4xl leading-tight text-ink">{km2(c.a)}</p>
          <p className="mt-1 text-ink-soft">
            {mi2(c.a)} · {t.rank(rankPhrase(c.rank), total)} · {like}
          </p>
          <p className="mt-3 inline-flex rounded-full bg-gold-soft px-3 py-1 text-sm font-semibold text-ink ring-1 ring-gold">
            {stretched(c) ? t.stretchChip(x) : t.rightChip}
          </p>
        </div>

        <p className="mt-6 text-lg leading-relaxed text-ink-soft">{intro}</p>
        <p className="mt-3 text-sm text-muted">{t.measured(total)}</p>
        {disputed ? (
          <p className="mt-3 text-sm text-ink-soft">
            {t.disputed(Name(c), disputed)}{" "}
            <Link href="/disputes" className="inline-flex min-h-11 items-center font-semibold text-link hover:underline">
              {t.disputedLink}
            </Link>
          </p>
        ) : null}

        <div className="mt-6">
          <SizePicture ids={[c.id, partner.id]} names={[c.n, partner.n]} labels={{ map: t.picture.map, real: t.picture.real }} alt={t.picture.alt(Name(c), name(partner))} />
        </div>
        <Link
          href={mapUrl({ era: "present", shapes: [{ era: "present", name: c.src, color: 0 }, { era: "present", name: partner.src, color: 1 }] })}
          className="btn btn-primary btn-lg mt-5 w-full sm:w-auto"
        >
          {t.mapCta(name(c), name(partner))}
        </Link>

        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [t.facts.area, km2(c.a)],
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
                <span className="text-right text-sm text-ink-soft">{t.sameRow(Name(c), name(c), Name(o), name(o), c.a / o.a, timesText)}</span>
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="mt-12 font-display text-2xl text-ink md:text-3xl">{t.historyTitle(Name(c))}</h2>
        <p className="mt-3 leading-relaxed text-ink-soft">{t.history}</p>
        <p className="mt-2 flex flex-wrap gap-x-5">
          <Link href={mapLink("2000bce")} className="inline-flex min-h-11 items-center font-semibold text-link hover:underline">
            {t.historyCta} →
          </Link>
          <Link href="/eras" className="inline-flex min-h-11 items-center font-semibold text-link hover:underline">
            {t.historyEras} →
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
