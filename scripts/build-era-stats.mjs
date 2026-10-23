// Rebuilds only the era statistics (src/data/era-stats.json and public/data/era-stats.json) from the era files already in
// public/data/eras, without downloading the sources. `npm run data` does this too, as its last step.  Run: npm run data:stats
import fs from "node:fs";
import path from "node:path";
import { eraStatsFromFiles } from "./lib/era-stats.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const eras = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/eras.json"), "utf8"));
const stats = eraStatsFromFiles(ROOT, eras);
for (const dir of ["src/data", "public/data"]) fs.writeFileSync(path.join(ROOT, dir, "era-stats.json"), JSON.stringify(stats));
// new figures: bump the data version so browsers and the CDN fetch the file again (the map's What changed panel)
fs.writeFileSync(path.join(ROOT, "src/data/data-version.json"), JSON.stringify({ v: Date.now().toString(36) }));
console.log(`era statistics: ${stats.length} eras`);
