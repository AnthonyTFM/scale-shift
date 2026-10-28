import type { Metadata } from "next";
import { events } from "@/content/events";
import { PageHero } from "@/components/site/PageHero";
import { TimelineFilter } from "@/components/site/TimelineFilter";

export const metadata: Metadata = {
  title: "When land changed hands: taken vs made official",
  description: `${events.length} territorial changes from 1550 BCE to today. For each one: the year control changed and the year it was made official by treaty or recognition, if ever.`,
  alternates: { canonical: "/timeline" },
};

export default function TimelinePage() {
  const avgGap = Math.round(
    events.filter((e) => e.formalized !== null && e.formalized > e.taken).reduce((s, e, _, a) => s + (e.formalized! - e.taken) / a.length, 0),
  );
  return (
    <>
      <PageHero
        eyebrow="Timeline"
        title="When land was taken, and when it became official"
        lead={
          <p>
            Borders change twice: once on the ground, and again on paper. Each event shows both dates. Where the paperwork came later, the gap in
            this list averages about {avgGap} years.
          </p>
        }
      />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <TimelineFilter />
      </div>
    </>
  );
}
