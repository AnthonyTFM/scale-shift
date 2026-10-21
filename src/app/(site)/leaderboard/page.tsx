import { PageHero } from "@/components/site/PageHero";
import type { Metadata } from "next";
import Link from "next/link";
import { LeaderboardView } from "@/components/daily/LeaderboardView";
import { SignInProvider } from "@/components/daily/SignInProvider";
import { AccountBar } from "@/components/daily/AccountBar";

export const metadata: Metadata = {
  title: "Leaderboard: daily challenge scores",
  description: "Today's top scores in the daily size challenge, plus the players with the most points of all time.",
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
            </Link>, sign up with your email and a nickname, and
            your score lands here. Every correct answer adds a point to the all-time ranking.
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
            Scores are checked on our server, and only your first try each day counts. Each email gets one player, and each nickname belongs to the
            first player who uses it. Emails stay private. Nicknames are public; slurs and offensive names are blocked, however they&apos;re spelled.
            Want yours removed?{" "}
            <Link href="/contact?topic=other" className="underline">
              Contact us
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}
