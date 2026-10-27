// The small "where is it" maps beside each name in the daily puzzle and endless mode (public/data/daily/loc/{id}.json).
// Drawn the way a normal web map draws the world (Mercator), and shown only once the player has answered (beside its
// neighbours a place's size is easy to judge, so it would help the guess). A region or US state sits inside its own country (Goiás in
// Brazil, Ohio in the lower 48); anything else sits in a window around it, about three times its size, with the land
// around it. Every map is 100 × 66 units: grey land, the country in a darker grey, the place itself as a path to fill.

import fs from "node:fs";
import path from "node:path";
import { geoMercator, geoPath } from "d3-geo";
import * as client from "topojson-client";

export const W = 100;
export const H = 66;
// the narrowest window, so a small country still shows its neighbours (about 35° of longitude)
const MIN_SPAN = (35 * Math.PI) / 180;
// how far a web map reaches toward the poles (±85.05°, as on the map: src/lib/geo.ts), in Mercator units
const Y_MAX = Math.PI;

// The country a region is drawn inside: all the regions of its era together ("adm1-bra": every Brazilian state), so the
// region always sits inside the shading with matching borders (the present-day map's India, for one, leaves out the
// disputed regions that are in the pool as Indian-run). US states sit in the lower 48. Set by build-daily.mjs.
const parents = new Map();
export function setRegionParents(byEra) {
  for (const [era, geoms] of byEra) {
    const coordinates = geoms.flatMap((g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates));
    parents.set(era, { type: "MultiPolygon", coordinates });
  }
}

let world = null;
function load(DATA) {
  if (world) return world;
  const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));
  const present = read("eras/present.json");
  const geoms = Object.values(present.objects)[0].geometries;
  const us = read("us-states.json");
  const usGeoms = Object.values(us.objects)[0].geometries;
  const country = new Map(geoms.filter((g) => g.properties.n).map((g) => [g.properties.n, client.feature(present, g).geometry]));
  const lower48 = usGeoms.find((g) => g.properties.n === "Contiguous United States");
  world = {
    land: client.merge(present, geoms),
    country,
    lower48: lower48 && client.feature(us, lower48).geometry,
  };
  return world;
}

/** Projected rings of a geometry, points closer than `tol` dropped, as an SVG path (`dp` decimal places). */
function trace(geom, projection, tol, minArea, dp = 0) {
  const rings = [];
  geoPath(projection, {
    moveTo: (x, y) => rings.push([[x, y]]),
    lineTo: (x, y) => rings[rings.length - 1].push([x, y]),
    closePath() {},
  })(geom);
  let out = "";
  for (const ring of rings) {
    const kept = [];
    for (const p of ring) {
      const last = kept[kept.length - 1];
      if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= tol) kept.push(p);
    }
    if (kept.length < 3) continue;
    let a = 0;
    for (let i = 0; i < kept.length; i++) {
      const [ax, ay] = kept[i];
      const [bx, by] = kept[(i + 1) % kept.length];
      a += ax * by - bx * ay;
    }
    if (Math.abs(a / 2) < minArea) continue;
    out += `M${kept.map(([x, y]) => `${+x.toFixed(dp)} ${+y.toFixed(dp)}`).join(" ")}Z`;
  }
  return out;
}

/**
 * The bounds of a geometry's main cluster, in a projection: its largest piece and the pieces near it, link by link (the
 * same rule as mainPart in src/lib/outline.ts), so island chains (Indonesia) stay whole and far-off territories drop out.
 */
function mainBounds(geom, projection) {
  const p = geoPath(projection);
  const polys = (geom.type === "MultiPolygon" ? geom.coordinates.map((c) => ({ type: "Polygon", coordinates: c })) : [geom])
    .map((g) => ({ area: p.area(g), b: p.bounds(g) }))
    .filter((x) => Number.isFinite(x.b[0][0]))
    .sort((a, b) => b.area - a.area);
  let [[x0, y0], [x1, y1]] = polys[0].b;
  let rest = polys.slice(1);
  for (let added = true; added && rest.length; ) {
    added = false;
    rest = rest.filter(({ b: [[a0, b0], [a1, b1]] }) => {
      const near = (Math.max(x1 - x0, y1 - y0) * 3) / 4;
      if (Math.max(a0 - x1, x0 - a1, b0 - y1, y0 - b1, 0) > near) return true;
      [x0, y0, x1, y1] = [Math.min(x0, a0), Math.min(y0, b0), Math.max(x1, a1), Math.max(y1, b1)];
      added = true;
      return false;
    });
  }
  return [
    [x0, y0],
    [x1, y1],
  ];
}

/** The locator for one pool shape, or null where a web map can't show it (Antarctica). */
export function locator(DATA, entry, geom, lat, lon) {
  if (Math.abs(lat) > 75) return null;
  const { land, lower48 } = load(DATA);
  const parent =
    parents.get(entry.era) ??
    (entry.era === "us" && entry.n !== "Contiguous United States" && entry.n !== "Alaska" && entry.n !== "Hawaii" ? lower48 : null);
  // centred on the place's longitude, so nothing splits at the 180° line
  const base = geoMercator().rotate([-lon, 0]).scale(1).translate([0, 0]).precision(0.1);
  const [[x0, y0], [x1, y1]] = parent ? geoPath(base).bounds(parent) : mainBounds(geom, base);
  const fit = Math.max(x1 - x0, ((y1 - y0) * W) / H);
  const draw = (span) => {
    const w = Math.min(span, 2 * Math.PI);
    const h = (w * H) / W;
    const cx = (x0 + x1) / 2;
    // keep the window inside the part of the world a web map shows
    const cy = Math.max(-Y_MAX + h / 2, Math.min(Y_MAX - h / 2, (y0 + y1) / 2));
    const k = W / w;
    const projection = geoMercator()
      .rotate([-lon, 0])
      .scale(k)
      .translate([W / 2 - cx * k, H / 2 - cy * k])
      .clipExtent([
        [-1, -1],
        [W + 1, H + 1],
      ])
      .precision(0.1);
    return { projection, land: trace(land, projection, 1.2, 2), w };
  };
  let view = draw(parent ? fit * 1.12 : Math.max(fit * 3, MIN_SPAN));
  // a small island nation in open ocean (Fiji, Hawaii) would show only sea: widen the window until some land is in view
  // besides the place itself
  for (let span = view.w * 1.8; !parent && span < 2 * Math.PI * 1.8 && otherLand(view.land) < 40; span *= 1.8) view = draw(span);
  const { projection } = view;
  const me = trace(geom, projection, 0.4, 0.02, 1);
  const [[a0, b0], [a1, b1]] = geoPath(projection).bounds(geom);
  const tiny = Math.max(a1 - a0, b1 - b0) < 6;
  return {
    land: view.land,
    ...(parent ? { parent: trace(parent, projection, 0.8, 0.5) } : {}),
    me,
    // a speck gets a ring around it, so it can be found
    ...(tiny || !me ? { dot: [+((a0 + a1) / 2).toFixed(1), +((b0 + b1) / 2).toFixed(1)] } : {}),
  };
}

/** Roughly how much land a traced path covers, in square units (its rings' areas added up). */
function otherLand(d) {
  let total = 0;
  for (const ring of d.split("M").filter(Boolean)) {
    const n = ring.replace(/Z/g, "").trim().split(/\s+/).map(Number);
    let a = 0;
    for (let i = 0; i + 1 < n.length; i += 2) a += n[i] * n[(i + 3) % n.length] - n[(i + 2) % n.length] * n[i + 1];
    total += Math.abs(a) / 2;
  }
  return total;
}
