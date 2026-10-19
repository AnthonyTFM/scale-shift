import { geoArea, geoCentroid, geoContains, geoRotation } from "d3-geo";
import type { Position } from "geojson";
import type { Shape } from "./types";

export const EARTH_R_KM = 6371.0088;
export const MAX_LAT = 84;

/**
 * Moves a shape across the sphere so its centre lands on `to`, then spins it by `rotDeg`.
 * Every vertex is rotated on the globe (not shifted on the flat map), so the true area
 * never changes and Mercator redraws it at the size it would really appear there.
 */
export function relocate(shape: Shape, from: [number, number], to: [number, number], rotDeg: number): Shape {
  const toOrigin = geoRotation([-from[0], -from[1]]);
  const spin = geoRotation([0, 0, rotDeg]);
  const fromOrigin = geoRotation([-to[0], -to[1]]);
  const move = (p: Position): Position => {
    const q = fromOrigin.invert(spin(toOrigin([p[0], p[1]]) as [number, number]) as [number, number]);
    return q ? [q[0], q[1]] : p;
  };
  const g = shape.geometry;
  const geometry =
    g.type === "Polygon"
      ? { type: "Polygon" as const, coordinates: g.coordinates.map((r) => r.map(move)) }
      : { type: "MultiPolygon" as const, coordinates: g.coordinates.map((poly) => poly.map((r) => r.map(move))) };
  return { ...shape, geometry };
}

/** Make polygon winding match d3's spherical convention so nothing renders inside-out. */
export function rewind(shape: Shape): Shape {
  const g = shape.geometry;
  const fix = (rings: Position[][]) =>
    geoArea({ type: "Polygon", coordinates: rings }) > 2 * Math.PI ? rings.map((r) => r.slice().reverse()) : rings;
  if (g.type === "Polygon") return { ...shape, geometry: { type: "Polygon", coordinates: fix(g.coordinates) } };
  return { ...shape, geometry: { type: "MultiPolygon", coordinates: g.coordinates.map(fix) } };
}

const centroidCache = new WeakMap<Shape, [number, number]>();

/** Centre used as the drag handle: centroid of the largest piece, so archipelagos don't drift. */
export function centreOf(shape: Shape): [number, number] {
  const hit = centroidCache.get(shape);
  if (hit) return hit;
  const g = shape.geometry;
  let c: [number, number];
  if (g.type === "Polygon") c = geoCentroid(shape) as [number, number];
  else {
    let best = g.coordinates[0];
    let bestA = -1;
    for (const poly of g.coordinates) {
      const a = geoArea({ type: "Polygon", coordinates: poly });
      if (a > bestA) {
        bestA = a;
        best = poly;
      }
    }
    // weight the whole shape but anchor on the biggest piece if the full centroid falls in the sea far away
    const whole = geoCentroid(shape) as [number, number];
    const main = geoCentroid({ type: "Polygon", coordinates: best }) as [number, number];
    const totalA = geoArea(shape);
    c = bestA / totalA > 0.6 ? whole : main;
  }
  centroidCache.set(shape, c);
  return c;
}

/** How much Mercator inflates area at a latitude, relative to the equator. */
export function mercatorInflation(lat: number): number {
  const c = Math.cos((Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180);
  return 1 / (c * c);
}

export const clampLat = (lat: number) => Math.max(-MAX_LAT, Math.min(MAX_LAT, lat));
export const wrapLon = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180;

/** Mercator cannot draw a shape that wraps a pole, so moves that would do that are refused. */
export function coversPole(shape: Shape): boolean {
  return geoContains(shape, [0, 90]) || geoContains(shape, [0, -90]);
}
