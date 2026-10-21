// Makes every spot on every era's map belong to one shape (see scripts/lib/overlaps.mjs), then re-colours the eras,
// since cutting shapes apart changes who borders whom. npm run data does the same as part of a full rebuild.
// Usage: node scripts/fix-overlaps.mjs

import path from "node:path";
import { recolorEraFiles } from "./lib/colors.mjs";
import { separateEraFiles } from "./lib/overlaps.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");

const report = separateEraFiles(ROOT);
for (const { era, cut } of report) if (cut) console.log(`  ${era.padEnd(8)} ${cut} shapes cut where they overlapped others`);
const { clashes } = recolorEraFiles(ROOT);
console.log(`recoloured (${clashes} neighbouring pairs share a colour)`);
