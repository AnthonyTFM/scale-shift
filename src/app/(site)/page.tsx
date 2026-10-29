import type { Metadata } from "next";
import { ViewTransition } from "react";
import Link from "next/link";
import { disputes } from "@/content/disputes";
import { events } from "@/content/events";
import { site } from "@/content/site";
import { eras } from "@/lib/eras";
import { HeroPlay } from "@/components/home/HeroPlay";
import { HeroEndless } from "@/components/home/HeroEndless";
import { HeroLeaderboard } from "@/components/home/HeroLeaderboard";
import { LegacyMapRedirect } from "@/components/home/LegacyMapRedirect";
import { JsonLd } from "@/components/site/PageHero";
import { GlobeLazy } from "@/components/home/GlobeLazy";
import { YesterdayMatchup } from "@/components/home/YesterdayMatchup";
import { BookIcon, ColumnsIcon, DisputeIcon, MapIcon, TimelineIcon, TrophyIcon } from "@/components/site/Icons";
import { home } from "@/content/home";

export const metadata: Metadata = {
  title: { absolute: `${site.name}: real country sizes, 2000 BCE to today` },
  description: site.description,
  alternates: { canonical: "/" },
};

const x = home.explore;
const places = [
  { href: "/leaderboard", Icon: TrophyIcon, title: "Leaderboard", line: x.leaderboard },
  { href: "/eras", Icon: ColumnsIcon, title: "Eras", line: x.eras(eras.length) },
  { href: "/timeline", Icon: TimelineIcon, title: "Timeline", line: x.timeline(events.length) },
  { href: "/disputes", Icon: DisputeIcon, title: "Disputed borders", line: x.disputes(disputes.length) },
  { href: "/teachers", Icon: BookIcon, title: "For teachers", line: x.teachers },
];

function MapCard() {
  return (
    <Link href="/map" transitionTypes={["to-map"]} className="press-card group flex items-center gap-4 rounded-card px-5 py-4 text-ink hover:border-primary">
      <MapIcon className="size-11 transition-transform duration-500 group-hover:-rotate-6" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold uppercase tracking-wide text-primary">{home.hub.mapEyebrow}</span>
        <span className="mt-0.5 block font-display text-xl leading-tight md:text-2xl">{home.hub.mapTitle}</span>
        <span className="mt-1 block text-sm text-muted">{home.hub.mapLead}</span>
      </span>
      <span className="hidden shrink-0 font-bold text-primary sm:inline">
        {home.hub.mapCta} <span aria-hidden="true" className="inline-block transition group-hover:translate-x-1">→</span>
      </span>
    </Link>
  );
}

export default function HomePage() {
  // globe.json and globe-still.svg are preloaded by a header for "/" only (next.config.ts): preload() here leaked
  // into every page that prefetches the homepage
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

      {/* Hero: the claim, the two games side by side (today's five and endless mode), the Best streaks board, yesterday's
          matchup and the map, all over a slowly turning globe */}
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
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 md:pb-12 md:pt-9">
          {/* games first. A first visit gets the big claim; anyone who has played gets one line (see .returning) */}
          <div className="hero-new">
            <h1 className="font-display text-4xl leading-[1.05] text-ink md:text-5xl lg:text-6xl">
              {home.title.split(home.titleAccent).flatMap((part, i) =>
                i ? [<span key={i} className="text-red">{home.titleAccent}</span>, part] : [part],
              )}
            </h1>
            {/* phones get one line, so the games start on the first screen */}
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted md:text-lg">
              <span className="sm:hidden">{home.hub.missionShort}</span>
              <span className="hidden sm:inline">{home.hub.mission}</span>
            </p>
          </div>
          <p aria-hidden="true" className="hero-back font-display text-2xl leading-tight text-ink md:text-3xl">
            {home.hub.welcomeBack}
          </p>
          {/* phones: the two games side by side, then the Best streaks board (competition first), the map and
              yesterday's matchup. Computers: the two games as short banners on the left with the map under them and
              the Best streaks board beside all three, then yesterday's matchup (placed in globals.css, .hero-grid).
              Each part is rendered once, in the same order at every width, so keyboard order follows the screen */}
          <div className="hero-grid mt-4 grid grid-cols-2 gap-3 md:mt-6 md:gap-4">
            <HeroPlay />
            <HeroEndless />
            <div className="hero-board col-span-2">
              <HeroLeaderboard />
            </div>
            <div className="hero-map col-span-2">
              <MapCard />
            </div>
            <div className="hero-yday col-span-2">
              <YesterdayMatchup />
            </div>
          </div>
        </div>
      </section>

      {/* the rest of the site */}
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-2">
        <section aria-labelledby="explore">
          <h2 id="explore" className="font-display text-2xl text-ink md:text-3xl">
            {x.title}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {places.map(({ href, Icon, title, line }) => (
              <li key={href}>
                <Link href={href} className="press-card flex min-h-16 items-center gap-3 rounded-card px-4 py-3 hover:border-primary">
                  <Icon className="size-8" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-lg leading-tight text-ink">{title}</span>
                    <span className="block text-sm text-muted">{line}</span>
                  </span>
                  <span aria-hidden="true" className="font-bold text-primary">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
