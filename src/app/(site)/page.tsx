import type { Metadata } from "next";
import Link from "next/link";
import pool from "@/data/daily-pool.json";
import { disputes } from "@/content/disputes";
import { events } from "@/content/events";
import { site } from "@/content/site";
import { eras } from "@/lib/eras";
import { DailyTeaser } from "@/components/home/DailyTeaser";
import { LegacyMapRedirect } from "@/components/home/LegacyMapRedirect";
import { JsonLd } from "@/components/site/PageHero";
import { WeeklyPicks } from "@/components/home/WeeklyPicks";

export const metadata: Metadata = {
  title: { absolute: `${site.name}: the real size of countries and empires, 2000 BCE to today` },
  description: site.description,
  alternates: { canonical: "/" },
};

const directory = [
  {
    href: "/map",
    icon: "🗺️",
    title: "The map",
    body: "Drag any country or empire anywhere on Earth and watch it shrink or grow to its real size. Step through 4,000 years of borders.",
    cta: "Open the map",
  },
  {
    href: "/leaderboard",
    icon: "🏆",
    title: "Leaderboard",
    body: "See who scored best today and who has the most points of all time. Pick a nickname and join in.",
    cta: "See the rankings",
  },
  {
    href: "/eras",
    icon: "🏛️",
    title: "Eras",
    body: `${eras.length} snapshots of world borders, from 2000 BCE to today, each with what changed and why.`,
    cta: "Browse eras",
  },
  {
    href: "/timeline",
    icon: "📜",
    title: "Timeline",
    body: `${events.length} key moments when land changed hands, with when it was taken and when (or if) it was made official.`,
    cta: "Read the timeline",
  },
  {
    href: "/disputes",
    icon: "⚖️",
    title: "Disputed borders",
    body: `${disputes.length} places where who controls the land and who the world recognizes don't match, from Crimea to Antarctica.`,
    cta: "See the disputes",
  },
];


export default function HomePage() {
  return (
    <>
      <LegacyMapRedirect />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: site.name,
          url: site.url,
          description: site.description,
        }}
      />

      {/* Hero: the game and the map, side by side */}
      <section className="bg-panel text-panel-text">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-[1.2fr_1fr] md:py-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-accent">Free · No sign-up · Built for curious minds</p>
            <h1 className="mt-3 font-display text-4xl leading-[1.05] md:text-6xl">Maps lie about size. Find out the truth.</h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-panel-muted">
              Most world maps stretch land near the poles, so Greenland looks as big as Africa. {site.name} lets you drag any country or empire
              to its real size, travel through 4,000 years of borders, and test yourself in a new challenge every day.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/daily" className="inline-flex h-12 items-center rounded-lg bg-accent px-5 font-bold text-panel hover:bg-accent-strong">
                Play today&apos;s challenge
              </Link>
              <Link href="/map" className="inline-flex h-12 items-center rounded-lg border border-white/25 px-5 font-bold hover:bg-white/10">
                Open the map
              </Link>
            </div>
            <dl className="mt-8 grid max-w-lg grid-cols-4 gap-3 text-center">
              {[
                ["4,000", "years"],
                [String(eras.length), "map snapshots"],
                [String(events.length), "border events"],
                [String(pool.length), "daily puzzle shapes"],
              ].map(([n, label]) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd>
                    <span className="block font-display text-2xl text-white md:text-3xl">{n}</span>
                    <span className="block text-[11px] leading-tight text-panel-muted">{label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <DailyTeaser />
        </div>
      </section>

      {/* Directory */}
      <section aria-labelledby="explore" className="mx-auto max-w-6xl px-4 py-12">
        <h2 id="explore" className="font-display text-3xl text-ink">
          Explore {site.name}
        </h2>
        <p className="mt-1 text-ink-soft">Everything on the site, in one place.</p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <li className="sm:col-span-2 lg:col-span-1 lg:row-span-2">
            <Link
              href="/daily"
              className="flex h-full flex-col rounded-card bg-gradient-to-br from-amber-300 to-orange-400 p-6 text-panel shadow-sm transition hover:-translate-y-0.5 hover:shadow-float"
            >
              <span aria-hidden="true" className="text-4xl">
                🎯
              </span>
              <span className="mt-3 text-xs font-bold uppercase tracking-wide">The game · New every day</span>
              <span className="mt-1 font-display text-3xl leading-tight">Daily challenge</span>
              <span className="mt-2 leading-relaxed">
                Five &ldquo;which is bigger?&rdquo; puzzles a day, the same for everyone. Countries, US states and empires from Rome to the Mongols.
                Build a streak, share your score and climb the leaderboard.
              </span>
              <span className="mt-auto pt-5 font-bold">Play now →</span>
            </Link>
          </li>
          {directory.map((d) => (
            <li key={d.href}>
              <Link
                href={d.href}
                className="flex h-full flex-col rounded-card border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-float"
              >
                <span aria-hidden="true" className="text-3xl">
                  {d.icon}
                </span>
                <span className="mt-2 font-display text-xl text-ink">{d.title}</span>
                <span className="mt-1 text-sm leading-relaxed text-ink-soft">{d.body}</span>
                <span className="mt-auto pt-3 text-sm font-semibold text-link">{d.cta} →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Quick starts */}
      <section aria-labelledby="try" className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 id="try" className="font-display text-3xl text-ink">
            Jump straight in
          </h2>
          <WeeklyPicks />
        </div>
      </section>

    </>
  );
}
