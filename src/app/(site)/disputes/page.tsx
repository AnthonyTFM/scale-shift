import type { Metadata } from "next";
import Link from "next/link";
import { disputes } from "@/content/disputes";
import dataVersion from "@/data/data-version.json";
import { formatYear } from "@/lib/eras";
import { mapLink } from "@/lib/share";
import { PageHero } from "@/components/site/PageHero";

export const metadata: Metadata = {
  title: "Disputed borders today: who controls them vs. who claims them",
  description:
    "Crimea, Kashmir, Taiwan, Western Sahara, Golan Heights and more: who controls each territory, since when, who claims it and whether that control has ever been formally recognized.",
  alternates: { canonical: "/disputes" },
};

export default function DisputesPage() {
  return (
    <>
      <PageHero
        eyebrow="Present day"
        title="Disputed borders: control vs. recognition"
        lead={
          <p>
            Maps have to choose a line. Ours draws who actually controls the land (from Natural Earth). Click any country on today&apos;s map and
            its disputes appear first: who controls the land, since when, who claims it and whether that control was ever made official.
          </p>
        }
      />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="mb-6 rounded-card border-2 border-gold bg-gold-soft p-4 text-sm text-ink">
          Status can change quickly. These summaries were reviewed when this site was built. Check current news before citing them, and{" "}
          <Link href="/contact?topic=border" className="font-semibold underline">
            tell us
          </Link>{" "}
          if something is out of date.
        </p>
        <ol className="grid gap-4 md:grid-cols-2">
          {disputes.map((d) => (
            <li key={d.id} id={d.id} className="card scroll-mt-24 p-5">
              {/* decorative: the name and the map link below say where it is; the facts flow beside it */}
              {/* eslint-disable-next-line @next/next/no-img-element -- a small prerendered SVG, nothing to optimise */}
              <img
                src={`/dispute-maps/${d.id}?v=${dataVersion.v}-${d.lon}-${d.lat}`}
                alt=""
                width={160}
                height={160}
                loading="lazy"
                decoding="async"
                className="float-right mb-2 ml-4 size-20"
              />
              <h2 className="font-display text-xl text-ink">{d.name}</h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Controlled by</dt>
                  <dd className="font-semibold text-ink">{d.controlledBy}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Control since</dt>
                  <dd className="font-semibold text-ink">{formatYear(d.taken)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Claimed by</dt>
                  <dd className="text-ink">{d.claimedBy.join(", ")}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Made official?</dt>
                  <dd className="text-ink">{d.formalStatus}</dd>
                </div>
              </dl>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{d.summary}</p>
              <Link href={mapLink("present", [d.lon, d.lat])} className="-mb-2 mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-link hover:underline">
                See it on the map →
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
