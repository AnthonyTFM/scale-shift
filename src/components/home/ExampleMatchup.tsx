import { geoAzimuthalEqualArea, geoCentroid, geoMercator, geoPath, type GeoPermissibleObjects, type GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import globe from "../../../public/data/globe.json";
import pool from "@/data/daily-pool.json";
import { home } from "@/content/home";

// The classic trick: Greenland looks far bigger on a normal map, but DR Congo is bigger.
const PAIR = ["DR Congo", "Greenland"] as const;
const W = 240; // drawing size of one panel
/** the daily game's shape colours (fills only, never text) */
const SHAPE_COLORS = ["#2F6BFF", "#FF5B4A"];
const H = 130;
const SLOT = W / 2;

type Shape = { name: string; geom: GeoPermissibleObjects; area: number; mapArea: number };
type PoolRow = { n: string; era: string; a: number; m: number };

const topo = globe as unknown as Topology<{ p: GeometryCollection<{ n: string }> }>;
const countries = (feature(topo, topo.objects.p) as unknown as { features: { properties: { n: string }; geometry: GeoPermissibleObjects }[] }).features;
const shapes: Shape[] = PAIR.map((name) => {
  const row = (pool as PoolRow[]).find((r) => r.n === name && r.era === "present")!;
  return { name, geom: countries.find((c) => c.properties.n === name)!.geometry, area: row.a, mapArea: row.m };
});

/**
 * Both shapes side by side at one shared scale, sitting on a common baseline so their sizes compare at a glance.
 * `make` gives each shape's projection at scale 1.
 */
function layout(make: (s: Shape) => GeoProjection) {
  const sized = shapes.map((s) => {
    const proj = make(s);
    const [[x0, y0], [x1, y1]] = geoPath(proj).bounds(s.geom);
    return { s, proj, w: x1 - x0, h: y1 - y0 };
  });
  const k = Math.min(...sized.map((z) => Math.min((SLOT - 14) / z.w, (H - 6) / z.h)));
  return sized.map(({ s, proj }, i) => {
    proj.scale(proj.scale() * k).translate([0, 0]);
    const path = geoPath(proj);
    const [[x0], [x1, y1]] = path.bounds(s.geom);
    return { name: s.name, d: path(s.geom) ?? "", color: SHAPE_COLORS[i], dx: SLOT * i + SLOT / 2 - (x0 + x1) / 2, dy: H - 2 - y1 };
  });
}

const onMap = layout(() => geoMercator().scale(1));
const real = layout((s) => {
  const [lon, lat] = geoCentroid(s.geom);
  return geoAzimuthalEqualArea().rotate([-lon, -lat]).scale(1);
});
const [a, b] = shapes;
const mapBigger = a.mapArea > b.mapArea ? a : b;
const mapSmaller = mapBigger === a ? b : a;
const winner = a.area > b.area ? a : b;
const fmt = (km2: number) => `${(km2 / 1e6).toFixed(2)}M`;

function Panel({ label, drawn, note, win }: { label: string; drawn: typeof onMap; note: string; win?: string }) {
  return (
    <figure className="flex flex-col rounded-lg bg-white p-3 ring-1 ring-line">
      <figcaption className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" aria-hidden="true">
        <line x1="4" x2={W - 4} y1={H - 1} y2={H - 1} stroke="currentColor" className="text-line" />
        {drawn.map((s) => (
          <path key={s.name} d={s.d} transform={`translate(${s.dx} ${s.dy})`} fill={s.color} fillOpacity={0.85} stroke={s.color} strokeWidth={1} />
        ))}
      </svg>
      <div className="mt-1 grid grid-cols-2 gap-1 text-center text-[11px] font-semibold leading-tight sm:text-xs">
        {drawn.map((s) => (
          <span key={s.name} className={win === s.name ? "text-green-text" : undefined}>
            {s.name}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs leading-snug text-ink-soft">{note}</p>
    </figure>
  );
}

/** A picture of one round: how a normal map draws the pair, then their real sizes. Drawn on the server, no script. */
export function ExampleMatchup() {
  const times = Math.round(mapBigger.mapArea / mapSmaller.mapArea);
  return (
    <div className="rounded-[22px] bg-tile p-3 sm:p-4">
      <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wide text-primary">
        {home.example.caption}: {a.name} vs {b.name}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Panel label={home.example.mapLabel} drawn={onMap} note={home.example.looks(mapBigger.name, times)} />
        <Panel
          label={home.example.realLabel}
          drawn={real}
          win={winner.name}
          note={`${home.example.answer(winner.name)}: ${fmt(winner.area)} vs ${fmt((winner === a ? b : a).area)} km²`}
        />
      </div>
    </div>
  );
}
