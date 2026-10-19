import { PageHero } from "@/components/site/PageHero";
import type { Metadata } from "next";
import { DailyChallenge } from "@/components/daily/DailyChallenge";
import { SignInProvider } from "@/components/daily/SignInProvider";

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
        eyebrow="Daily challenge"
        title="Which is bigger?"
        lead={
          <p>
            5 matchups a day, the same for everyone. Normal maps stretch land near the poles, so your eyes will lie to you. Go 5 for 5 and climb the
            leaderboard. New matchups at midnight your time.
          </p>
        }
      />
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <div className="max-w-2xl">
          <div>
            <SignInProvider>
              <DailyChallenge />
            </SignInProvider>
          </div>
          <p className="mt-6 text-xs leading-relaxed text-muted">
            Areas are calculated from our map outlines (historical states at the snapshot shown), so they can differ from official figures by a few
            percent. Your scores and streak are saved in this browser only.
          </p>
        </div>
      </div>
    </>
  );
}
