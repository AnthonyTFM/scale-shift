// Client-side loaders for the map data in /public/data. Every file is fetched once and cached.
import { feature, mesh } from "topojson-client";
import type { Feature, MultiLineString, MultiPolygon, Polygon } from "geojson";
import type { Topology, GeometryCollection } from "topojson-specification";
import { containsLonLat, toMulti } from "./geo";
import dataVersion from "@/data/data-version.json";

/** Changes whenever the map data is rebuilt, so browsers never show stale cached files. */
const V = `?v=${dataVersion.v}`;

export type PolityProps = {
  /** name */ n: string;
  /** ruled by (colonial power / overlord) */ s?: string;
  /** part of (cultural region) */ p?: string;
  /** border precision: 1 approximate, 2 moderate, 3 international law */ b: number;
  /** area km² */ a: number;
  /** empire total incl. subjects, km² */ e?: number;
  /** label point */ l?: [number, number];
  /** ISO alpha-2 for flag */ f?: string;
  /** population + year */ pop?: number;
  py?: number;
  /** dispute id (src/content/disputes.ts) */ d?: string;
  /** US state postal code */ c?: string;
  /** synthetic shape (e.g. Contiguous US) — not drawn on the base map */ x?: number;
  /** colour index (neighbours never share one) */ k?: number;
  /** land the source leaves blank, filled in so the map has no false sea */ m?: number;
  /** data note: a known problem with this shape in the source */ w?: string;
};

export type PolityFeature = {
  props: PolityProps;
  geom: MultiPolygon;
  bbox: [number, number, number, number];
};

export type Layer = {
  key: string;
  features: PolityFeature[];
  byName: Map<string, PolityFeature>;
  /** internal borders only (US states), so coastlines are never drawn twice */
  mesh?: MultiLineString;
};

export type IndexRow = {
  n: string;
  y: (number | "present")[];
  a: number[];
  e?: number[];
  s?: string;
  f?: string;
  us?: 1;
};

export type RulersGrid = { step: number; names: string[]; cells: Record<string, number[]> };

const cache = new Map<string, Promise<unknown>>();

function once<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) {
    const p = load().catch((err) => {
      cache.delete(key);
      throw err;
    });
    cache.set(key, p);
  }
  return cache.get(key) as Promise<T>;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  return res.json() as Promise<T>;
}

function bboxOf(g: MultiPolygon): [number, number, number, number] {
  let minX = 180,
    minY = 90,
    maxX = -180,
    maxY = -90;
  for (const poly of g.coordinates)
    for (const [x, y] of poly[0]) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  return [minX, minY, maxX, maxY];
}

const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Decodes a topology in small batches so a big era never blocks the page for long. */
async function toLayer(key: string, topo: Topology): Promise<Layer> {
  const collection = topo.objects.p as GeometryCollection<PolityProps>;
  const features: PolityFeature[] = [];
  const geoms = collection.geometries;
  for (let i = 0; i < geoms.length; i++) {
    if (i > 0 && i % 30 === 0) await yieldToMain();
    const f = feature(topo, geoms[i]) as Feature<Polygon | MultiPolygon, PolityProps>;
    if (!f.geometry) continue;
    const geom = toMulti(f.geometry);
    features.push({ props: f.properties, geom, bbox: bboxOf(geom) });
  }
  const byName = new Map<string, PolityFeature>();
  for (const f of features) if (f.props.n) byName.set(f.props.n, f);
  return { key, features, byName };
}

/** era key = "present", "1914", "323bce" … or "us" for US states */
export function loadLayer(key: string): Promise<Layer> {
  return once(`layer:${key}`, async () => {
    const url = key === "us" ? `/data/us-states.json${V}` : `/data/eras/${key}.json${V}`;
    const topo = await getJson<Topology>(url);
    const layer = await toLayer(key, topo);
    if (key === "us") {
      const collection = topo.objects.p as GeometryCollection<PolityProps>;
      const real = { ...collection, geometries: collection.geometries.filter((g) => !(g.properties as PolityProps | undefined)?.x) };
      layer.mesh = mesh(topo, real, (a, b) => a !== b);
    }
    return layer;
  });
}

export function loadIndex(): Promise<IndexRow[]> {
  return once("index", () => getJson<IndexRow[]>(`/data/polities.json${V}`));
}

export function loadGrid(): Promise<RulersGrid> {
  return once("grid", () => getJson<RulersGrid>(`/data/rulers-grid.json${V}`));
}

/** Rulers of the 1° cell containing a point, falling back to the nearest land cell (coasts, small islands). */
export function rulersAt(grid: RulersGrid, lon: number, lat: number): { era: number; name: string | null }[] {
  const cols = 360 / grid.step;
  const gx = Math.floor((lon + 180) / grid.step);
  const gy = Math.floor((lat + 90) / grid.step);
  const tryCell = (x: number, y: number) => grid.cells[`${((x % cols) + cols) % cols}_${y}`];
  let seq = tryCell(gx, gy);
  for (let r = 1; !seq && r <= 2; r++) {
    for (let dx = -r; dx <= r && !seq; dx++) for (let dy = -r; dy <= r && !seq; dy++) seq = tryCell(gx + dx, gy + dy);
  }
  if (!seq) return [];
  const out: { era: number; name: string | null }[] = [];
  for (let i = 0; i < seq.length; i += 2) out.push({ era: seq[i], name: seq[i + 1] < 0 ? null : grid.names[seq[i + 1]] });
  return out;
}

/** Smallest named shape containing a point (smallest = most specific when shapes overlap). */
export function featureAtIn(layer: Layer, lon: number, lat: number): PolityFeature | null {
  let best: PolityFeature | null = null;
  for (const f of layer.features) {
    if (!f.props.n || f.props.x) continue;
    const [a, b, c, d] = f.bbox;
    if (lat < b || lat > d || lon < a || lon > c) continue;
    if (containsLonLat(f.geom, lon, lat) && (!best || f.props.a < best.props.a)) best = f;
  }
  return best;
}
