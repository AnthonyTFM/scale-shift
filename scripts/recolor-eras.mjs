// Gives every country, empire and people one colour for its whole time on the map, across all era files already in
// public/data/eras, without rebuilding the borders (npm run data does the same at the end of a full rebuild).
// Usage: node scripts/recolor-eras.mjs [--check]   (--check only reports, changing nothing)

import fs from "node:fs";
import path from "node:path";
import * as client from "topojson-client";
import { eraContext, ownersOf, recolorEraFiles } from "./lib/colors.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");

if (!process.argv.includes("--check")) {
  const { eras, clashes } = recolorEraFiles(ROOT);
  console.log(`recoloured ${eras} eras (${clashes} neighbouring pairs had to share a colour)`);
}

// report: owners that change colour between eras, and neighbours that share one
const eras = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/eras.json"), "utf8"));
const all = eras.map((e) => JSON.parse(fs.readFileSync(path.join(ROOT, "public/data/eras", `${e.key}.json`), "utf8")));
const { canon, rulers } = eraContext(all);
const seen = new Map();
let changes = 0;
let shared = 0;
for (const topo of all) {
  const geoms = topo.objects.p.geometries;
  const ownerOf = ownersOf(geoms, canon, rulers);
  for (const g of geoms) {
    const o = ownerOf(g.properties);
    if (!o) continue;
    if (seen.has(o) && seen.get(o) !== g.properties.k) changes++;
    seen.set(o, g.properties.k);
  }
  const nb = client.neighbors(geoms);
  geoms.forEach((g, i) => {
    for (const j of nb[i]) {
      const a = ownerOf(g.properties);
      const b = ownerOf(geoms[j].properties);
      if (a && b && a !== b && g.properties.k === geoms[j].properties.k) shared++;
    }
  });
}
console.log(`${seen.size} owners: ${changes} colour changes between eras, ${shared / 2} neighbouring shapes sharing a colour`);
