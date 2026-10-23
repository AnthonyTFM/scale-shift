import type { Metadata } from "next";
import { home } from "@/content/home";
import { HeroPlay } from "@/components/home/HeroPlay";
import { HeroLeaderboard } from "@/components/home/HeroLeaderboard";
import { YesterdayMatchup } from "@/components/home/YesterdayMatchup";
import { HeroGlobe, MapCard, MockupBar, PlaceList, Title, mockMeta } from "../parts";

export const metadata: Metadata = { title: "Homepage mockup B", ...mockMeta };

/** B · Yesterday leads: yesterday's matchup is the hero's picture, next to today's game; the leaderboard moves below. */
export default function MockB() {
  return (
    <>
      <MockupBar current="b" note="Yesterday's matchup is the first picture you see, right under today's game: it shows the trick before you play. Leaderboard and pages follow. No separate how-to section." />
      <section className="relative isolate overflow-hidden bg-paper text-ink">
        <HeroGlobe />
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 md:pb-12 md:pt-9">
          <Title />
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted md:text-lg">{home.hub.mission}</p>
          <div className="mt-6 grid gap-4 lg:grid-cols-2 lg:items-start">
            <div className="grid gap-4">
              <HeroPlay />
              <div className="hidden lg:block">
                <MapCard />
              </div>
            </div>
            <YesterdayMatchup compact />
            <div className="lg:hidden">
              <MapCard />
            </div>
          </div>
        </div>
      </section>
      <div className="mx-auto grid max-w-6xl gap-4 px-4 pb-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-start">
        <HeroLeaderboard />
        <section aria-labelledby="more-h">
          <h2 id="more-h" className="font-display text-2xl text-ink md:text-3xl">
            More to explore
          </h2>
          <div className="mt-4 [&_ul]:lg:grid-cols-1">
            <PlaceList />
          </div>
        </section>
      </div>
    </>
  );
}
