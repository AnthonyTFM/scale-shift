import type { Metadata } from "next";
import Link from "next/link";
import { knownLimitations } from "@/content/corrections";
import dataCorrections from "@/content/data-corrections.json";
import { events } from "@/content/events";
import { disputes } from "@/content/disputes";
import { site } from "@/content/site";
import { eras, formatYear } from "@/lib/eras";
import { JsonLd, PageHero } from "@/components/site/PageHero";

export const metadata: Metadata = {
  title: "About, sources and accuracy",
  description: `How ${site.name} works, where every border comes from, how accurate it is and the data errors we have corrected.`,
  alternates: { canonical: "/about" },
};

const faqs = [
  {
    q: "Why do countries change size when I drag them?",
    a: "Web maps use the Mercator projection, which stretches areas more and more toward the poles (by 1/cos² of the latitude). When you drag a shape, we move it across the globe and redraw it, so you see how big it really is at its new latitude.",
  },
  {
    q: "How accurate are the historical borders?",
    a: "Before about 1650 the source marks almost every border as approximate. From 1650 it rates most borders as precise, set by treaties. Many peoples had no fixed borders at all, so those lines are scholarly estimates of zones of control.",
  },
  {
    q: "What do 'taken' and 'made official' mean?",
    a: "'Taken' is when control on the ground changed: an army arrived, a flag went up, or a declaration was made. 'Made official' is when it was formalized by a treaty, a purchase, or recognition by the former owner or other states. Some were made official decades later; some never were.",
  },
  {
    q: "How do you draw disputed territories?",
    a: "The present-day map shows who actually controls the land. Places where control and international recognition differ are marked separately with who controls them, since when, who claims them and their formal status.",
  },
];

