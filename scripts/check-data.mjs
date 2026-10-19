#!/usr/bin/env node
/**
 * Sanity check for public/data: every snapshot decodes and no shape renders inside-out on Mercator.
 * Run after `npm run data`:  npm run check:data
 */
import fs from "node:fs";
import path from "node:path";
import { feature } from "topojson-client";
import { geoArea, geoMercator, geoPath } from "d3-geo";

const dir = path.join(process.cwd(), "public/data/years");
const path2d = geoPath(geoMercator().scale(1000 / (2 * Math.PI)).translate([500, 500]));
const rewind = (f) => {
  const fix = (rings) => (geoArea({ type: "Polygon", coordinates: rings }) > 2 * Math.PI ? rings.map((r) => r.slice().reverse()) : rings);
  const g = f.geometry;
  return { ...f, geometry: g.type === "Polygon" ? { type: "Polygon", coordinates: fix(g.coordinates) } : { type: "MultiPolygon", coordinates: g.coordinates.map(fix) } };
};
let bad = 0;
let total = 0;
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const topo = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  for (const obj of Object.values(topo.objects)) {
    for (const f0 of feature(topo, obj).features) {
      total++;
      const [[x0, y0], [x1, y1]] = path2d.bounds(rewind(f0));
      if (x1 - x0 > 900 && y1 - y0 > 900) {
        bad++;
        console.log(`inside-out: ${file} ${f0.id}`);
      }
    }
  }
}
console.log(`${total} shapes checked, ${bad} problems`);
process.exit(bad ? 1 : 0);
