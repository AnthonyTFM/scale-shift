import Link from "next/link";
import { PageHero } from "@/components/site/PageHero";

/** Landing page after a reminder-email unsubscribe link. */
export function UnsubscribeResult({ failed }: { failed: boolean }) {
  return (
    <>
      <PageHero
        eyebrow="Reminder emails"
        title={failed ? "That link didn't work" : "You're unsubscribed"}
        lead={
          <p>
            {failed
              ? "The unsubscribe link was incomplete. Turn reminders off from the results screen after a daily round, or contact us and we'll do it for you."
              : "You won't get any more daily challenge reminders. Your nickname and scores stay on the leaderboard."}
          </p>
        }
      />
      <div className="mx-auto flex max-w-3xl flex-wrap gap-3 px-4 py-10">
        <Link href="/daily" className="inline-flex h-11 items-center rounded-lg bg-accent px-4 font-bold text-panel hover:bg-accent-strong">
          Play today&apos;s challenge
        </Link>
        <Link href="/contact?topic=other" className="inline-flex h-11 items-center rounded-lg border border-line px-4 font-bold text-ink hover:bg-white">
          Contact us
        </Link>
      </div>
    </>
  );
}
