import { PageHero } from "@/components/site/PageHero";
import type { Metadata } from "next";
import Link from "next/link";
import { LeaderboardView } from "@/components/daily/LeaderboardView";
import { SignInProvider } from "@/components/daily/SignInProvider";
import { AccountBar } from "@/components/daily/AccountBar";
import { leaderboardCopy as t } from "@/content/leaderboard";

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  alternates: { canonical: "/leaderboard" },
};

export default function LeaderboardPage() {
  return (
    <>
      <PageHero
        compact
        eyebrow={t.eyebrow}
        title={t.title}
        lead={
          <>
            <p className="sm:hidden">{t.leadShort}</p>
            <p className="hidden sm:block">
              {t.lead.before}
              <Link href="/endless" className="font-semibold text-primary underline">
                {t.lead.endless}
              </Link>
              {t.lead.middle}
              <Link href="/daily" className="font-semibold text-primary underline">
                {t.lead.daily}
              </Link>
              {t.lead.after}
            </p>
          </>
        }
      />
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-4 md:py-10">
        <div className="max-w-2xl">
          <SignInProvider>
            <LeaderboardView />
            {/* below the board, so on phones the board starts on the first screen */}
            <div className="mt-6">
              <AccountBar />
            </div>
          </SignInProvider>
          <p className="mt-6 text-xs leading-relaxed text-muted">
            {t.rules}
            <Link href="/contact?topic=other" className="underline">
              {t.contact}
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}
