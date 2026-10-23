// Makes every spot on every era's map belong to one shape (see scripts/lib/overlaps.mjs), then re-colours the eras,
// since cutting shapes apart changes who borders whom. npm run data does the same as part of a full rebuild.
// Usage: node scripts/fix-overlaps.mjs

import fs from "node:fs";
import path from "node:path";
import { recolorEraFiles } from "./lib/colors.mjs";
import { eraStatsFromFiles } from "./lib/era-stats.mjs";
import { separateEraFiles } from "./lib/overlaps.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");

const report = separateEraFiles(ROOT);
for (const { era, cut } of report) if (cut) console.log(`  ${era.padEnd(8)} ${cut} shapes cut where they overlapped others`);
const { clashes } = recolorEraFiles(ROOT);
console.log(`recoloured (${clashes} neighbouring pairs share a colour)`);
// cutting shapes changes their areas: rebuild the era statistics from the new files
const eras = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/eras.json"), "utf8"));
const stats = JSON.stringify(eraStatsFromFiles(ROOT, eras));
for (const dir of ["src/data", "public/data"]) fs.writeFileSync(path.join(ROOT, dir, "era-stats.json"), stats);
console.log("era statistics rebuilt");
