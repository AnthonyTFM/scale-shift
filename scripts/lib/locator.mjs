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
// how far a web map reaches toward the poles (±80°), in Mercator units
const Y_MAX = Math.log(Math.tan(Math.PI / 4 + (80 * Math.PI) / 360));

// the country a region is drawn inside, by its era ("adm1-bra" → Brazil); US states sit in the lower 48
const PARENT = { "adm1-can": "Canada", "adm1-aus": "Australia", "adm1-mex": "Mexico", "adm1-bra": "Brazil", "adm1-ind": "India", "adm1-chn": "China" };

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

/** The bounds of a geometry's largest piece (far-off islands left out), in a projection. */
function mainBounds(geom, projection) {
  const polys = geom.type === "MultiPolygon" ? geom.coordinates.map((c) => ({ type: "Polygon", coordinates: c })) : [geom];
  const p = geoPath(projection);
  let best = polys[0];
  for (const g of polys) if (p.area(g) > p.area(best)) best = g;
  return p.bounds(best);
}

/** The locator for one pool shape, or null where a web map can't show it (Antarctica). */
export function locator(DATA, entry, geom, lat, lon) {
  if (Math.abs(lat) > 75) return null;
  const { land, country, lower48 } = load(DATA);
  const parent =
    PARENT[entry.era] !== undefined
      ? country.get(PARENT[entry.era])
      : entry.era === "us" && entry.n !== "Contiguous United States" && entry.n !== "Alaska" && entry.n !== "Hawaii"
        ? lower48
        : null;
  // centred on the place's longitude, so nothing splits at the 180° line
  const base = geoMercator().rotate([-lon, 0]).scale(1).translate([0, 0]).precision(0.1);
  const [[x0, y0], [x1, y1]] = parent ? geoPath(base).bounds(parent) : mainBounds(geom, base);
  const span = parent ? Math.max(x1 - x0, ((y1 - y0) * W) / H) * 1.12 : Math.max(Math.max(x1 - x0, ((y1 - y0) * W) / H) * 3, MIN_SPAN);
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
  const me = trace(geom, projection, 0.4, 0.02, 1);
  const [[a0, b0], [a1, b1]] = geoPath(projection).bounds(geom);
  const tiny = Math.max(a1 - a0, b1 - b0) < 6;
  return {
    land: trace(land, projection, 1.2, 2),
    ...(parent ? { parent: trace(parent, projection, 0.8, 0.5) } : {}),
    me,
    // a speck gets a ring around it, so it can be found
    ...(tiny || !me ? { dot: [+((a0 + a1) / 2).toFixed(1), +((b0 + b1) / 2).toFixed(1)] } : {}),
  };
}
