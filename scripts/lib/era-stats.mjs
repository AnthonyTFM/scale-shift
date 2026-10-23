// Era statistics for the era pages and the map's "What changed" panel, read from the finished era files (after overlaps
// are cut and coastal strips filled), so every figure matches what the map draws.
//
// "What changed" compares each era with the one before by country, not by exact name, so a renamed state shows as one
// row "(was …)" instead of appearing and disappearing. Names count as one country when they differ only by a bracket
// ("Arabia (Nejd)", "Algeria (FR)"), when one is the other with words added ("United States of America", "Empire of
// Brazil", the same rule the map's colours use), or when src/content/lineages.ts lists them as one state.
import fs from "node:fs";
import path from "node:path";
import { canonicalNames } from "./colors.mjs";

const MIN_CHANGE = 20000; // km²: smaller states don't get "appeared"/"disappeared" rows
const GONE = 1000; // km²: a country left with less than this has disappeared, not "shrunk to 0k"

/** Area of each named shape in one era file, km² (unnamed land and coastal patches left out). */
function areasByName(topo) {
  const m = new Map();
  for (const g of topo.objects.p.geometries) {
    const p = g.properties;
    if (p?.n) m.set(p.n, (m.get(p.n) || 0) + (p.a || 0));
  }
  return m;
}

/** The name lists in src/content/lineages.ts (a TS file, so read as text: every quoted string inside a `names: [...]`). */
function lineageGroups(root) {
  const text = fs.readFileSync(path.join(root, "src/content/lineages.ts"), "utf8");
  const of = new Map();
  for (const [, list] of text.matchAll(/names:\s*\[([^\]]*)\]/g)) {
    const names = [...list.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => JSON.parse(`"${m[1]}"`));
    for (const n of names) of.set(n, `lineage:${names[names.length - 1]}`);
  }
  return of;
}

/** A name without its bracket: "Algeria (FR)" → "Algeria". */
const bare = (n) => n.replace(/\s*\([^)]*\)$/, "");

/** One key per country for a name (see the top of this file). */
function countryKey(canon, lineage) {
  return (n) => {
    const b = bare(n);
    const base = canon.get(b) ?? b;
    return lineage.get(n) ?? lineage.get(b) ?? lineage.get(base) ?? base;
  };
}

/** Area per country (all of its names that era), and the name it goes by: its biggest name that era. */
function byCountry(areas, keyOf) {
  const out = new Map();
  for (const [n, a] of areas) {
    const k = keyOf(n);
    const cur = out.get(k) ?? { a: 0, n, best: 0 };
    cur.a += a;
    if (a > cur.best) [cur.n, cur.best] = [n, a];
    out.set(k, cur);
  }
  return out;
}

/** Stats for every era in `eras` (src/data/eras.json order), from public/data/eras/<key>.json under `root`. */
export function eraStatsFromFiles(root, eras) {
  const topos = eras.map((e) => JSON.parse(fs.readFileSync(path.join(root, "public/data/eras", `${e.key}.json`), "utf8")));
  const keyOf = countryKey(canonicalNames(topos), lineageGroups(root));
  const named = topos.map(areasByName);
  const countries = named.map((m) => byCountry(m, keyOf));
  const r = Math.round;
  return eras.map((era, i) => {
    const out = { key: era.key, top: [], gained: [], lost: [], appeared: [], vanished: [] };
    out.top = [...named[i].entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([n, a]) => ({ n, a: r(a) }));
    if (i === 0) return out;
    const now = countries[i];
    const before = countries[i - 1];
    const significant = (b, a) => Math.abs(a - b) > Math.max(MIN_CHANGE, 0.08 * Math.max(b, a));
    const changes = [];
    for (const [k, c] of now) {
      const p = before.get(k);
      if (!p || p.a < GONE) {
        if (c.a > MIN_CHANGE) out.appeared.push({ n: c.n, a: r(c.a) });
      } else if (c.a < GONE) {
        if (p.a > MIN_CHANGE) out.vanished.push({ n: p.n, a: r(p.a) });
      } else if (significant(p.a, c.a)) {
        // "(was …)" for a real rename only, not "Madagascar" becoming "Madagascar (France)"
        changes.push({ n: c.n, ...(bare(p.n) !== bare(c.n) ? { was: p.n } : {}), from: r(p.a), to: r(c.a) });
      }
    }
    for (const [k, p] of before) if (!now.has(k) && p.a > MIN_CHANGE) out.vanished.push({ n: p.n, a: r(p.a) });
    out.gained = changes.filter((c) => c.to > c.from).sort((x, y) => y.to - y.from - (x.to - x.from)).slice(0, 8);
    out.lost = changes.filter((c) => c.to < c.from).sort((x, y) => x.to - x.from - (y.to - y.from)).slice(0, 8);
    out.appeared = out.appeared.sort((x, y) => y.a - x.a).slice(0, 8);
    out.vanished = out.vanished.sort((x, y) => y.a - x.a).slice(0, 8);
    return out;
  });
}
