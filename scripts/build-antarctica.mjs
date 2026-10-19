// Cuts Antarctica (from the present-day map) into the wedges claimed by each country.
// Run with `npm run data`, or on its own: `node scripts/build-antarctica.mjs`.
// Input:  src/content/antarctic-claims.json, public/data/eras/present.json
// Output: public/data/antarctic-claims.json  { id: MultiPolygon } for every claim plus "unclaimed"

import fs from "node:fs";
import path from "node:path";
import { geoArea } from "d3-geo";
import * as client from "topojson-client";
import polygonClipping from "polygon-clipping";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const R = 6371;
const content = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "content", "antarctic-claims.json"), "utf8"));
const topo = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "data", "eras", "present.json"), "utf8"));
const geoms = Object.values(topo.objects)[0].geometries;
const ant = geoms.find((g) => g.properties.n === "Antarctica");
if (!ant) throw new Error("Antarctica not found in present.json");
const land = client.feature(topo, ant).geometry;
const landPolys = land.type === "Polygon" ? [land.coordinates] : land.coordinates;

// a wedge as a planar lon/lat box: edges are meridians, the 60°S parallel and 85°S, where the map ends.
// Stopping short of the pole matters: d3 can't reliably draw a shape that touches a pole on a zoomed-in map.
// Both parallels are densified so they stay parallels.
const wedge = ([w, e]) => {
  const ring = [];
  for (let lon = w; lon <= e; lon += 1) ring.push([lon, -85]);
  ring.push([e, -85]);
  for (let lon = e; lon >= w; lon -= 1) ring.push([lon, -60]);
  ring.push([w, -60], [w, -85]);
  return [ring.map(([x, y]) => [x, y])];
};

// d3 wants rings wound so the polygon is the small side; flip any ring that came out covering the rest of the globe
const fixWinding = (polys) =>
  polys.map((poly) =>
    poly.map((ring, i) => {
      const a = geoArea({ type: "Polygon", coordinates: [ring] });
      const wrong = i === 0 ? a > 2 * Math.PI : a < 2 * Math.PI;
      return wrong ? [...ring].reverse() : ring;
    }),
  );

const out = {};
const sectors = [...content.claims.map((c) => [c.id, c.ranges]), ["unclaimed", content.unclaimed.ranges]];
for (const [id, ranges] of sectors) {
  const parts = ranges.flatMap((r) => polygonClipping.intersection(landPolys, wedge(r)));
  const geom = { type: "MultiPolygon", coordinates: fixWinding(parts).map((p) => p.map((ring) => ring.map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)]))) };
  out[id] = geom;
  console.log(`  ${id.padEnd(10)} ${(geoArea(geom) * R * R / 1e6).toFixed(2)}M km²`);
}
fs.writeFileSync(path.join(ROOT, "public", "data", "antarctic-claims.json"), JSON.stringify(out));
console.log(`antarctic claims: ${sectors.length} shapes, ${(fs.statSync(path.join(ROOT, "public", "data", "antarctic-claims.json")).size / 1024).toFixed(0)} KB`);
