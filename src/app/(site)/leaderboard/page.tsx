import { PageHero } from "@/components/site/PageHero";
import type { Metadata } from "next";
import Link from "next/link";
import { LeaderboardView } from "@/components/daily/LeaderboardView";
import { SignInProvider } from "@/components/daily/SignInProvider";
import { AccountBar } from "@/components/daily/AccountBar";

export const metadata: Metadata = {
  title: "Leaderboard: daily challenge scores",
  description: "Today's top scores in the daily size challenge, the players with the most points of all time, and the longest runs in endless mode.",
  alternates: { canonical: "/leaderboard" },
};

export default function LeaderboardPage() {
  return (
    <>
      <PageHero
        eyebrow="Daily challenge"
        title="Leaderboard"
        lead={
          <p>
            Think you know the world? Prove it. Finish the <Link href="/daily" className="font-semibold text-primary underline">
              daily challenge
            </Link>, sign in with your email and pick a nickname. Your score
            lands here. Every correct answer adds a point to the all-time ranking. Your longest run in{" "}
            <Link href="/endless" className="font-semibold text-primary underline">
              endless mode
            </Link>{" "}
            goes on the Endless board.
          </p>
        }
      />
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <div className="max-w-2xl">
          <SignInProvider>
            <AccountBar />
            <LeaderboardView />
          </SignInProvider>
          <p className="mt-6 text-xs leading-relaxed text-muted">
            Scores are checked on our server, and only your first try each day counts (in endless mode, your longest run does). Each email gets one player, and each nickname belongs to the
            first player who uses it. Emails stay private. Nicknames are public; slurs and offensive names are blocked, and we remove any that slip through.
            Signed in? &ldquo;Delete my data&rdquo; above removes everything. Otherwise,{" "}
            <Link href="/contact?topic=other" className="underline">
              contact us
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}