type Rule = { name: string; years: number[]; n?: string; s?: string | null; note?: string; why: string };
const rules = dataCorrections.rules as Rule[];

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />
      <PageHero
        eyebrow="About"
        title="A map that tells the truth about size and time"
        lead={
          <p>
            {site.name} combines {eras.length} snapshots of world borders, {events.length} curated territorial events and {disputes.length}{" "}
            present-day disputes into one map you can drag around. It is a free, non-commercial project for learners, teachers and anyone who
            likes maps.
          </p>
        }
      />
      <div className="prose-atlas mx-auto max-w-3xl px-4 py-10">
        <h2>Where the borders come from</h2>
        <ul>
          <li>
            <strong>2000 BCE to 1783:</strong>{" "}
            <a href="https://github.com/aourednik/historical-basemaps" rel="noopener noreferrer">
              historical-basemaps
            </a>{" "}
            by André Ourednik and contributors (GPL-3.0). Each feature carries a border-precision rating, which we show on the map as solid
            (precise) or dashed (approximate) lines. Our processed copies stay under the same license (see the{" "}
            <a href="/data/LICENSE.txt">data license</a>).
          </li>
          <li>
            <strong>1800 to 1960:</strong>{" "}
            <a href="https://github.com/Seshat-Global-History-Databank/cliopatria" rel="noopener noreferrer">
              Cliopatria
            </a>{" "}
            by the Seshat Global History Databank (CC BY 4.0), the world&apos;s states digitised from historical atlases (Bennett et al.,{" "}
            <em>Scientific Data</em>, 2025), with OpenHistoricalMap&apos;s dated borders laid over it and, in Europe from 1815 to 1914,
            HistoGIS&apos;s. These eleven maps use no historical-basemaps data.
          </li>
          <li>
            <strong>Europe from 1815 to 1914:</strong>{" "}
            <a href="https://histogis.acdh.oeaw.ac.at/" rel="noopener noreferrer">
              HistoGIS
            </a>{" "}
            by the Austrian Centre for Digital Humanities and Cultural Heritage, Austrian Academy of Sciences (CC BY 4.0), drawn from maps of
            the time.
          </li>
          <li>
            <strong>1800 to 1960:</strong>{" "}
            <a href="https://www.openhistoricalmap.org/" rel="noopener noreferrer">
              OpenHistoricalMap
            </a>{" "}
            contributors (public domain, CC0), which dates every border change to the day. Some of its border lines are CC BY 4.0, from
            national mapping agencies such as Spain&apos;s IGN, Slovenia&apos;s GURS and Norway&apos;s Kartverket (all listed in the{" "}
            <a href="/data/LICENSE.txt">data license</a>).
          </li>
          <li>
            <strong>1994, 2000, 2010 and the present day:</strong>{" "}
            <a href="https://www.naturalearthdata.com/" rel="noopener noreferrer">
              Natural Earth
            </a>{" "}
            1:50m country boundaries (public domain), packaged by world-atlas, rolled back to each year with the changes since. Natural
            Earth&apos;s countries and provinces also redraw colonial Africa in 1900 and fix places where the historical source gave land to
            the wrong country. US states come from the US Census Bureau via us-atlas.
          </li>
          <li>
            <strong>Checked against:</strong> the maps from 1900 on were compared with{" "}
            <a href="https://icr.ethz.ch/data/cshapes/" rel="noopener noreferrer">
              CShapes 2.0
            </a>{" "}
            (ETH Zurich), the academic standard for country borders since 1886, to find and correct errors.
          </li>
          <li>
            <strong>Flags:</strong>{" "}
            <a href="https://gitlab.com/catamphetamine/country-flag-icons" rel="noopener noreferrer">
              country-flag-icons
            </a>{" "}
            by catamphetamine (MIT license, see the <a href="/flags/LICENSE.txt">flag license</a>).
          </li>
          <li>
            <strong>Population:</strong> World Bank, latest year available, shown for present-day countries only.
          </li>
          <li>
            <strong>Events and disputes:</strong> written for this site from standard historical references. Each event records when control
            changed and when, or whether, it was formalized.
          </li>
        </ul>

        <h2>How the real-size math works</h2>
        <p>
          When you drag a shape, we rotate it around the globe, keeping its real shape and area, and then project it again. That is why
          Greenland shrinks as you pull it toward the equator. Areas are calculated on the sphere (radius 6,371 km) from the map outlines, so
          they can differ from official figures by a few percent. Official figures often include inland water and use more detailed coastlines.
        </p>

        <h2>Accuracy: what we fixed</h2>
        <p>
          We audited every large state in all {eras.length} snapshots against well-documented dates and corrected the source wherever a name,
          ruler or outline was wrong for its year. {rules.length} name and ruler fixes and {dataCorrections.geometry.length} shape fixes are
          applied automatically every time the map data is built. Where we could not safely redraw a shape, the map shows a <strong>data note</strong>{" "}
          when you click it.
        </p>
        <h3>Shape fixes</h3>
        <ul>
          {dataCorrections.geometry.map((g) => (
            <li key={g.what}>
              <strong>{g.era}:</strong> {g.what} <em>{g.why}</em>
            </li>
          ))}
        </ul>
        <h3 id="name-fixes">Name and ruler fixes</h3>
        <p>Every fix, with the snapshot it applies to, what the source said, what the map shows and why.</p>
        {/* a native fold: works without scripts, and the browser's find-in-page opens it */}
        <details className="group not-prose">
          <summary className="btn btn-white mb-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Show all {rules.length} fixes</span>
            <span className="hidden group-open:inline">Hide the fixes</span>
          </summary>
          <div tabIndex={0} role="region" aria-labelledby="name-fixes" className="not-prose overflow-x-auto card">
            {/* phones: one block per fix (snapshot, then source → shown, then why); wider screens: four columns */}
            <table className="w-full text-left text-sm sm:min-w-[620px]">
              <thead className="hidden border-b border-line bg-paper text-xs uppercase tracking-wide text-muted sm:table-header-group">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Snapshot
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Source said
                  </th>
                  <th scope="col" className="px-4 py-3">
                    We show
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Why
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rules.map((r) => (
                  <tr key={r.name + r.years.join()}>
                    <td className="px-4 py-2.5 align-top font-semibold text-ink">
                      {r.years.map((y) => formatYear(y)).join(", ")}
                      <span className="block font-normal sm:hidden">
                        {/* a ruler-only fix keeps the name: no arrow */}
                        {r.n ? (
                          <>
                            <span className="text-ink-soft">{r.name}</span> → <span className="font-semibold text-ink">{r.n}</span>
                          </>
                        ) : (
                          <span className="font-semibold text-ink">{r.name}</span>
                        )}
                        {"s" in r ? <span className="block text-xs text-muted">{r.s ? `ruled by ${r.s}` : "no outside ruler"}</span> : null}
                        {r.note ? <span className="mt-1 flex w-fit rounded-full bg-gold-soft px-2 py-0.5 text-xs font-semibold text-ink ring-1 ring-gold">+ data note</span> : null}
                        <span className="mt-1 block text-ink-soft">{r.why}</span>
                      </span>
                    </td>
                    <td className="hidden px-4 py-2.5 align-top text-ink-soft sm:table-cell">{r.name}</td>
                    <td className="hidden px-4 py-2.5 align-top text-ink sm:table-cell">
                      {r.n ?? r.name}
                      {"s" in r ? <span className="block text-xs text-muted">{r.s ? `ruled by ${r.s}` : "no outside ruler"}</span> : null}
                      {r.note ? <span className="mt-1 flex w-fit rounded-full bg-gold-soft px-2 py-0.5 text-xs font-semibold text-ink ring-1 ring-gold">+ data note</span> : null}
                    </td>
                    <td className="hidden px-4 py-2.5 align-top text-ink-soft sm:table-cell">{r.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        <h2>Known limitations</h2>
        <ul>
          {knownLimitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p>
          Found something wrong? <Link href="/contact?topic=border">Report a border error</Link>. We read every report, and fixes go into the
          list of fixes above.
        </p>

        <h2>Questions</h2>
        {faqs.map((f) => (
          <div key={f.q}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}

        <h2>Credits</h2>
        <p>
          Inspired by Kai Krause&apos;s 2010 graphic &quot;The True Size of Africa&quot; and the many drag-and-compare map tools it led to. Map
          rendering uses d3-geo. {site.name} is an independent project and is not affiliated with The True Size (thetruesize.com) or any other map tool.
        </p>
      </div>
    </>
  );
}
