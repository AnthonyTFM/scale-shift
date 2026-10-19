import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { compareCopy } from "@/content/compare";
import { presetCategories, presets } from "@/content/presets";
import { site } from "@/content/site";
import { compareBySlug, compareShapes, compareSlug, compareSvg, ratioText, withThe } from "@/lib/compare";
import { eraByKey } from "@/lib/eras";
import { formatBoth } from "@/lib/format";
import { mapUrl } from "@/lib/share";
import { breadcrumbJsonLd, JsonLd, PageHero } from "@/components/site/PageHero";

export function generateStaticParams() {
  return presets.map((p) => ({ slug: compareSlug(p) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = compareBySlug(slug);
  if (!p) return {};
  return { title: compareCopy.pageTitle(p.title), description: p.hook, alternates: { canonical: `/compare/${slug}` } };
}

const eraNote = (era: string) => (era === "us" ? "US state" : era === "present" ? "today" : `in ${eraByKey(era)?.label ?? era}`);

export default async function ComparePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const preset = compareBySlug(slug);
  if (!preset) notFound();
  const shapes = compareShapes(preset);
  const svg = compareSvg(shapes, 1000, 560);
  const href = mapUrl({ era: preset.baseEra, shapes: preset.shapes.map((s, i) => ({ ...s, color: i })), at: preset.at });
  const maxReal = Math.max(...shapes.map((s) => s.km2));
  const maxMap = Math.max(...shapes.map((s) => s.mapKm2));
  // the headline sentence leads with the bigger shape ("Alaska is 2.2 times the size of Texas")
  const [big, small] = shapes.length === 2 ? [...shapes].sort((a, b) => b.km2 - a.km2) : [];
  // the same country in two eras: say which is which ("Poland in 1938 is 26% bigger than Poland today")
  const sameName = big && small && big.name === small.name;
  const crumbs = [
    { href: "/", label: "Home" },
    { href: "/compare", label: "Comparisons" },
    { href: `/compare/${slug}`, label: preset.title },
  ];
  const more = presets.filter((p) => p.id !== preset.id && p.category === preset.category).slice(0, 6);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(site.url, crumbs)} />
      <PageHero
        crumbs={crumbs}
        eyebrow={presetCategories[preset.category].title}
        title={compareCopy.pageTitle(preset.title)}
        lead={<p>{preset.hook}</p>}
      />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <figure>
          <div
            role="img"
            aria-label={`${shapes.map((s) => s.name).join(" and ")} drawn at true size, side by side`}
            className="overflow-hidden rounded-card ring-1 ring-line [&>svg]:h-auto [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <figcaption className="mt-2 text-sm text-muted">{compareCopy.figureCaption}</figcaption>
        </figure>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={href} className="inline-flex h-12 items-center rounded-lg bg-accent px-5 font-bold text-panel hover:bg-accent-strong">
            {compareCopy.openMap} →
          </Link>
          <Link href="/daily" className="inline-flex h-12 items-center rounded-lg border border-line bg-white px-5 font-bold text-ink hover:bg-paper">
            {compareCopy.playDaily}
          </Link>
        </div>

        <section aria-labelledby="numbers" className="mt-12 max-w-3xl">
          <h2 id="numbers" className="font-display text-3xl text-ink">
            {compareCopy.numbersTitle}
          </h2>
          {big && small ? (
            <p className="mt-3 text-lg text-ink-soft">
              <strong className="text-ink">{withThe(big.name, true)}</strong>
              {sameName ? ` ${eraNote(big.era)}` : ""} is {ratioText(big.km2, small.km2)} <strong className="text-ink">{withThe(small.name)}</strong>
              {sameName ? ` ${eraNote(small.era)}` : ""}.
            </p>
          ) : null}
          <ul className="mt-5 space-y-4">
            {shapes.map((s) => {
              const inflation = s.mapKm2 / s.km2;
              return (
                <li key={s.name} className="rounded-card border border-line bg-white p-4">
                  <p className="flex items-center gap-2 font-bold text-ink">
                    <span aria-hidden="true" className="size-3 rounded-full" style={{ background: s.color }} />
                    {s.name} <span className="font-normal text-muted">({eraNote(s.era)})</span>
                  </p>
                  <p className="mt-1 text-ink-soft">
                    {compareCopy.realSize}: <strong className="text-ink">{formatBoth(s.km2)}</strong>
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {inflation >= 1.15
                      ? compareCopy.inflated(inflation >= 10 ? String(Math.round(inflation)) : inflation.toFixed(1))
                      : compareCopy.notInflated}
                  </p>
                </li>
              );
            })}
          </ul>
          {shapes.length > 1 ? (
            <div className="mt-6 rounded-card border border-line bg-white p-4">
              {(
                [
                  [compareCopy.mapSize, "mapKm2", maxMap],
                  [compareCopy.realSize, "km2", maxReal],
                ] as const
              ).map(([label, field, max]) => (
                <div key={field} className="mt-2 first:mt-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
                  {shapes.map((s) => (
                    <div key={s.name} className="mt-1.5 flex items-center gap-2 text-sm">
                      <span className="w-40 shrink-0 truncate font-semibold text-ink">{s.name}</span>
                      <span className="h-3 flex-1 overflow-hidden rounded-full bg-paper">
                        <span className="block h-full rounded-full" style={{ width: `${(s[field] / max) * 100}%`, background: s.color }} />
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section aria-labelledby="more" className="mt-12">
          <h2 id="more" className="font-display text-3xl text-ink">
            {compareCopy.moreTitle}
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/compare/${p.id}`}
                  className="block h-full rounded-xl bg-white p-4 ring-1 ring-line transition hover:ring-2 hover:ring-amber-300"
                >
                  <span className="block font-bold text-ink">{p.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-ink-soft">{p.hook}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-ink-soft">
            {compareCopy.dailyHook}{" "}
            <Link href="/daily" className="font-semibold text-link hover:underline">
              {compareCopy.playDaily} →
            </Link>
          </p>
        </section>
      </div>
    </>
  );
}
