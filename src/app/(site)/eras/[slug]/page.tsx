import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import statsData from "@/data/era-stats.json";
import dataVersion from "@/data/data-version.json";
import { equalAreaHeight } from "@/lib/og-map";
import { eraIntros } from "@/content/era-intros";
import { appCopy, site } from "@/content/site";
import { eraByKey, eraIndex, eraPhrase, eras, eraSlug, eraTitle, eventsForEra, keyFromSlug } from "@/lib/eras";
import { formatBoth } from "@/lib/format";
import { mapLink } from "@/lib/share";
import { EventCard } from "@/components/EventCard";
import { breadcrumbJsonLd, JsonLd, PageHero } from "@/components/site/PageHero";

type Change = { n: string; from: number; to: number };
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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = eraByKey(keyFromSlug(slug));
  if (!e) return {};
  return {
    title: e.key === "present" ? "World map today: borders, disputes and real sizes" : `World map in ${e.label}: borders, empires and real sizes`,
    description: summary(e.key).slice(0, 155),
    alternates: { canonical: `/eras/${slug}` },
  };
}

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
  const km = (n: number) => `${Math.round(n / 1000).toLocaleString("en-US")}k km²`;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(site.url, crumbs)} />
      <PageHero
        crumbs={crumbs}
        eyebrow={appCopy.precision[e.precision]}
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
        {/* vector art on an equal-area map, so it's sharp on any screen and shows every shape at its true size */}
        <Image
          // versioned so a map data rebuild shows up straight away
          src={`/era-maps/${slug}/map?v=${dataVersion.v}`}
          fetchPriority="high"
          unoptimized
          alt={`World map of borders ${e.key === "present" ? "today" : `in ${e.label}`}, on an equal-area projection`}
          width={1200}
          height={equalAreaHeight(1200)}
          className="card w-full bg-white p-3 sm:p-5"
        />

        {s?.top.length ? (
          <section aria-labelledby="largest" className="mt-12">
            <h2 id="largest" className="font-display text-3xl text-ink">
              Largest {e.key === "present" ? "countries today" : `in ${e.label}`}
            </h2>
            <p className="mt-1 text-sm text-muted">Approximate areas, measured from the map outlines. Share of land counts all of Earth&apos;s land, Antarctica included.</p>
            <div tabIndex={0} role="region" aria-label={`Table: largest ${e.key === "present" ? "countries today" : `in ${e.label}`}`} className="mt-4 overflow-x-auto card">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      #
                    </th>
                    <th scope="col" className="px-4 py-3">
                      State or people
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Area
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Share of land
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {s.top.map((t, n) => (
                    <tr key={t.n}>
                      <td className="px-4 py-2.5 text-muted">{n + 1}</td>
                      <th scope="row" className="px-4 py-2.5 font-semibold text-ink">
                        {t.n}
                      </th>
                      <td className="px-4 py-2.5 text-ink-soft">{formatBoth(t.a)}</td>
                      <td className="px-4 py-2.5 text-right text-ink-soft">{((t.a / LAND_KM2) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {s && prev && key !== "present" ? (
          <section aria-labelledby="changes" className="mt-12">
            <h2 id="changes" className="font-display text-3xl text-ink">
              What changed since {prev.label}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Based on the two snapshots. Some differences reflect better mapping rather than real events, especially before 1500.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ChangeList title="Grew the most" rows={s.gained.map((c) => ({ n: c.n, detail: `${km(c.from)} → ${km(c.to)}` }))} />
              <ChangeList title="Shrank the most" rows={s.lost.map((c) => ({ n: c.n, detail: `${km(c.from)} → ${km(c.to)}` }))} />
              <ChangeList title="Appeared" rows={s.appeared.map((c) => ({ n: c.n, detail: km(c.a) }))} />
              <ChangeList title="Disappeared" rows={s.vanished.map((c) => ({ n: c.n, detail: km(c.a) }))} />
            </div>
          </section>
        ) : null}

        <section aria-labelledby="events" className="mt-12">
          <h2 id="events" className="font-display text-3xl text-ink">
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
              No curated events for this period yet.{" "}
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
