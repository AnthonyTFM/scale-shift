import { geoArea, geoCentroid, geoDistance, geoMercator, geoRotation, type GeoProjection } from "d3-geo";
import type { MultiPolygon, Polygon, Position } from "geojson";

export const EARTH_RADIUS_KM = 6371.0088;
const RAD = Math.PI / 180;
/** Mercator y of ~85.05°, where web maps cut off. */
export const MAX_MERC_Y = Math.PI;

export type LonLat = [number, number];

export function toMulti(g: Polygon | MultiPolygon): MultiPolygon {
  return g.type === "Polygon" ? { type: "MultiPolygon", coordinates: [g.coordinates] } : g;
}

export const areaKm2 = (g: Polygon | MultiPolygon) => geoArea(g) * EARTH_RADIUS_KM * EARTH_RADIUS_KM;

/** Centroid of the largest polygon: a sensible "handle" for countries with islands. */
export function anchorOf(g: MultiPolygon): LonLat {
  let best = g.coordinates[0];
  let bestArea = -1;
  for (const rings of g.coordinates) {
    const a = geoArea({ type: "Polygon", coordinates: rings });
    if (a > bestArea) {
      bestArea = a;
      best = rings;
    }
  }
  return geoCentroid({ type: "Polygon", coordinates: best }) as LonLat;
}

/**
 * Drops small parts far from the main landmass (e.g. French Guiana when dragging France),
 * so a dragged shape reads as one country. Returns the kept geometry and how many parts were hidden.
 */
export function dropFarParts(g: MultiPolygon, maxDistanceDeg = 40, keepShare = 0.15): { geom: MultiPolygon; hidden: number } {
  if (g.coordinates.length < 2) return { geom: g, hidden: 0 };
  const parts = g.coordinates.map((rings) => {
    const poly: Polygon = { type: "Polygon", coordinates: rings };
    return { rings, area: geoArea(poly), c: geoCentroid(poly) as LonLat };
  });
  const total = parts.reduce((s, p) => s + p.area, 0);
  const main = parts.reduce((a, b) => (b.area > a.area ? b : a));
  const kept = parts.filter(
    (p) => p === main || geoDistance(p.c, main.c) / RAD <= maxDistanceDeg || p.area / total >= keepShare,
  );
  return { geom: { type: "MultiPolygon", coordinates: kept.map((p) => p.rings) }, hidden: parts.length - kept.length };
}

/**
 * Moves a shape across the sphere so that `origin` lands on `target`, then spins it `rotDeg` clockwise.
 * Because this is a rotation of the globe, the true area is preserved exactly — the Mercator projection
 * then shows it bigger near the poles and smaller near the equator, which is the whole point.
 */
export function placeGeometry(g: MultiPolygon, origin: LonLat, target: LonLat, rotDeg: number): MultiPolygon {
  const toCenter = geoRotation([-origin[0], -origin[1]]);
  const spin = geoRotation([0, 0, -rotDeg]);
  const toTarget = geoRotation([-target[0], -target[1]]);
  const move = (p: Position) => toTarget.invert(spin(toCenter(p as [number, number]))) as Position;
  return { type: "MultiPolygon", coordinates: g.coordinates.map((poly) => poly.map((ring) => ring.map(move))) };
}

/** How much a web map inflates areas at a given latitude (sec²φ). */
export const mercatorInflation = (lat: number) => 1 / Math.cos(lat * RAD) ** 2;

export const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (Math.max(-85, Math.min(85, lat)) * RAD) / 2));
export const latFromMercY = (y: number) => (2 * Math.atan(Math.exp(y)) - Math.PI / 2) / RAD;
export const normLon = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180;

// ---------- view (pan / zoom) ----------

export type View = { lon: number; y: number; k: number };

export function minScale(w: number, h: number) {
  return Math.max(w, h) / (2 * Math.PI);
}

