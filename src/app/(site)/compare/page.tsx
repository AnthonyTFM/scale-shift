import type { Metadata } from "next";
import Link from "next/link";
import { compareCopy } from "@/content/compare";
import { presetCategories, presets } from "@/content/presets";
import { PageHero } from "@/components/site/PageHero";

export const metadata: Metadata = {
  title: compareCopy.indexTitle,
  description: compareCopy.indexLead,
  alternates: { canonical: "/compare" },
};

export default function CompareIndexPage() {
  return (
    <>
      <PageHero eyebrow="True size" title={compareCopy.indexTitle} lead={<p>{compareCopy.indexLead}</p>} />
      <div className="mx-auto max-w-6xl px-4 py-10">
        {(Object.keys(presetCategories) as (keyof typeof presetCategories)[]).map((cat) => (
          <section key={cat} aria-labelledby={`cat-${cat}`} className="mb-12">
            <h2 id={`cat-${cat}`} className="font-display text-3xl text-ink">
              {presetCategories[cat].title}
            </h2>
            <p className="mt-1 text-ink-soft">{presetCategories[cat].blurb}</p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {presets
                .filter((p) => p.category === cat)
                .map((p) => (
                  <li key={p.id}>
                    <Link href={`/compare/${p.id}`} className="block h-full rounded-xl bg-white p-4 ring-1 ring-line transition hover:ring-2 hover:ring-amber-300">
                      <span className="block font-bold text-ink">{p.title}</span>
                      <span className="mt-1 block text-sm leading-relaxed text-ink-soft">{p.hook}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
