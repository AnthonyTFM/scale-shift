// Era statistics for the era pages and the map's "What changed" panel, read from the finished era files (after overlaps
// are cut and coastal strips filled), so every figure matches what the map draws.
//
// "What changed" compares each era with the one before by country, not by exact name, so a renamed state shows as one
// row, "Name (after Old name)", instead of appearing and disappearing. Two names are one country when
//   - they differ only by a bracket: "Arabia" / "Arabia (Nejd)";
//   - one is the other "of" something or plus a generic word: "Kingdom of Georgia" / "Georgia", "Han Empire" / "Han";
//   - src/content/lineages.ts lists them as one state: "United States of America" / "United States";
// and never when the two are on the map in the same era (Zhou states and Qin, the four zones of Germany), or when one is
// a colony (it has a ruler) and the other isn't, unless the names are identical: the 1783 "India" of the East India
// Company is not the Mughal Empire.
import fs from "node:fs";
import path from "node:path";

const MIN_CHANGE = 20000; // km²: smaller states don't get "appeared"/"disappeared" rows
const GONE = 1000; // km²: a country left with less than this has disappeared, not "shrunk to 0k"
const GENERIC = new Set(["empire", "kingdom", "state", "states", "sultanate", "caliphate", "khanate", "republic", "confederacy", "confederation", "dynasty", "emirate"]);

/** A name without its bracket: "Algeria (FR)" → "Algeria". */
const bare = (n) => n.replace(/\s*\([^)]*\)$/, "");

/** The name lists in src/content/lineages.ts (a TS file, so read as text: every double-quoted string in a `names: [...]`). */
function lineageLists(root) {
  const text = fs.readFileSync(path.join(root, "src/content/lineages.ts"), "utf8");
  return [...text.matchAll(/names:\s*\[([^\]]*)\]/g)].map(([, list]) => [...list.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => JSON.parse(`"${m[1]}"`)));
}

/** One node per name and status: "c:" + name for shapes with a ruler, so a colony never joins a state. */
const nodeOf = (p) => (p.s ? `c:${p.n}` : p.n);
const nameOf = (node) => (node.startsWith("c:") ? node.slice(2) : node);

/** Is `long` the same name as `short` with "… of" in front or a generic word after? */
function sameName(long, short) {
  const l = bare(long).toLowerCase();
  const s = bare(short).toLowerCase();
  if (l === s) return true;
  if (l.endsWith(` of ${s}`)) return true;
  if (!l.startsWith(`${s} `)) return false;
  return l
    .slice(s.length + 1)
    .split(/\s+/)
    .every((w) => GENERIC.has(w));
}

/** Union-find over name nodes; a join is refused when the two groups are ever on the map in the same era. */
function countryGroups(nodesByEra, lineages) {
  const when = new Map(); // group root → era indexes it is on the map
  nodesByEra.forEach((nodes, i) => {
    for (const n of nodes.keys()) {
      if (!when.has(n)) when.set(n, new Set());
      when.get(n).add(i);
    }
  });
  const all = [...when.keys()];
  const root = new Map();
  const find = (x) => {
    while (root.has(x)) x = root.get(x);
    return x;
  };
  const join = (a, b) => {
    const [ra, rb] = [find(a), find(b)];
    if (ra === rb) return;
    const wa = when.get(ra);
    const wb = when.get(rb);
    for (const i of wa) if (wb.has(i)) return; // both on the map at once: two countries
    root.set(ra, rb);
    for (const i of wa) wb.add(i);
  };
  // exactly the same name is the same country, colony or not (1914 lists the Russian Empire under a ruler, 1945 the US)
  for (const n of all) if (n.startsWith("c:") && when.has(nameOf(n))) join(n, nameOf(n));
  // same name apart from a bracket, "of" or a generic word: colonies with colonies, states with states
  for (const kind of [(n) => n.startsWith("c:"), (n) => !n.startsWith("c:")]) {
    const list = all.filter(kind).sort((a, b) => a.length - b.length);
    for (const long of list)
      for (const short of list) {
        if (short.length > long.length) break;
        if (short !== long && sameName(nameOf(long), nameOf(short))) join(long, short);
      }
  }
  // lineages.ts, read the way the map reads it: in each era the state is its biggest listed name, and that name follows
  // on from the one the era before (a smaller name on the map alongside, like the Post-Ming Warlords, stays its own)
  for (const names of lineages) {
    const listed = new Set(names);
    let prev = null;
    for (const eraNodes of nodesByEra) {
      let best = null;
      for (const [n, a] of eraNodes) if (!n.startsWith("c:") && listed.has(n) && (!best || a > best.a)) best = { n, a };
      if (best && prev) join(prev, best.n);
      prev = best?.n ?? null; // a gap breaks the chain: the Mughal Empire doesn't run into the 1783 "India" colony
    }
  }
  return find;
}

/** Stats for every era in `eras` (src/data/eras.json order), from public/data/eras/<key>.json under `root`. */
export function eraStatsFromFiles(root, eras) {
  const topos = eras.map((e) => JSON.parse(fs.readFileSync(path.join(root, "public/data/eras", `${e.key}.json`), "utf8")));
  const named = []; // per era: shape name → km²
  const nodes = []; // per era: node → km²
  for (const topo of topos) {
    const byName = new Map();
    const byNode = new Map();
    for (const g of topo.objects.p.geometries) {
      const p = g.properties;
      if (!p?.n) continue;
      byName.set(p.n, (byName.get(p.n) || 0) + (p.a || 0));
      byNode.set(nodeOf(p), (byNode.get(nodeOf(p)) || 0) + (p.a || 0));
    }
    named.push(byName);
    nodes.push(byNode);
  }
  const groupOf = countryGroups(nodes, lineageLists(root));
  // a group never has two nodes in one era, so each country here is exactly one name on the map
  const countries = nodes.map((m) => new Map([...m].map(([node, a]) => [groupOf(node), { n: nameOf(node), a }])));
  // "(after …)" only for a name gone for good, not one the sources switch back and forth between
  const lastSeen = new Map();
  named.forEach((m, i) => {
    for (const n of m.keys()) lastSeen.set(n, i);
  });
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
        const renamed = !sameName(p.n, c.n) && !sameName(c.n, p.n) && lastSeen.get(p.n) < i;
        changes.push({ n: c.n, ...(renamed ? { after: p.n } : {}), from: r(p.a), to: r(c.a) });
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
