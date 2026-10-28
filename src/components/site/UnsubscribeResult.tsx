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
              ? "The unsubscribe link was incomplete. You can turn reminders off on your account page (Menu → Your account), or contact us and we'll do it for you."
              : "You won't get any more daily challenge reminders. Your streak and scores stay saved."}
          </p>
        }
      />
      <div className="mx-auto flex max-w-3xl flex-wrap gap-3 px-4 py-10">
        <Link href="/daily" className="btn btn-primary">
          Play today&apos;s five
        </Link>
        <Link href="/contact?topic=other" className="btn btn-white">
          Contact us
        </Link>
      </div>
    </>
  );
}
