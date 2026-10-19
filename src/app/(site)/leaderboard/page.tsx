import type { Metadata } from "next";
import Link from "next/link";
import { LeaderboardView } from "@/components/daily/LeaderboardView";

export const metadata: Metadata = {
  title: "Leaderboard: daily challenge scores",
  description: "Who scored best in today's Which is bigger? challenge, and who has the most points of all time.",
  alternates: { canonical: "/leaderboard" },
};

export default function LeaderboardPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
      <p className="text-xs font-bold uppercase tracking-wide text-link">Daily challenge</p>
      <h1 className="mt-1 font-display text-4xl text-ink md:text-5xl">Leaderboard</h1>
      <p className="mt-2 leading-relaxed text-ink-soft">
        Finish the <Link href="/daily" className="font-semibold text-link hover:underline">daily challenge</Link>, pick a nickname, and your
        score lands here. Each day has its own board, and every correct answer adds a point to the all-time ranking.
      </p>
      <div className="mt-6">
        <LeaderboardView />
      </div>
      <p className="mt-6 text-xs leading-relaxed text-muted">
        Scores are checked on our server, and only your first try each day counts. Nicknames are public; offensive ones are blocked. Want yours
        removed? <Link href="/contact?topic=other" className="underline">Contact us</Link>.
      </p>
    </div>
  );
}
