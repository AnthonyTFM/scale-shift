import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/site/PageHero";
import { Archive } from "@/components/daily/Archive";
import { dailyCopy as t } from "@/content/daily";

export const metadata: Metadata = {
  title: t.archive.metaTitle,
  description: t.archive.metaDescription,
  alternates: { canonical: "/daily/archive" },
};

/** Every past day's five, picked from a list (`?day=N` plays one). Nothing here touches streaks or the leaderboard. */
export default function ArchivePage() {
  return (
    <>
      <PageHero center compact game eyebrow={t.archive.eyebrow} title={t.archive.title} lead={<p>{t.archive.lead}</p>} />
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-3 sm:pt-6 md:pb-10">
        <div className="mx-auto max-w-2xl">
          <Suspense fallback={null}>
            <Archive />
          </Suspense>
          <p className="mt-6 text-xs leading-relaxed text-muted">{t.note}</p>
        </div>
      </div>
    </>
  );
}
