import type { Metadata } from "next";
import { Suspense } from "react";
import { site } from "@/content/site";
import { FeedbackForm } from "@/components/site/FeedbackForm";
import { PageHero } from "@/components/site/PageHero";

export const metadata: Metadata = {
  title: "Report a border error or send feedback",
  description: "Found a wrong border, a missing empire or a bug? Tell us. Corrections are published on the About page.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Help us get it right"
        title="Report a border error"
        lead={<p>4,000 years of borders is a lot to get right. If something is off, tell us. A source link helps us fix it quickly.</p>}
      />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[1fr_320px]">
        <Suspense fallback={<div className="h-[600px] animate-pulse rounded-card bg-line" aria-busy="true" />}>
          <FeedbackForm />
        </Suspense>
        <aside className="space-y-4 text-sm text-ink-soft">
          <div className="rounded-card border border-line bg-white p-5">
            <h2 className="font-bold text-ink">What makes a great report</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>The place and the year or era</li>
              <li>What it shows vs. what it should show</li>
              <li>A source: an encyclopedia, a treaty text, or a scholarly atlas</li>
            </ul>
          </div>
          <div className="rounded-card border border-line bg-white p-5">
            <h2 className="font-bold text-ink">Prefer email?</h2>
            <p className="mt-1">
              <a className="font-semibold text-link underline" href={`mailto:${site.contactEmail}`}>
                {site.contactEmail}
              </a>
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
