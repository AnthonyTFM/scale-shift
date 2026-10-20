#!/usr/bin/env node
/**
 * Sanity check for public/data, run in CI and after `npm run data`:  npm run check:data
 * - every era listed in src/data/eras.json has a map file that decodes
 * - no shape is wound inside-out (it would cover the whole map)
 * - the daily-challenge pool and the Antarctic claims exist and match
 */
import fs from "node:fs";
import path from "node:path";
import { feature } from "topojson-client";
import { geoArea } from "d3-geo";

const root = process.cwd();
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const problems = [];
let shapes = 0;

const eras = read("src/data/eras.json");
for (const e of eras) {
  const file = `public/data/eras/${e.key}.json`;
  if (!fs.existsSync(path.join(root, file))) {
    problems.push(`missing ${file}`);
    continue;
  }
  const topo = read(file);
  for (const obj of Object.values(topo.objects)) {
    for (const f of feature(topo, obj).features) {
      shapes++;
      if (geoArea(f) > 2 * Math.PI) problems.push(`inside-out: ${e.key} ${f.properties?.n || "(unnamed)"}`);
    }
  }
}

const pool = read("public/data/daily/index.json");
const serverPool = read("src/data/daily-pool.json");
if (JSON.stringify(pool) !== JSON.stringify(serverPool)) problems.push("daily pool: public/data/daily/index.json and src/data/daily-pool.json differ (run npm run data)");
for (const p of pool) if (!fs.existsSync(path.join(root, `public/data/daily/shapes/${p.id}.json`))) problems.push(`daily pool: missing shape ${p.id}`);

const claims = read("public/data/antarctic-claims.json");
for (const c of read("src/content/antarctic-claims.json").claims) if (!claims[c.id]) problems.push(`antarctic claims: missing ${c.id}`);
// the big lakes drawn on every era (scripts/build-lakes.mjs)
if (!fs.existsSync(path.join(root, "public/data/lakes.json"))) problems.push("missing public/data/lakes.json (run npm run data)");
else {
  const lakes = read("public/data/lakes.json");
  const list = feature(lakes, lakes.objects.lakes).features;
  if (list.length < 50) problems.push(`lakes: only ${list.length} lakes`);
  for (const f of list) if (geoArea(f) > 2 * Math.PI) problems.push(`inside-out lake: ${f.properties?.n || "(unnamed)"}`);
}

for (const p of problems) console.log(p);
console.log(`${eras.length} eras, ${shapes} shapes, ${pool.length} daily shapes checked: ${problems.length} problems`);
process.exit(problems.length ? 1 : 0);
