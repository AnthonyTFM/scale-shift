import type { Metadata } from "next";
import Link from "next/link";
import pool from "@/data/daily-pool.json";
// today's areas as the era pages and the map show them (the puzzle pool keeps the outlines it had when frozen)
import polities from "../../../../public/data/polities.json";
import { teachers as t } from "@/content/teachers";
import { disputes } from "@/content/disputes";
import { events } from "@/content/events";
import { site } from "@/content/site";
import { eras, eraSlug, formatYear } from "@/lib/eras";
import { formatBoth, formatBothShort } from "@/lib/format";
import { PageHero } from "@/components/site/PageHero";

export const metadata: Metadata = {
  title: "For teachers: map projections, real country sizes and historical borders",
  description:
    "A classroom reference: why the Mercator map distorts size, the real area of today's countries, 4,000 years of world borders, recent border changes and today's disputed territories.",
  alternates: { canonical: "/teachers" },
};

type Row = { n: string; kind: string; era: string; a: number; m: number; lat: number };
type Polity = { n: string; y: (number | string)[]; a: number[]; us?: number };
const todayArea = new Map(
  (polities as Polity[]).filter((p) => !p.us && p.y.at(-1) === "present").map((p) => [p.n, p.a[p.a.length - 1]] as const),
);
// the stretch (m / a) comes from the pool's own outline; only the area shown is today's figure
const countries = (pool as Row[])
  .filter((r) => r.kind === "country" && r.era === "present")
  .map((r) => {
    const a = todayArea.get(r.n) ?? r.a;
    return { ...r, a, m: (r.m / r.a) * a };
  });
