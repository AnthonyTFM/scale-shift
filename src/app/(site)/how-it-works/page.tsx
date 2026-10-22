import type { Metadata } from "next";
import Link from "next/link";
import { presets } from "@/content/presets";
import { mercatorInflation } from "@/lib/geo";
import { mapUrl } from "@/lib/share";
import { PageHero } from "@/components/site/PageHero";

export const metadata: Metadata = {
  title: "How it works: drag, rotate, time-travel, share",
  description: "A two-minute guide to the map: search, drag shapes to see their real size, rotate them, step through 4,000 years of borders, and share what you find.",
  alternates: { canonical: "/how-it-works" },
};

const steps = [
  { title: "Search", body: "Type a country, US state or historical empire. Each result shows which years it appears in." },
  { title: "Drag", body: "Grab the shape and move it. It shrinks toward the equator and grows toward the poles, so you see how big it would look at each latitude." },
  { title: "Rotate", body: "Select a shape, then turn the compass rose in the bottom-left corner (or press [ and ])." },
  { title: "Travel in time", body: "Use the timeline at the bottom, or press play. Shapes you haven't moved switch to each era's borders." },
  { title: "Ask “who ruled here?”", body: "Click any land to see who controlled that spot in every era, plus the events that changed it. On today's map, any border dispute is shown first." },
  { title: "Try a comparison", body: "Open the Comparisons tab to load the most surprising sizes and the most controversial borders in one click." },
  { title: "Share", body: "The Share button copies a link to exactly what you see, or downloads a PNG." },
];

const keys = [
  ["Arrow keys", "Pan the map, or move the selected shape (Shift = faster)"],
  ["+ / −", "Zoom in / out"],
  ["[ / ]", "Rotate the selected shape"],
  ["Delete", "Remove the selected shape"],
  ["Esc", "Deselect / close panels"],
  ["Right-click a shape", "Remove it"],
  ["Double-click", "Zoom in"],
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHero eyebrow="How it works" title="Drag, rotate, time-travel, share" lead={<p>Everything the map can do, in two minutes.</p>} />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-card bg-card p-5 ring-1 ring-line">
              <span className="grid size-9 place-items-center rounded-full bg-primary font-display text-white">{i + 1}</span>
              <h2 className="mt-3 text-lg font-bold text-ink">{s.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{s.body}</p>
            </li>
          ))}
        </ol>

        <section aria-labelledby="mercator" className="mt-14 grid gap-8 lg:grid-cols-2">
          <div className="prose-atlas">
            <h2 id="mercator">Why maps lie about size</h2>
            <p>
              Almost every web map uses the Mercator projection. It keeps shapes and directions right locally, which is great for navigation.
              The cost is size: the farther from the equator, the more it inflates area. At 60° north (Oslo, Anchorage), land looks four times
              bigger than it is. Greenland, centered near 72° north, looks roughly ten times too big.
            </p>
          </div>
          <div tabIndex={0} role="region" aria-label="How much Mercator inflates area" className="overflow-x-auto rounded-card border border-line bg-white">
            <table className="w-full text-left text-sm">
              <caption className="px-4 pt-4 text-left font-bold text-ink">How much Mercator inflates area</caption>
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2">
                    Latitude
                  </th>
                  <th scope="col" className="px-4 py-2">
                    Example
                  </th>
                  <th scope="col" className="px-4 py-2 text-right">
                    Looks bigger by
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(
                  [
                    [0, "Quito, Singapore"],
                    [30, "Cairo, New Orleans"],
                    [45, "Milan, Minneapolis"],
                    [60, "Oslo, Anchorage"],
                    [72, "central Greenland"],
                    [80, "Svalbard"],
                  ] as const
                ).map(([lat, ex]) => (
                  <tr key={lat}>
                    <td className="px-4 py-2 font-semibold text-ink">{lat}°</td>
                    <td className="px-4 py-2 text-ink-soft">{ex}</td>
                    <td className="px-4 py-2 text-right font-semibold text-ink">×{mercatorInflation(lat).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="keys" className="mt-14">
          <h2 id="keys" className="font-display text-3xl text-ink">
            Keyboard and mouse
          </h2>
          <dl className="mt-4 grid gap-2 sm:grid-cols-2">
            {keys.map(([k, v]) => (
              <div key={k} className="flex gap-3 rounded-lg border border-line bg-white p-3 text-sm">
                <dt className="w-36 shrink-0 font-mono font-semibold text-ink">{k}</dt>
                <dd className="text-ink-soft">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="try" className="mt-14">
          <h2 id="try" className="font-display text-3xl text-ink">
            Try these
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {presets.map((p) => (
              <li key={p.id}>
                <Link
                  href={mapUrl({ era: p.baseEra, shapes: p.shapes.map((s, i) => ({ ...s, color: i })) })}
                  className="block h-full rounded-card border border-line bg-white p-4 hover:shadow-md"
                >
                  <span className="font-bold text-ink">{p.title}</span>
                  <span className="mt-1 block text-sm text-ink-soft">{p.hook}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
