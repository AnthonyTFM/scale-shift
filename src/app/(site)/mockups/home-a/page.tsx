import type { Metadata } from "next";
import { home } from "@/content/home";
import { HeroPlay } from "@/components/home/HeroPlay";
import { HeroLeaderboard } from "@/components/home/HeroLeaderboard";
import { YesterdayMatchup } from "@/components/home/YesterdayMatchup";
import { HeroGlobe, MapCard, MockupBar, PlaceList, Stats, Steps, Title, mockMeta } from "../parts";

export const metadata: Metadata = { title: "Homepage mockup A", ...mockMeta };

/** A · Trim: today's hero as it is, then yesterday's matchup with the three steps, then a compact list of pages. */
export default function MockA() {
  return (
    <>
      <MockupBar current="a" note="Same hero as today. Below it: yesterday's matchup and how to play, then a compact list of pages. Removed: the Greenland example, the daily fact, the big directory and 'Jump straight in'." />
      <section className="relative isolate overflow-hidden bg-paper text-ink">
        <HeroGlobe />
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-7 md:pb-14 md:pt-9">
          <p className="inline-block rounded-full bg-card px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary ring-1 ring-line">{home.eyebrow}</p>
          <Title />
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted md:text-lg">{home.hub.mission}</p>
          <Stats />
          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
            <div className="grid gap-4">
              <HeroPlay />
              <MapCard />
            </div>
            <HeroLeaderboard />
          </div>
        </div>
      </section>
      <div className="mx-auto grid max-w-6xl gap-4 px-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
        <YesterdayMatchup />
        <section aria-labelledby="how-h" className="card p-5 md:p-6">
          <h2 id="how-h" className="font-display text-2xl text-ink">
            {home.hub.howTitle}
          </h2>
          <div className="mt-4 [&_ol]:sm:grid-cols-1">
            <Steps />
          </div>
        </section>
      </div>
      <section aria-labelledby="more-h" className="mx-auto max-w-6xl px-4 pb-12 pt-10">
        <h2 id="more-h" className="font-display text-2xl text-ink md:text-3xl">
          More to explore
        </h2>
        <div className="mt-4">
          <PlaceList />
        </div>
      </section>
    </>
  );
}
