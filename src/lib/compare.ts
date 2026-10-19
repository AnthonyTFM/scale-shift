// Server only: the numbers and picture behind /compare/[slug]. Uses the same shapes, far-part trimming and
// placement as the live map (src/components/map/overlays.ts), so a comparison page always matches what you see there.
import fs from "node:fs";
import path from "node:path";
import { geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { presets, type Preset } from "@/content/presets";
import { anchorOf, areaKm2, dropFarParts, EARTH_RADIUS_KM, placeGeometry, toMulti } from "./geo";
import { PALETTE, POLITICAL } from "./palette";

const DATA = path.join(process.cwd(), "public", "data");
type Props = { n: string; a?: number; k?: number };

const layers = new Map<string, Feature<Polygon | MultiPolygon, Props>[]>();
function layer(era: string) {
  let fs_ = layers.get(era);
  if (!fs_) {
    const file = era === "us" ? "us-states.json" : path.join("eras", `${era}.json`);
    const topo = JSON.parse(fs.readFileSync(path.join(DATA, file), "utf8")) as Topology;
    fs_ = feature(topo, topo.objects.p as GeometryCollection<Props>).features as Feature<Polygon | MultiPolygon, Props>[];
    layers.set(era, fs_);
  }
  return fs_;
}

export type CompareShape = {
  name: string;
  era: string;
  /** true area, km² */
  km2: number;
  /** how big a normal (Mercator) web map draws it where it really is, in equator-km² */
  mapKm2: number;
  /** where the comparison places it */
  placed: MultiPolygon;
  color: string;
};

/** Area a Mercator map draws a shape at, measured in "equator km²" (1 unit = 1 km at the equator). */
const mercator = geoMercator().scale(EARTH_RADIUS_KM).translate([0, 0]);
const mercatorKm2 = (g: MultiPolygon) => geoPath(mercator).area(g);

export function compareShapes(preset: Preset): CompareShape[] {
  return preset.shapes.flatMap((s, i) => {
    const f = layer(s.era).find((x) => x.properties.n === s.name);
    if (!f) return [];
    const { geom, hidden } = dropFarParts(toMulti(f.geometry));
    const origin = anchorOf(geom);
    const placed = s.lon !== undefined && s.lat !== undefined ? placeGeometry(geom, origin, [s.lon, s.lat], s.rot ?? 0) : geom;
    return [
      {
        name: s.name,
        era: s.era,
        km2: hidden || !f.properties.a ? areaKm2(geom) : f.properties.a,
        mapKm2: mercatorKm2(geom),
        placed,
        color: PALETTE[i % PALETTE.length],
      },
    ];
  });
}

export const compareSlug = (p: Preset) => p.id;
export const compareBySlug = (slug: string) => presets.find((p) => p.id === slug);

/**
 * SVG of the comparison as the map shows it after "Line them up": today's borders faintly behind,
 * the shapes at their placed positions. Fitted to the shapes, so it works for any pair.
 */
export function compareSvg(shapes: CompareShape[], width: number, height: number) {
  const fc = { type: "FeatureCollection", features: shapes.map((s) => ({ type: "Feature", properties: {}, geometry: s.placed })) } as const;
  const pad = Math.round(Math.min(width, height) * 0.1);
  const proj = geoMercator().fitExtent(
    [
      [pad, pad],
      [width - pad, height - pad],
    ],
    fc as unknown as GeoPermissibleObjects,
  );
  proj.clipExtent([
    [0, 0],
    [width, height],
  ]);
  const p = geoPath(proj).digits(1);
  // backdrop: the small homepage-globe file is plenty at this size
  const globe = JSON.parse(fs.readFileSync(path.join(DATA, "globe.json"), "utf8")) as Topology;
  const land = feature(globe, globe.objects.p as GeometryCollection<Props>).features;
  let out = `<rect width="${width}" height="${height}" fill="#9FCBE0"/>`;
  for (const f of land) {
    const d = p(f as unknown as GeoPermissibleObjects);
    if (d) out += `<path d="${d}" fill="${POLITICAL[(f.properties.k ?? 0) % POLITICAL.length]}" fill-opacity="0.55" stroke="#584a3e" stroke-opacity="0.25" stroke-width="0.6"/>`;
  }
  for (const s of shapes) {
    const d = p(s.placed);
    if (d) out += `<path d="${d}" fill="${s.color}" fill-opacity="0.45" stroke="#fffcf5" stroke-width="4" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${out}</svg>`;
}

/** Plain-language comparisons for the page: "A is 3.2 times the size of B" and how much a normal map inflates each. */
export function ratioText(a: number, b: number) {
  const r = a / b;
  if (r >= 1.95) return `${r >= 10 ? Math.round(r) : r.toFixed(1)} times the size of`;
  if (r >= 1.05) return `${Math.round((r - 1) * 100)}% bigger than`;
  if (r > 0.95) return "about the same size as";
  return `${Math.round((1 - r) * 100)}% smaller than`;
}

/** "the United Kingdom", "the Roman Empire", but "Texas": adds "the" where English needs it. */
export function withThe(name: string, startOfSentence = false) {
  const needs = /^(United |Netherlands|Philippines|Contiguous |Empire |Kingdom |Republic |Viceroyalty |Golden Horde)|Empire$|Union$|Islands$|Caliphate$|Sultanate$/.test(name);
  return needs ? `${startOfSentence ? "The" : "the"} ${name}` : name;
}
