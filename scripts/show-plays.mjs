// Prints the anonymous daily-game counts (src/lib/plays.ts): players per day, new vs returning, Day-1 and Day-7 return,
// and the average score.  Run: npm run plays
// Reads Redis when the Upstash settings are available (in .env.local or the shell, the same ones the leaderboard uses),
// otherwise the local file data/plays.json.
import fs from "node:fs";
import path from "node:path";

// process.loadEnvFile needs Node 20.12+; on older Node set the Upstash settings in the shell instead
for (const f of [".env.local", ".env"]) {
  if (typeof process.loadEnvFile !== "function") break;
  try {
    process.loadEnvFile(f);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
}

const LAUNCH = "2026-10-19";
const shift = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const today = new Date().toISOString().slice(0, 10);
const dates = [];
for (let d = LAUNCH; d <= shift(today, 1); d = shift(d, 1)) dates.push(d);

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
let days;
if (url && token) {
  const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(dates.map((d) => ["HGETALL", `pl:day:${d}`])),
  });
  if (!res.ok) throw new Error(`Redis responded ${res.status}`);
  const out = await res.json();
  days = Object.fromEntries(
    out.map((o, i) => {
      const a = o.result ?? [];
      const m = {};
      for (let j = 0; j < a.length; j += 2) m[a[j]] = Number(a[j + 1]);
      return [dates[i], m];
    }),
  );
  console.log("From Redis (pl:day:*)");
} else {
  const file = path.join(process.cwd(), "data", "plays.json");
  days = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  console.log(`From ${file}${fs.existsSync(file) ? "" : " (not there yet)"}`);
}

const get = (d, f) => days[d]?.[f] ?? 0;
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : "–");
// a day's return rate is only final once that later day is over everywhere (UTC+14 runs a day ahead)
const done = (d) => shift(d, 1) < today;
const rows = dates
  .filter((d) => get(d, "n"))
  .map((d) => {
    const n = get(d, "n");
    const fresh = get(d, "f0");
    const avg = [0, 1, 2, 3, 4, 5].reduce((sum, s) => sum + s * get(d, `s${s}`), 0) / n;
    const back = (k) => (done(shift(d, k)) ? pct(get(shift(d, k), `f${k}`), fresh) : "…");
    return { Date: d, Players: n, New: fresh, Returning: n - fresh, "D1 return": back(1), "D7 return": back(7), "Avg score": avg.toFixed(1) };
  });
if (!rows.length) {
  console.log("No plays counted yet. Counting starts with the first finished daily puzzle after this was deployed.");
  process.exit(0);
}
console.table(rows);

// pooled return over every day whose follow-up day is complete
for (const k of [1, 7]) {
  const base = dates.filter((d) => get(d, "f0") && done(shift(d, k)));
  const fresh = base.reduce((s, d) => s + get(d, "f0"), 0);
  const back = base.reduce((s, d) => s + get(shift(d, k), `f${k}`), 0);
  console.log(`Day-${k} return, all complete days: ${pct(back, fresh)} (${back} of ${fresh} new players)`);
}
console.log("\nNew = first daily puzzle in that browser. Players on two devices count twice; private windows count as new.");
