import type { Metadata } from "next";
import { Suspense, ViewTransition } from "react";
import Link from "next/link";
import { preload } from "react-dom";
import pool from "@/data/daily-pool.json";
import { disputes } from "@/content/disputes";
import { events } from "@/content/events";
import { site } from "@/content/site";
import { eras } from "@/lib/eras";
import { HeroPlay } from "@/components/home/HeroPlay";
import { HeroLeaderboard } from "@/components/home/HeroLeaderboard";
import { LegacyMapRedirect } from "@/components/home/LegacyMapRedirect";
import { JsonLd } from "@/components/site/PageHero";
import { WeeklyPicks } from "@/components/home/WeeklyPicks";
import { GlobeLazy } from "@/components/home/GlobeLazy";
import { DailyFact } from "@/components/home/DailyFact";
import { ExampleMatchup } from "@/components/home/ExampleMatchup";
import { home } from "@/content/home";

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
    body: "See who scored best today and who has the most points of all time. Sign up with your email and a nickname to join in.",
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
    body: `${events.length} key moments when land changed hands: when each was taken, and when (or whether) it was made official.`,
    cta: "Read the timeline",
  },
  {
    href: "/disputes",
    icon: "⚖️",
    title: "Disputed borders",
    body: `${disputes.length} places where control on the ground and international recognition don't match, from Crimea to Antarctica.`,
    cta: "See the disputes",
  },
  {
    href: "/teachers",
    icon: "🍎",
    title: "For teachers",
    body: "Everything in one place for the classroom: why maps distort, real sizes for every country, eras, border changes and disputes.",
    cta: "Open the teacher hub",
  },
];


export default function HomePage() {
  // start downloading the globe's country data with the page, instead of after its script loads
  preload("/data/globe.json", { as: "fetch", crossOrigin: "anonymous" });
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

      {/* Hero: today's game first, the map under it, today's leaderboard on the right, all over a floating globe */}
      <section
        data-hero
        className="relative isolate overflow-hidden bg-panel bg-[radial-gradient(ellipse_at_75%_40%,rgba(84,160,214,0.35),transparent_60%),linear-gradient(180deg,#0e2a47,#0a1f36)] text-panel-text"
      >
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="globe-float absolute left-1/2 top-[-4%] w-[120vw] max-w-[620px] -translate-x-1/2 opacity-35 lg:left-auto lg:right-[-6%] lg:top-[48%] lg:w-[min(62vw,880px)] lg:max-w-none lg:-translate-y-1/2 lg:translate-x-0 lg:opacity-60">
            {/* the same "world" as the map page: opening the map grows this globe into it */}
            <ViewTransition name="world" share="morph" default="none">
              <div>
                <GlobeLazy label={home.globeLabel} />
              </div>
            </ViewTransition>
          </div>
          {/* keep the headline and cards readable where they sit over the globe */}
          <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,#0b2036_0%,rgba(11,32,54,0.85)_38%,rgba(11,32,54,0)_62%)] lg:block" />
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-8 md:pb-20 md:pt-12">
          <p className="text-xs font-bold uppercase tracking-wide text-accent">{home.eyebrow}</p>
          <h1 className="mt-2 font-display text-4xl leading-[1.05] text-white md:text-6xl">{home.title}</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-panel-muted md:text-lg">{home.hub.mission}</p>
          <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
            <div className="grid gap-4">
              <HeroPlay />
              <Link
                href="/map"
                transitionTypes={["to-map"]}
                className="group flex items-center gap-4 rounded-card bg-white/10 p-5 text-white ring-1 ring-white/20 backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- our own small decorative globe picture */}
                <img
                  src="/globe-still.svg"
                  alt=""
                  width={56}
                  height={56}
                  className="size-14 shrink-0 rounded-full bg-[radial-gradient(circle_at_38%_32%,#b9def0,#4f8fbf_75%)] shadow-[0_0_24px_rgba(120,190,240,0.45)] transition-transform duration-700 group-hover:rotate-12"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold uppercase tracking-wide text-accent">{home.hub.mapEyebrow}</span>
                  <span className="mt-0.5 block font-display text-2xl leading-tight">{home.hub.mapTitle}</span>
                  <span className="mt-1 block text-sm text-panel-muted">{home.hub.mapLead}</span>
                </span>
                <span className="hidden shrink-0 font-bold text-accent sm:inline">
                  {home.hub.mapCta} <span aria-hidden="true" className="inline-block transition group-hover:translate-x-1">→</span>
                </span>
              </Link>
            </div>
            <HeroLeaderboard />
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
      </section>

      {/* Everything else: how a round works, the daily fact, then the directory */}
      <section aria-labelledby="round" className="mx-auto grid max-w-6xl gap-4 px-4 pt-12">
        <div className="grid items-center gap-6 rounded-card bg-white p-5 text-ink shadow-sm ring-1 ring-line md:grid-cols-[1fr_1.1fr] md:p-7">
          <div>
            <h2 id="round" className="font-display text-3xl">
              {home.hub.howTitle}
            </h2>
            <ol className="mt-4 space-y-4">
              {home.hub.steps.map(([title, body], i) => (
                <li key={title} className="flex gap-3">
                  <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-panel font-bold text-accent">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block font-bold">{title}</span>
                    <span className="block text-sm leading-relaxed text-ink-soft">{body}</span>
                  </span>
                </li>
              ))}
            </ol>
            <ul className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-ink-soft">
              {home.hub.howFacts.map((f) => (
                <li key={f} className="rounded-full bg-paper px-2.5 py-1 ring-1 ring-line">
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/daily" transitionTypes={["to-daily"]} className="mt-5 inline-block font-bold text-link hover:underline">
              {home.teaser.cta}
            </Link>
          </div>
          <ExampleMatchup />
        </div>
        {/* the fact and the weekly picks change by date, so they are filled in per request; the placeholders keep their space */}
        <Suspense fallback={<div aria-hidden="true" className="h-[341px] rounded-card bg-white shadow-sm ring-1 ring-line md:h-[185px]" />}>
          <DailyFact />
        </Suspense>
      </section>

      {/* Directory */}
      <section aria-labelledby="explore" className="mx-auto max-w-6xl px-4 pb-12 pt-14">
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
          <Suspense fallback={<div aria-hidden="true" className="h-[989px] sm:h-[512px] lg:h-[322px]" />}>
            <WeeklyPicks />
          </Suspense>
        </div>
      </section>

    </>
  );
}
