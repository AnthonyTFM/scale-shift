import { PageHero } from "@/components/site/PageHero";
import type { Metadata } from "next";
import { EndlessGame } from "@/components/endless/EndlessGame";
import { endlessCopy as t } from "@/content/endless";

export const metadata: Metadata = {
  title: "Endless mode: which is bigger?",
  description:
    "One size matchup after another, each a closer call than the last. Web maps make some countries and empires look far bigger than they are. How long can you go without a miss?",
  alternates: { canonical: "/endless" },
};

export default function EndlessPage() {
  return (
    <>
      <PageHero
        center
        compact
        eyebrow={t.eyebrow}
        title={t.title}
        lead={
          <p>
            <span className="sm:hidden">{t.leadShort}</span>
            <span className="hidden sm:inline">{t.lead}</span>
          </p>
        }
      />
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-3 sm:pt-6 md:pb-10">
        <div className="mx-auto max-w-2xl">
          <EndlessGame />
          <p className="mt-6 text-xs leading-relaxed text-muted">
            Areas are calculated from our map outlines (historical states at the snapshot shown), so they can differ from official figures by a few
            percent. Your best run is saved in this browser only.
          </p>
        </div>
      </div>
    </>
  );
}
