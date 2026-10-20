// Builds public/data/lakes.json: the big natural lakes, drawn as water on every era's map so a lake never appears in
// one snapshot and vanishes in the next (the border sources disagree about which lakes they leave out).
// Run with: npm run data   (needs .cache/ne_50m_lakes.geojson from Natural Earth, public domain:
// https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_lakes.geojson)

import fs from "node:fs";
import path from "node:path";
import { geoArea } from "d3-geo";
import * as server from "topojson-server";
import * as simplifyLib from "topojson-simplify";
import * as client from "topojson-client";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const SOURCE = path.join(ROOT, ".cache", "ne_50m_lakes.geojson");
const OUT = path.join(ROOT, "public", "data", "lakes.json");
const EARTH_R = 6371.0088;
const MIN_KM2 = 1000;
// Lakes made or emptied by people in the last century don't belong on older maps, and the Australian "lakes" are
// salt pans that are dry most years.
const SKIP = new Set(["Razzaza Lake", "Sarygamysh Köli", "Salton Sea", "Lake Tharthar"]);
const inAustralia = (f) => {
  const [x, y] = f.geometry.type === "Polygon" ? f.geometry.coordinates[0][0] : f.geometry.coordinates[0][0][0];
  return x > 110 && x < 155 && y < -10 && y > -45;
};

/** d3 wants clockwise outer rings; a polygon that comes out bigger than half the globe is wound the other way. */
function fixWinding(f) {
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  const fixed = polys.map((rings) => {
    const poly = { type: "Polygon", coordinates: rings };
    return geoArea(poly) > 2 * Math.PI ? rings.map((r) => [...r].reverse()) : rings;
  });
  return { type: "Feature", properties: { n: f.properties.name }, geometry: { type: "MultiPolygon", coordinates: fixed } };
}

const src = JSON.parse(fs.readFileSync(SOURCE, "utf8"));
const lakes = src.features
  .filter((f) => f.properties.featurecla === "Lake" || (f.properties.featurecla === "Alkaline Lake" && !inAustralia(f)))
  .filter((f) => !SKIP.has(f.properties.name))
  .map(fixWinding)
  .filter((f) => geoArea(f) * EARTH_R ** 2 >= MIN_KM2);

let topo = server.topology({ lakes: { type: "FeatureCollection", features: lakes } }, 1e5);
topo = simplifyLib.simplify(simplifyLib.presimplify(topo), 0.003);
topo = client.quantize(topo, 2e4);
fs.writeFileSync(OUT, JSON.stringify(topo));
console.log(`lakes: ${lakes.length} kept, ${Math.round(fs.statSync(OUT).size / 1024)} KB → public/data/lakes.json`);
