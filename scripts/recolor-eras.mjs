// Re-colours the era files already in public/data/eras with scripts/lib/colors.mjs, in year order, without
// rebuilding the borders (npm run data does the same as part of a full rebuild).
// Usage: node scripts/recolor-eras.mjs [--check]   (--check only reports how often colours change between eras)

import fs from "node:fs";
import path from "node:path";
import { assignColors } from "./lib/colors.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const check = process.argv.includes("--check");
const eras = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/eras.json"), "utf8"));
const ownerOf = (p) => (p?.n ? p.s || p.n : null);

let prev = null;
let prevK = null;
let kept = 0;
let changed = 0;
const examples = [];
for (const e of eras) {
  const file = path.join(ROOT, "public/data/eras", `${e.key}.json`);
  const topo = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!check) prev = assignColors(topo, prev);
  // owners present in both this era and the last: did their colour stay the same?
  const k = new Map();
  for (const g of topo.objects.p.geometries) if (ownerOf(g.properties)) k.set(ownerOf(g.properties), g.properties.k);
  if (prevK)
    for (const [o, c] of k)
      if (prevK.has(o)) {
        if (prevK.get(o) === c) kept++;
        else {
          changed++;
          if (examples.length < 8) examples.push(`${o} (${e.key})`);
        }
      }
  prevK = k;
  if (!check) fs.writeFileSync(file, JSON.stringify(topo));
}
// new colours mean new files: bump the data version so browsers and the CDN fetch them again
if (!check) fs.writeFileSync(path.join(ROOT, "src", "data", "data-version.json"), JSON.stringify({ v: Date.now().toString(36) }));
const pct = Math.round((100 * kept) / Math.max(1, kept + changed));
console.log(`${check ? "checked" : "recoloured"} ${eras.length} eras: the same owner kept its colour ${pct}% of the time (${kept} kept, ${changed} changed)`);
if (changed) console.log(`  e.g. ${examples.join(", ")}`);
