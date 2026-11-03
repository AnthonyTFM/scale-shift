import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { DailyChallenge } from "@/components/daily/DailyChallenge";
import { SignInProvider } from "@/components/daily/SignInProvider";
import { PageHero } from "@/components/site/PageHero";
import { dailyCopy as t } from "@/content/daily";
import { challengeFromParam } from "@/lib/challenge";

type Props = { params: Promise<{ c: string }> };

// The friend's name and score are in the address, so the page is drawn on request (the header's "current page" mark
// reads the address too). Share links are few, and the game itself loads the same way as on /daily.
export const instant = false;

/**
 * A friend's "beat my score" link: /d/<day>.<score>.<name>. The same daily game as /daily, with the friend's score
 * above it and, once played, the two scores side by side. A page (not a #link) so a text or a post shows a preview
 * with the score to beat. Never indexed: the game lives at /daily.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = challengeFromParam((await params).c);
  if (!c) return { title: t.challenge.eyebrow, robots: { index: false, follow: false } };
  return {
    title: t.challenge.metaTitle(c.name, c.score, c.day),
    description: t.challenge.metaDescription,
    robots: { index: false, follow: false },
    alternates: { canonical: "/daily" },
  };
}

export default async function ChallengePage({ params }: Props) {
  const c = challengeFromParam((await params).c);
  if (!c) notFound();
  return (
    <>
      <div className="daily-intro">
        <PageHero
          center
          compact
          game
          eyebrow={t.challenge.eyebrow}
          title={t.title}
          // named by day number, not "today": the game itself tells the player when that day has gone
          lead={<p>{t.challenge.lead(c.name, c.score, c.day)}</p>}
        />
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-3 sm:pt-6 md:pb-10">
        <div className="mx-auto max-w-2xl">
          <ViewTransition name="daily-card" share="morph" default="none">
            <div>
              <SignInProvider>
                <DailyChallenge />
              </SignInProvider>
            </div>
          </ViewTransition>
          <p className="mt-6 text-xs leading-relaxed text-muted">{t.note}</p>
        </div>
      </div>
    </>
  );
}
