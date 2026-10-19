import type { Metadata } from "next";
import Link from "next/link";
import { LeadForm } from "@/components/LeadForm";
import { PageShell } from "@/components/SiteChrome";
import { site } from "@/content/site";
import { getIndex } from "@/lib/data-server";
import { yearLabel } from "@/lib/format";
import { mercatorInflation } from "@/lib/geo";

export const metadata: Metadata = {
  title: "How it works: true size, Mercator and historical borders",
  description:
    "How Scale Shift keeps every shape at its true area, where the historical borders come from, what “all claims” means, and the limits of the data.",
  alternates: { canonical: "/about" },
};

const LATITUDES = [0, 20, 40, 50, 60, 70, 80];

export default function About() {
  const ix = getIndex();
  return (
    <PageShell>
      <h1 className="font-display text-[2.6rem] leading-[1.05] sm:text-[3.4rem]">How it works</h1>
      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_340px]">
        <article className="prose-atlas">
          <p className="text-lg">
            Scale Shift is a world map that never lies about size. Drag any country, state or historical empire, and it is redrawn at the size it
            would really appear in its new spot.
          </p>

          <h2>Why flat maps stretch</h2>
          <p>
            The Mercator projection, used by almost every web map, keeps angles correct so a straight line is a constant compass bearing. The cost
            is area. Shapes are inflated more the further they are from the equator:
          </p>
          <table className="my-4 w-full max-w-sm text-left text-sm">
            <caption className="sr-only">Mercator area inflation by latitude</caption>
            <thead>
              <tr className="border-b border-paper-3 text-ink-soft">
                <th scope="col" className="py-1.5">
                  Latitude
                </th>
                <th scope="col" className="py-1.5 text-right">
                  Drawn this many times too large
                </th>
              </tr>
            </thead>
            <tbody>
              {LATITUDES.map((l) => (
                <tr key={l} className="border-b border-paper-3">
                  <td className="py-1.5">{l}°</td>
                  <td className="py-1.5 text-right tabular-nums">{mercatorInflation(l).toFixed(1)}×</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>How we keep shapes honest</h2>
          <p>
            When you drag a shape, we don&apos;t slide it across the flat map. We rotate every point of its outline around the globe so its centre
            lands under your pointer, then project it again. Rotation on a sphere never changes area, so the outline you see is exactly what that
            territory would look like at its new latitude. Areas are measured on a sphere with the Earth&apos;s mean radius (6,371 km); they can
            differ from official figures by a few percent because outlines are simplified.
          </p>

          <h2>Where the borders come from</h2>
          <ul>
            <li>
              <strong>Historical maps ({yearLabel(ix.years[0])} to {yearLabel(ix.years[ix.years.length - 2])})</strong>: the open
              historical-basemaps dataset by André Ourednik and contributors, licensed under GPL-3.0. We use its {ix.years.length - 1} snapshots
              from 1 BC onward.
            </li>
            <li>
              <strong>Today</strong>: Natural Earth 1:50m countries and states, in the public domain.
            </li>
          </ul>
          <p>
            There is no year 0 in the calendar: 1 BC is followed directly by AD 1, so our earliest map is 1 BC.
          </p>

          <h2>What “all claims” means</h2>
          <p>
            Where the source marks territories as subject to another power (colonies, vassal states, khanates of a larger empire), we combine them
            into one shape named, for example, “Mongol Empire (all claims)”. It shows the reach of a power, not land it governed directly.
          </p>

          <h2>Limits worth knowing</h2>
          <ul>
            <li>Pre-modern borders were rarely lines. Many shapes show approximate zones of control, and each one is marked with its precision.</li>
            <li>Some features in the source are cultural regions or peoples rather than states. They are included because they were mapped.</li>
            <li>Disputed borders follow the source data and do not take a political position.</li>
            <li>Snapshots are uneven: dense for recent centuries, roughly a century apart before 1300.</li>
          </ul>

          <h2>Credits</h2>
          <p>
            Inspired by the long tradition of true-size maps in classrooms. Built with open data and open-source tools including d3-geo. Questions
            or ideas? Use the form on this page.
          </p>
          <p>
            <Link href="/">Open the map</Link>
          </p>
        </article>

        <aside className="self-start rounded-2xl bg-white p-5 ring-1 ring-paper-3 lg:sticky lg:top-6" aria-labelledby="correction-title">
          <h2 id="correction-title" className="font-display text-2xl leading-tight">
            {site.correctionForm.title}
          </h2>
          <p className="mb-4 mt-1 text-sm text-ink-soft">{site.correctionForm.body}</p>
          <LeadForm kind="correction" buttonLabel={site.correctionForm.button} successText={site.correctionForm.success} />
        </aside>
      </div>
    </PageShell>
  );
}
