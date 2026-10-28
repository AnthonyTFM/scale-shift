import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import statsData from "@/data/era-stats.json";
import dataVersion from "@/data/data-version.json";
import { equalAreaHeight } from "@/lib/og-map";
import { eraIntros } from "@/content/era-intros";
import { appCopy, site } from "@/content/site";
import { eraByKey, eraIndex, eraPhrase, eras, eraSlug, eraTitle, eventsForEra, keyFromSlug } from "@/lib/eras";
import { formatArea, formatBoth, formatBothShort } from "@/lib/format";
import { mapLink } from "@/lib/share";
import { EventCard } from "@/components/EventCard";
import { breadcrumbJsonLd, JsonLd, PageHero } from "@/components/site/PageHero";

// `after`: the state it follows on from in the snapshot before (a rename or a successor)
type Change = { n: string; after?: string; from: number; to: number };
type Named = { n: string; a: number };
type Stats = { key: string; top: Named[]; gained: Change[]; lost: Change[]; appeared: Named[]; vanished: Named[] };
const stats = statsData as Stats[];

/** Earth's land area excluding Antarctica is ~134.6M km²; including it, ~148.9M km². */
const LAND_KM2 = 148_900_000;

export function generateStaticParams() {
  return eras.map((e) => ({ slug: eraSlug(e.key) }));
}

function summary(key: string) {
  const e = eraByKey(key)!;
  const s = stats.find((x) => x.key === key);
  const top = s?.top.filter((t) => t.n !== "Antarctica").slice(0, 3).map((t) => t.n) ?? [];
  return (
    eraIntros[key] ??
    `${e.count} states, peoples and territories are mapped in ${eraPhrase(e)}. The largest are ${top.length > 1 ? `${top.slice(0, -1).join(", ")} and ${top.at(-1)}` : top[0]}.`
  );
}

/**
 * A meta description of at most `max` characters: whole sentences if they fill most of it, else cut at a word with an
 * ellipsis.
 */
function clip(text: string, max: number) {
  if (text.length <= max) return text;
  const end = text.lastIndexOf(". ", max - 1);
  if (end >= max * 0.5) return text.slice(0, end + 1);
  const space = text.lastIndexOf(" ", max - 1);
  return `${text.slice(0, space > 0 ? space : max - 1).replace(/[,;:.]$/, "")}…`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = eraByKey(keyFromSlug(slug));
  if (!e) return {};
  return {
    title: e.key === "present" ? "World map today: borders, disputes and real sizes" : `World map in ${e.label}: borders, empires and real sizes`,
    description: clip(summary(e.key), 155),
    alternates: { canonical: `/eras/${eraSlug(e.key)}` },
  };
}

const renamed = (c: Change) => (c.after ? `${c.n} (after ${c.after})` : c.n);

