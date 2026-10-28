import Link from "next/link";
import { PageHero } from "@/components/site/PageHero";
import { accountCopy } from "@/content/account";

const U = accountCopy.unsubscribe;

/** Landing page after a reminder-email unsubscribe link. */
export function UnsubscribeResult({ failed }: { failed: boolean }) {
  return (
    <>
      <PageHero eyebrow={U.eyebrow} title={failed ? U.failedTitle : U.title} lead={<p>{failed ? U.failedLead : U.lead}</p>} />
      <div className="mx-auto flex max-w-3xl flex-wrap gap-3 px-4 py-10">
        <Link href="/daily" className="btn btn-primary">
          {U.play}
        </Link>
        <Link href="/contact?topic=other" className="btn btn-white">
          {U.contact}
        </Link>
      </div>
    </>
  );
}
