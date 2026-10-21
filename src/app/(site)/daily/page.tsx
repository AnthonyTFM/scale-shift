import { PageHero } from "@/components/site/PageHero";
import type { Metadata } from "next";
import { ViewTransition } from "react";
import { DailyChallenge } from "@/components/daily/DailyChallenge";
import { SignInProvider } from "@/components/daily/SignInProvider";
import { dailyCopy as t } from "@/content/daily";

export const metadata: Metadata = {
  title: "Daily challenge: which is bigger?",
  description:
    "Five new size puzzles every day. Web maps make some countries and empires look far bigger than they are. Can you tell which is really bigger?",
  alternates: { canonical: "/daily" },
};

export default function DailyPage() {
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
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-4 sm:pt-8 md:py-10">
        <div className="mx-auto max-w-2xl">
          {/* the homepage's play card grows into the game */}
          <ViewTransition name="daily-card" share="morph" default="none">
            <div>
              <SignInProvider>
                <DailyChallenge />
              </SignInProvider>
            </div>
          </ViewTransition>
          <p className="mt-6 text-xs leading-relaxed text-muted">
            Areas are calculated from our map outlines (historical states at the snapshot shown), so they can differ from official figures by a few
            percent. Your scores and streak are saved in this browser only.
          </p>
        </div>
      </div>
    </>
  );
}
