import "server-only";
import fs from "node:fs";
import path from "node:path";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { centreOf, rewind } from "./geo";
import type { DataIndex, Entity, Shape } from "./types";

const DATA_DIR = path.join(process.cwd(), "public", "data");

let indexCache: DataIndex | null = null;
export function getIndex(): DataIndex {
  if (!indexCache) indexCache = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "index.json"), "utf8")) as DataIndex;
  return indexCache;
}

let byIdCache: Map<string, Entity> | null = null;
export function getEntity(id: string): Entity | undefined {
  if (!byIdCache) byIdCache = new Map(getIndex().entities.map((e) => [e.i, e]));
  return byIdCache.get(id);
}

const shapeCache = new Map<number, Map<string, Shape>>();
function shapesFor(year: number): Map<string, Shape> {
  let m = shapeCache.get(year);
  if (!m) {
    const topo = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "years", `${year}.json`), "utf8")) as Topology;
    m = new Map();
    for (const obj of Object.values(topo.objects)) {
      const fc = feature(topo, obj as GeometryCollection);
      if (fc.type !== "FeatureCollection") continue;
      for (const f of fc.features) {
        if (f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")) m.set(String(f.id), rewind(f as Shape));
      }
    }
    shapeCache.set(year, m);
  }
  return m;
}

/** Real-world centre [lon, lat] of an entity in a given snapshot. */
export function centreAt(id: string, year: number): [number, number] | null {
  const s = shapesFor(year).get(id);
  return s ? centreOf(s) : null;
}

/** Modern country closest in area, for "about the size of" sentences. */
export function similarModern(areaKm2: number, excludeId?: string): Entity | undefined {
  const ix = getIndex();
  const todayIdx = ix.years.length - 1;
  let best: Entity | undefined;
  let bestDiff = Infinity;
  for (const e of ix.entities) {
    if (e.k !== "t" || e.i === excludeId || !e.y.includes(todayIdx) || !e.p) continue;
    const a = e.a[e.y.indexOf(todayIdx)];
    const diff = Math.abs(Math.log(a / areaKm2));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = e;
    }
  }
  return best;
}

/** Outline of an entity in a given snapshot, for server-rendered images. */
export function shapeAt(id: string, year: number): Shape | undefined {
  return shapesFor(year).get(id);
}
