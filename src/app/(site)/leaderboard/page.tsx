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
              <Link href="/daily" className="font-semibold text-primary underline">
                {t.lead.daily}
              </Link>
              {t.lead.middle}
              <Link href="/endless" className="font-semibold text-primary underline">
                {t.lead.endless}
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
            {/* below the boards, so on phones the boards start on the first screen */}
            <div className="mt-6">
              <AccountBar />
            </div>
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
