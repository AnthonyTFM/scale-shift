import type { Metadata } from "next";
import { DailyChallenge } from "@/components/daily/DailyChallenge";

export const metadata: Metadata = {
  title: "Daily challenge: which is bigger?",
  description:
    "Five new size puzzles every day. Web maps make some countries and empires look far bigger than they are. Can you tell which is really bigger?",
  alternates: { canonical: "/daily" },
};

export default function DailyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
      <p className="text-xs font-bold uppercase tracking-wide text-link">Daily challenge</p>
      <h1 className="mt-1 font-display text-4xl text-ink md:text-5xl">Which is bigger?</h1>
      <p className="mt-2 max-w-prose leading-relaxed text-ink-soft">
        Five new puzzles every day, the same for everyone. Normal web maps stretch land near the poles, so trust the numbers, not your eyes. New
        questions at midnight your time.
      </p>
      <div className="mt-6">
        <DailyChallenge />
      </div>
      <p className="mt-6 text-xs leading-relaxed text-muted">
        Areas are calculated from our map outlines (historical states at the snapshot shown), so they can differ from official figures by a few
        percent. Your scores and streak are saved in this browser only.
      </p>
    </div>
  );
}
