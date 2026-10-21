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
  // the globe's still picture is the largest thing on the first screen: fetch it before the CSS and scripts
  preload("/globe-still.svg", { as: "image", fetchPriority: "high" });
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
      <section data-hero className="relative isolate overflow-hidden bg-paper text-ink">
        <div className="pointer-events-none absolute inset-0 -z-10">
          {/* positioned with left/top, not translate: Chrome counted the translate-centred float as a layout shift */}
          <div className="globe-float absolute left-[calc(50%-min(60vw,310px))] top-[-4%] w-[120vw] max-w-[620px] opacity-30 lg:left-auto lg:right-[-6%] lg:top-[calc(48%-min(31vw,440px))] lg:w-[min(62vw,880px)] lg:max-w-none lg:opacity-70">
            {/* the same "world" as the map page: opening the map grows this globe into it */}
            <ViewTransition name="world" share="morph" default="none">
              <div>
                <GlobeLazy label={home.globeLabel} />
              </div>
            </ViewTransition>
          </div>
          {/* keep the headline and cards readable where they sit over the globe: the cream page fades over it */}
          <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,#fff8ec_0%,rgba(255,248,236,0.88)_38%,rgba(255,248,236,0)_62%)] lg:block" />
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-7 md:pb-14 md:pt-9">
          <p className="inline-block rounded-full bg-card px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary ring-1 ring-line">
            {home.eyebrow}
          </p>
          <h1 className="mt-3 font-display text-4xl leading-[1.05] text-ink md:text-5xl lg:text-6xl">
            {home.title.split(home.titleAccent).flatMap((part, i) =>
              i ? [<span key={i} className="text-red">{home.titleAccent}</span>, part] : [part],
            )}
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted md:text-lg">{home.hub.mission}</p>
          <dl className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted sm:gap-x-4 sm:text-sm">
            {[
              ["4,000", "years"],
              [String(eras.length), "map snapshots"],
              [String(events.length), "border events"],
              [String(pool.length), "daily puzzles"],
            ].map(([n, label]) => (
              // the mission already says "4,000 years", so phones skip that one to keep the row on one line
              <div key={label} className={`items-baseline gap-1.5 ${label === "years" ? "hidden sm:flex" : "flex"}`}>
                <dt className="sr-only">{label}</dt>
                <dd>
                  <span className="font-display text-base text-ink sm:text-lg">{n}</span> {label}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
            <div className="grid gap-4">
              <HeroPlay />
              <Link
                href="/map"
                transitionTypes={["to-map"]}
                className="press-card group flex items-center gap-4 rounded-card px-5 py-4 text-ink hover:border-primary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- our own small decorative globe picture */}
                <img
                  src="/globe-still.svg"
                  alt=""
                  width={56}
                  height={56}
                  className="size-12 shrink-0 rounded-full bg-[radial-gradient(circle_at_38%_32%,#eaf5ff,#9ccbec_75%)] ring-1 ring-line transition-transform duration-700 group-hover:rotate-12"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold uppercase tracking-wide text-primary">{home.hub.mapEyebrow}</span>
                  <span className="mt-0.5 block font-display text-xl leading-tight md:text-2xl">{home.hub.mapTitle}</span>
                  <span className="mt-1 block text-sm text-muted">{home.hub.mapLead}</span>
                </span>
                <span className="hidden shrink-0 font-bold text-primary sm:inline">
                  {home.hub.mapCta} <span aria-hidden="true" className="inline-block transition group-hover:translate-x-1">→</span>
                </span>
              </Link>
            </div>
            <HeroLeaderboard />
          </div>
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
                  <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-display text-white">
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
              className="flex h-full flex-col rounded-card bg-primary p-6 text-white shadow-[0_6px_0_0_var(--color-primary-shadow)] transition hover:bg-[#1d55d6] active:translate-y-1 active:shadow-[0_2px_0_0_var(--color-primary-shadow)]"
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
                className="press-card flex h-full flex-col rounded-card p-5 hover:border-primary"
              >
                <span aria-hidden="true" className="text-3xl">
                  {d.icon}
                </span>
                <span className="mt-2 font-display text-xl text-ink">{d.title}</span>
                <span className="mt-1 text-sm leading-relaxed text-muted">{d.body}</span>
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
