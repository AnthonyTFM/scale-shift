import type { Metadata } from "next";
import Link from "next/link";
import { eraIntros } from "@/content/era-intros";
import { appCopy } from "@/content/site";
import { eras, eraSlug, eraYear, type EraMeta } from "@/lib/eras";
import { PageHero } from "@/components/site/PageHero";
import dataVersion from "@/data/data-version.json";
import { equalAreaHeight } from "@/lib/og-map";

const THUMB_H = equalAreaHeight(600);

export const metadata: Metadata = {
  title: "Every era: world borders from 2000 BCE to today",
  description: "Browse 49 snapshots of the world's borders, from 2000 BCE to the present. See the largest states of each era and what changed in between.",
  alternates: { canonical: "/eras" },
};

const groups: { title: string; test: (e: EraMeta) => boolean }[] = [
  { title: "Ancient world", test: (e) => eraYear(e) < 500 },
  { title: "Middle Ages", test: (e) => eraYear(e) >= 500 && eraYear(e) < 1492 },
  { title: "Early modern", test: (e) => eraYear(e) >= 1492 && eraYear(e) < 1815 },
  { title: "Modern", test: (e) => eraYear(e) >= 1815 },
];

export default function ErasPage() {
  return (
    <>
      <PageHero
        eyebrow="49 snapshots"
        title="The world's borders, era by era"
        lead="Each snapshot shows who controlled what at that moment, from Bronze Age kingdoms to today's 190-plus countries. Open any era on the map, or read what changed."
      />
      <div className="mx-auto max-w-6xl space-y-12 px-4 py-12">
        {groups.map((g) => (
          <section key={g.title} aria-labelledby={`g-${g.title}`}>
            <h2 id={`g-${g.title}`} className="font-display text-2xl text-ink">
              {g.title}
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {eras.filter(g.test).map((e) => (
                <li key={e.key}>
                  <Link
                    href={`/eras/${eraSlug(e.key)}`}
                    className="flex h-full flex-col press-card rounded-card p-3 hover:border-primary"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- a small WebP made at build time */}
                    <img
                      src={`/era-maps/${eraSlug(e.key)}/thumb?v=${dataVersion.v}`}
                      alt=""
                      width={600}
                      height={THUMB_H}
                      loading="lazy"
                      decoding="async"
                      className="mb-3 h-auto w-full rounded-xl bg-white"
                    />
                    <span className="font-display text-2xl text-ink">{e.label}</span>
                    <span className="mt-1 text-sm text-muted">
                      {e.count} mapped {e.key === "present" ? "countries & territories" : "states & peoples"}
                    </span>
                    <span
                      className={`mt-2 self-start rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${e.precision >= 3 ? "bg-green-soft text-green-text ring-green/40" : "bg-gold-soft text-ink ring-gold"}`}
                    >
                      {appCopy.eraPrecision[e.precision]}
                    </span>
                    {eraIntros[e.key] ? <span className="mt-2 line-clamp-3 text-sm text-ink-soft">{eraIntros[e.key]}</span> : null}
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