export function clampView(v: View, w: number, h: number): View {
  const kMin = minScale(w, h);
  const k = Math.max(kMin, Math.min(kMin * 60, v.k));
  const half = h / (2 * k);
  const y = half >= MAX_MERC_Y ? 0 : Math.max(-MAX_MERC_Y + half, Math.min(MAX_MERC_Y - half, v.y));
  return { lon: normLon(v.lon), y, k };
}

export function projectionFor(v: View, w: number, h: number): GeoProjection {
  return geoMercator()
    .rotate([-v.lon, 0])
    .scale(v.k)
    .translate([w / 2, h / 2 + v.k * v.y])
    .clipExtent([
      [-2, -2],
      [w + 2, h + 2],
    ])
    // borders are already dense, so skip d3's adaptive resampling until zoomed well in (big CPU saving)
    .precision(v.k > minScale(w, h) * 4 ? 0.5 : 0);
}

/** Zoom by `factor`, keeping the point under (px, py) fixed. */
export function zoomAt(v: View, factor: number, px: number, py: number, w: number, h: number): View {
  const mx = v.lon * RAD + (px - w / 2) / v.k;
  const my = v.y - (py - h / 2) / v.k;
  const k = v.k * factor;
  return clampView({ lon: (mx - (px - w / 2) / k) / RAD, y: my + (py - h / 2) / k, k }, w, h);
}

export function panBy(v: View, dx: number, dy: number, w: number, h: number): View {
  return clampView({ lon: v.lon - dx / v.k / RAD, y: v.y + dy / v.k, k: v.k }, w, h);
}

/** View that fits a lon/lat box (lon span may cross the antimeridian when minLon > maxLon). */
export function fitView(box: [number, number, number, number], w: number, h: number, pad = 0.18): View {
  const [minLon, minLat, maxLon, maxLat] = box;
  let span = maxLon - minLon;
  if (span < 0) span += 360;
  const center = normLon(minLon + span / 2);
  const y0 = mercY(minLat);
  const y1 = mercY(maxLat);
  const kx = (w * (1 - pad * 2)) / Math.max(span * RAD, 0.02);
  const ky = (h * (1 - pad * 2)) / Math.max(y1 - y0, 0.02);
  return clampView({ lon: center, y: (y0 + y1) / 2, k: Math.min(kx, ky) }, w, h);
}

/** Lon/lat bounding box of a geometry, unwrapped around a reference longitude. */
export function boundsOf(g: MultiPolygon, refLon: number): [number, number, number, number] {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const poly of g.coordinates)
    for (const [x0, y] of poly[0]) {
      let x = x0;
      while (x - refLon > 180) x -= 360;
      while (x - refLon < -180) x += 360;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  return [normLon(minX), minY, normLon(maxX), maxY];
}

export function mergeBounds(boxes: [number, number, number, number][]): [number, number, number, number] | null {
  if (!boxes.length) return null;
  const ref = (boxes[0][0] + boxes[0][2]) / 2;
  const unwrap = (x: number) => {
    let v = x;
    while (v - ref > 180) v -= 360;
    while (v - ref < -180) v += 360;
    return v;
  };
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [a, b, c, d] of boxes) {
    const x0 = unwrap(a);
    let x1 = unwrap(c);
    if (x1 < x0) x1 += 360;
    minX = Math.min(minX, x0);
    maxX = Math.max(maxX, x1);
    minY = Math.min(minY, b);
    maxY = Math.max(maxY, d);
  }
  return [normLon(minX), minY, normLon(maxX), maxY];
}

/** Planar point-in-polygon on lon/lat rings (fast hit testing; fine away from the poles). */
export function containsLonLat(g: MultiPolygon, lon: number, lat: number) {
  for (const rings of g.coordinates) {
    let inside = false;
    for (const ring of rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0],
          yi = ring[i][1],
          xj = ring[j][0],
          yj = ring[j][1];
        if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
      }
    }
    if (inside) return true;
  }
  return false;
}