function ChangeList({ title, rows }: { title: string; rows: { n: string; detail: string }[] }) {
  if (!rows.length) return null;
  return (
    <div className="card p-5">
      <h3 className="font-bold text-ink">{title}</h3>
      <ul className="mt-2 divide-y divide-line text-sm">
        {rows.map((r) => (
          <li key={r.n} className="flex justify-between gap-3 py-1.5">
            <span className="text-ink">{r.n}</span>
            <span className="shrink-0 text-muted">{r.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Every era is prerendered at build time (generateStaticParams), so the whole page is static HTML.
// Opting out of instant-navigation streaming avoids a skeleton → content swap that shifts the layout.
export const instant = false;

export default async function EraPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const key = keyFromSlug(slug);
  const e = eraByKey(key);
  if (!e) notFound();
  const i = eraIndex(key);
  const prev = i > 0 ? eras[i - 1] : null;
  const next = i < eras.length - 1 ? eras[i + 1] : null;
  const s = stats.find((x) => x.key === key);
  const evs = eventsForEra(key);
  const crumbs = [
    { href: "/map", label: "Map" },
    { href: "/eras", label: "Eras" },
    { href: `/eras/${slug}`, label: e.label },
  ];
  // "4.51M km²", as everywhere else (this page renders on the server, so it can't follow the visitor's unit)
  const km = (n: number) => formatArea(n, "km2");

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(site.url, crumbs)} />
      <PageHero
        crumbs={crumbs}
        eyebrow={appCopy.eraPrecision[e.precision]}
        title={eraTitle(e)}
        lead={
          <>
            <p>{summary(key)}</p>
            <Link
              href={mapLink(key)}
              className="btn btn-primary btn-lg mt-6"
            >
              Explore {e.key === "present" ? "today's borders" : e.label} on the map
            </Link>
          </>
        }
      />
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* an equal-area map, so every shape shows at its true size: vector art from tablets up (sharp on any screen), a
            light picture on phones, held upright or sideways (the vector map takes a phone seconds to draw). Versioned, so a map data rebuild shows
            up straight away. */}
        <picture>
          <source media="(min-width: 640px) and (min-height: 500px)" type="image/svg+xml" srcSet={`/era-maps/${slug}/map?v=${dataVersion.v}`} />
          <img
            src={`/era-maps/${slug}/phone?v=${dataVersion.v}`}
            fetchPriority="high"
            alt={`World map of borders ${e.key === "present" ? "today" : `in ${e.label}`}, drawn so each country shows at its real size`}
            width={1200}
            height={equalAreaHeight(1200)}
            className="card h-auto w-full bg-white p-3 sm:p-5"
          />
        </picture>

        {s?.top.length ? (
          <section aria-labelledby="largest" className="mt-12">
            <h2 id="largest" className="font-display text-2xl text-ink md:text-3xl">
              Largest {e.key === "present" ? "countries today" : `in ${e.label}`}
            </h2>
            <p className="mt-1 text-sm text-muted">Approximate areas, measured from the map outlines. Share of land counts all of Earth&apos;s land, Antarctica included.</p>
            <div tabIndex={0} role="region" aria-label={`Table: largest ${e.key === "present" ? "countries today" : `in ${e.label}`}`} className="mt-4 overflow-x-auto card">
              {/* phones: two-line rows (area under the name), no sideways scroll; wider screens: four columns */}
              <table className="w-full text-left text-sm sm:min-w-[520px]">
                <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th scope="col" className="py-3 pl-3 pr-1 sm:px-4">
                      #
                    </th>
                    <th scope="col" className="px-2 py-3 sm:px-4">
                      State or people
                    </th>
                    <th scope="col" className="hidden px-4 py-3 sm:table-cell">
                      Area
                    </th>
                    <th scope="col" className="py-3 pl-1 pr-3 text-right sm:px-4">
                      <span className="sm:hidden">Land</span>
                      <span className="hidden sm:inline">Share of land</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {s.top.map((t, n) => (
                    <tr key={t.n}>
                      <td className="py-2.5 pl-3 pr-1 align-top text-muted sm:px-4">{n + 1}</td>
                      <th scope="row" className="px-2 py-2.5 font-semibold text-ink sm:px-4">
                        {t.n}
                        <span className="block text-sm font-normal text-ink-soft sm:hidden">{formatBothShort(t.a)}</span>
                      </th>
                      <td className="hidden px-4 py-2.5 text-ink-soft sm:table-cell">{formatBoth(t.a)}</td>
                      <td className="py-2.5 pl-1 pr-3 text-right align-top tabular-nums text-ink-soft sm:px-4">{((t.a / LAND_KM2) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {s && prev && key !== "present" ? (
          <section aria-labelledby="changes" className="mt-12">
            <h2 id="changes" className="font-display text-2xl text-ink md:text-3xl">
              What changed since {prev.label}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Based on the two snapshots. Some differences reflect better mapping rather than real events, especially before 1500.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ChangeList title="Grew the most" rows={s.gained.map((c) => ({ n: renamed(c), detail: `${km(c.from)} → ${km(c.to)}` }))} />
              <ChangeList title="Shrank the most" rows={s.lost.map((c) => ({ n: renamed(c), detail: `${km(c.from)} → ${km(c.to)}` }))} />
              <ChangeList title="Appeared" rows={s.appeared.map((c) => ({ n: c.n, detail: km(c.a) }))} />
              <ChangeList title="Disappeared" rows={s.vanished.map((c) => ({ n: c.n, detail: km(c.a) }))} />
            </div>
          </section>
        ) : null}

        <section aria-labelledby="events" className="mt-12">
          <h2 id="events" className="font-display text-2xl text-ink md:text-3xl">
            {prev ? `Land that changed hands, ${prev.label}${/\s/.test(prev.label + e.label) ? " – " : "–"}${e.label}` : `Key events up to ${e.label}`}
          </h2>
          {evs.length ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {evs.map((ev) => (
                <EventCard key={ev.id} ev={ev} />
              ))}
            </div>
          ) : (
            <p className="mt-2 text-ink-soft">
              No events written up for this period yet.{" "}
              <Link href="/contact?topic=other" className="font-semibold text-link underline">
                Suggest one
              </Link>
              .
            </p>
          )}
        </section>

        <nav aria-label="Other eras" className="mt-14 flex flex-wrap justify-between gap-3">
          {prev ? (
            <Link href={`/eras/${eraSlug(prev.key)}`} className="btn btn-white">
              ← {prev.label}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/eras/${eraSlug(next.key)}`} className="btn btn-white">
              {next.label} →
            </Link>
          ) : null}
        </nav>
      </div>
    </>
  );
}
