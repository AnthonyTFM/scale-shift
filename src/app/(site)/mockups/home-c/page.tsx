import type { Metadata } from "next";
import Link from "next/link";
import { home } from "@/content/home";
import { HeroPlay } from "@/components/home/HeroPlay";
import { HeroLeaderboard } from "@/components/home/HeroLeaderboard";
import { YesterdayMatchup } from "@/components/home/YesterdayMatchup";
import { MapIcon } from "@/components/site/Icons";
import { HeroGlobe, MockupBar, places, Title, mockMeta } from "../parts";

export const metadata: Metadata = { title: "Homepage mockup C", ...mockMeta };

/** C · Launcher: a short headline, then everything as tiles, like a game's start screen. The shortest page. */
export default function MockC() {
  return (
    <>
      <MockupBar current="c" note="Like a game's start screen: a short headline, then tiles. Today's game is the big one; the map, yesterday's matchup and the leaderboard sit beside it; the other pages are small tiles. Shortest of the three." />
      <section className="relative isolate overflow-hidden bg-paper text-ink">
        <HeroGlobe />
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-6 md:pt-9">
          <Title small />
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted md:text-base">
            Normal maps draw the countries you know the wrong size. Play today&apos;s game, or drag any country to its real size.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="md:col-span-2">
              <HeroPlay />
            </div>
            <Link href="/map" transitionTypes={["to-map"]} className="press-card group flex flex-col justify-between gap-3 rounded-card p-5 hover:border-primary">
              <span className="flex items-center gap-3">
                <MapIcon className="size-10" />
                <span className="font-display text-2xl leading-tight text-ink">The map</span>
              </span>
              <span className="text-sm text-muted">{home.hub.mapLead}</span>
              <span className="font-bold text-primary">
                {home.hub.mapCta} <span aria-hidden="true">→</span>
              </span>
            </Link>
            <div className="md:col-span-2 lg:col-span-2">
              <YesterdayMatchup compact />
            </div>
            <HeroLeaderboard />
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {places.filter((p) => p.href !== "/leaderboard").map(({ href, Icon, title }) => (
              <li key={href}>
                <Link href={href} className="press-card flex h-full min-h-20 flex-col items-start justify-center gap-2 rounded-card px-4 py-3 hover:border-primary">
                  <Icon className="size-7" />
                  <span className="font-display text-base leading-tight text-ink">{title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
