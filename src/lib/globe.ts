// Shared by the homepage globe (drawn live in the browser) and its still picture (drawn on the server), so the two line up.
import type { GeoPermissibleObjects } from "d3-geo";

export type GlobeCountry = { type: "Feature"; properties: { n: string; k: number }; geometry: GeoPermissibleObjects };
/** As read from globe.json: a place made only of slivers has no outline left (geometry null). */
export type RawGlobeCountry = Omit<GlobeCountry, "geometry"> & { geometry: GeoPermissibleObjects | null };

/** Degrees: tilted to show a little more of the north, where most people live. */
export const GLOBE_TILT = -18;
/** Longitude rotation the globe starts at. */
export const GLOBE_START_LON = -20;
/** Gap between the globe and the edge of its box, in CSS pixels. */
export const GLOBE_INSET = 8;

/**
 * Drops slivers: island outlines squashed to fewer than 3 distinct points. One lying exactly on the globe's edge makes the
 * clipping think it covers the whole sphere, and the ocean flashes that country's colour. scripts/build-globe.mjs already
 * removes them; this also covers a copy of the old file still sitting in a browser's cache.
 */
export function dropSlivers(c: RawGlobeCountry): GlobeCountry {
  const g = c.geometry as { type: string; coordinates: number[][][][] | number[][][] } | null;
  // places made only of slivers have no outline left in the file at all
  if (!g) return { ...c, geometry: { type: "MultiPolygon", coordinates: [] } as GeoPermissibleObjects };
  const solid = (rings: number[][][]) => new Set(rings[0].map((p) => p.join())).size >= 3;
  if (g.type === "Polygon") return solid(g.coordinates as number[][][]) ? (c as GlobeCountry) : { ...c, geometry: { type: "MultiPolygon", coordinates: [] } as GeoPermissibleObjects };
  if (g.type !== "MultiPolygon") return c as GlobeCountry;
  return { ...c, geometry: { type: "MultiPolygon", coordinates: (g.coordinates as number[][][][]).filter(solid) } as GeoPermissibleObjects };
}
