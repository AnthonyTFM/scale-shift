// Records every daily puzzle from launch to today (UTC) in tests/fixtures/daily-history.json, so `npm test` fails if a
// later change to the pool or the picking code ever alters a day that's already been played. Days already recorded are
// never rewritten. Run it before changing the daily pool or src/lib/daily.ts, and commit the file.
import { readFileSync, writeFileSync } from "node:fs";
import { LAUNCH, shiftDate } from "../src/lib/daily.ts";
import { puzzleKey } from "../tests/daily-key.mjs";

const FILE = new URL("../tests/fixtures/daily-history.json", import.meta.url);
const pool = JSON.parse(readFileSync(new URL("../src/data/daily-pool.json", import.meta.url), "utf8"));
let history = {};
try {
  history = JSON.parse(readFileSync(FILE, "utf8"));
} catch {
  /* first run */
}
const today = new Date().toISOString().slice(0, 10);
let added = 0;
for (let d = LAUNCH; d <= today; d = shiftDate(d, 1)) {
  if (history[d]) continue;
  history[d] = puzzleKey(pool, d);
  added++;
}
writeFileSync(FILE, JSON.stringify(history, null, 1) + "\n");
console.log(`daily history: ${Object.keys(history).length} days recorded (${added} new)`);