const byArea = [...countries].sort((a, b) => b.a - a.a);
const mostInflated = [...countries].sort((a, b) => b.m / b.a - a.m / a.a).slice(0, 12);
const recent = [...events].sort((a, b) => b.taken - a.taken).slice(0, 10);
const times = (x: number) => (x >= 10 ? Math.round(x).toString() : x.toFixed(1));
const latText = (lat: number) => `${Math.abs(Math.round(lat))}°${lat >= 0 ? "N" : "S"}`;

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 border-t border-line pt-10">
      <h2 id={`${id}-h`} className="font-display text-2xl text-ink md:text-3xl">
        {title}
      </h2>
      {lead ? <p className="mt-2 max-w-3xl text-ink-soft">{lead}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SizeTable({ rows, caption }: { rows: Row[]; caption: string }) {
  return (
    <div tabIndex={0} role="region" aria-label={`Table: ${caption}`} className="overflow-x-auto card">
      {/* phones: area and latitude under the name, no sideways scroll */}
      <table className="w-full text-left text-sm sm:min-w-[480px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-paper text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-3 py-2">
              Country
            </th>
            <th scope="col" className="hidden px-3 py-2 sm:table-cell">
              Real area
            </th>
            <th scope="col" className="hidden px-3 py-2 sm:table-cell">
              Latitude
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              <span className="sm:hidden">Normal map</span>
              <span className="hidden sm:inline">Normal map shows it</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.n}>
              <th scope="row" className="px-3 py-2 font-semibold text-ink">
                {r.n}
                <span className="block text-sm font-normal text-ink-soft sm:hidden">
                  {formatBothShort(r.a)} · {latText(r.lat)}
                </span>
              </th>
              <td className="hidden px-3 py-2 text-ink-soft sm:table-cell">{formatBoth(r.a)}</td>
              <td className="hidden px-3 py-2 text-ink-soft sm:table-cell">{latText(r.lat)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right align-top tabular-nums text-ink">{times(r.m / r.a)}× too big</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TeachersPage() {
  const url = site.url.replace(/\/$/, "");
  return (
    <>
      <PageHero eyebrow={t.eyebrow} title={t.title} lead={<p>{t.lead}</p>} />
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <nav aria-label="On this page" className="mb-10 flex flex-wrap gap-2">
          {t.jump.map((j) => (
            <a key={j.id} href={`#${j.id}`} className="inline-flex min-h-11 items-center rounded-full border-2 border-line bg-white px-4 text-sm font-semibold text-ink hover:border-primary">
              {j.label}
            </a>
          ))}
        </nav>

        <div className="space-y-12">
          <Section id="why" title={t.why.title}>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3 leading-relaxed text-ink-soft">
                {t.why.paras.map((p) => (
                  <p key={p}>{p}</p>
                ))}
                <p>
                  <Link href="/how-it-works" className="inline-flex min-h-11 items-center font-semibold text-link hover:underline">
                    How {site.name} shows true sizes →
                  </Link>
                </p>
              </div>
              <div className="overflow-hidden card">
                <table className="w-full text-left text-sm">
                  <caption className="bg-paper px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-muted">{t.why.tableTitle}</caption>
                  <tbody className="divide-y divide-line">
                    {t.why.rows.map(([lat, place]) => (
                      <tr key={lat}>
                        <th scope="row" className="w-16 px-3 py-2 tabular-nums text-ink">
                          {lat}°
                        </th>
                        <td className="px-3 py-2 text-ink-soft">{place}</td>
                        <td className="px-3 py-2 text-right font-bold tabular-nums text-ink">{times(1 / Math.cos((lat * Math.PI) / 180) ** 2)}×</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Section>

          <Section id="sizes" title={t.sizes.title} lead={t.sizes.lead}>
            <h3 className="mb-2 font-bold text-ink">{t.sizes.mostTitle}</h3>
            <SizeTable rows={mostInflated} caption={t.sizes.mostTitle} />
            <p className="mt-2 max-w-3xl text-sm text-muted">{t.sizes.note}</p>
            <details className="mt-4">
              <summary className="cursor-pointer py-2.5 font-bold text-link">
                {t.sizes.allTitle} ({byArea.length})
              </summary>
              <div className="mt-3">
                <SizeTable rows={byArea} caption={t.sizes.allTitle} />
              </div>
            </details>
          </Section>

          <Section id="eras" title={t.eras.title} lead={t.eras.lead}>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {eras.map((e) => (
                <li key={e.key}>
                  <Link
                    href={`/eras/${eraSlug(e.key)}`}
                    className="flex min-h-11 items-center rounded-[14px] border-2 border-line bg-white px-3 text-sm font-semibold text-ink hover:border-primary"
                  >
                    {e.key === "present" ? "Today" : e.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="changes" title={t.changes.title} lead={t.changes.lead}>
            <ol className="divide-y divide-line card">
              {recent.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-sm">
                  <span className="w-12 shrink-0 font-bold tabular-nums text-ink">{formatYear(e.taken)}</span>
                  <span className="min-w-0 flex-1 font-semibold text-ink">{e.title}</span>
                  <span className="text-muted">{e.formalized === null ? "Never made official" : `Official ${formatYear(e.formalized)}`}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3">
              <Link href="/timeline" className="inline-flex min-h-11 items-center font-semibold text-link hover:underline">
                {t.changes.cta} ({events.length} events) →
              </Link>
            </p>
          </Section>

          <Section id="disputes" title={t.disputes.title} lead={t.disputes.lead}>
            <div tabIndex={0} role="region" aria-label={`Table: ${t.disputes.title}`} className="overflow-x-auto card">
              {/* phones: who controls and claims it under the name */}
              <table className="w-full text-left text-sm sm:min-w-[560px]">
                <thead className="bg-paper text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2">
                      Place
                    </th>
                    <th scope="col" className="hidden px-3 py-2 sm:table-cell">
                      Controlled by
                    </th>
                    <th scope="col" className="hidden px-3 py-2 sm:table-cell">
                      Also claimed by
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Since
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {disputes.map((d) => (
                    <tr key={d.id}>
                      <th scope="row" className="px-3 py-2 font-semibold text-ink">
                        <Link href={`/disputes#${d.id}`} className="-my-2 block py-2 hover:underline">
                          {d.name}
                        </Link>
                        <span className="block text-sm font-normal text-ink-soft sm:hidden">
                          Controlled by {d.controlledBy}
                          {d.claimedBy.length ? `; also claimed by ${d.claimedBy.join(", ")}` : ""}
                        </span>
                      </th>
                      <td className="hidden px-3 py-2 text-ink-soft sm:table-cell">{d.controlledBy}</td>
                      <td className="hidden px-3 py-2 text-ink-soft sm:table-cell">{d.claimedBy.join(", ") || "None"}</td>
                      <td className="whitespace-nowrap px-3 py-2 align-top tabular-nums text-ink-soft">{formatYear(d.taken)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              <Link href="/disputes" className="inline-flex min-h-11 items-center font-semibold text-link hover:underline">
                {t.disputes.cta} →
              </Link>
            </p>
          </Section>

          <Section id="class" title={t.inClass.title}>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {t.inClass.tips.map(([title, body]) => (
                <li key={title} className="card p-4">
                  <p className="font-bold text-ink">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{body}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex flex-wrap gap-3">
              <Link href="/map" className="btn btn-primary">
                Open the map
              </Link>
              <Link href="/daily" className="btn btn-white">
                Today&apos;s challenge
              </Link>
            </p>
          </Section>

          <Section id="cite" title={t.cite.title}>
            <div className="max-w-3xl space-y-3 leading-relaxed text-ink-soft">
              {t.cite.paras.map((p) => (
                <p key={p}>{p}</p>
              ))}
              <p className="text-xs font-bold uppercase tracking-wide text-muted">{t.cite.citeLabel}</p>
              <p className="card p-4 text-sm leading-relaxed text-ink">{t.cite.citation(url)}</p>
              <p>
                <Link href="/about" className="inline-flex min-h-11 items-center font-semibold text-link hover:underline">
                  {t.cite.sourcesCta} →
                </Link>
              </p>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}
