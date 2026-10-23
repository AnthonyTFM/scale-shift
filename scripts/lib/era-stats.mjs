// Era statistics for the era pages and the map's "What changed" panel, read from the finished era files (after overlaps
// are cut and coastal strips filled), so every figure matches what the map draws.
//
// "What changed" compares each era with the one before by country, not by exact name, so a renamed state shows as one
// row, "Name (after Old name)", instead of appearing and disappearing. Two names are one country when
//   - they differ only by a bracket: "Arabia" / "Arabia (Nejd)";
//   - one is the other "of" something or plus a generic word: "Kingdom of Georgia" / "Georgia", "Han Empire" / "Han";
//   - src/content/lineages.ts lists them as one state and one clearly takes over from the other between two snapshots:
//     "British American colonies" → "United States of America";
// and never when the two are on the map in the same era (Zhou states and Qin, the four zones of Germany), or when one is
// a colony (it has a ruler) and the other isn't by name alone: the 1783 "India" of the East India Company is not the
// Mughal Empire.
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

/** First letters of the distinctive words in a name, to tell "Parthia" → "Parthian Empire" from "Seleucid Kingdom". */
const stems = (n) =>
  new Set(
    bare(n)
      .toLowerCase()
      .split(/[^\p{L}]+/u)
      .filter((w) => w.length >= 4 && !GENERIC.has(w))
      .map((w) => w.slice(0, 5)),
  );

/** Union-find over name nodes; a join is refused when the two groups are ever on the map in the same era. */
function countryGroups(nodesByEra, lineages) {
  // where each node is on the map (a sliver under GONE doesn't count: 1930's 0 km² "Turkey" beside the Republic)
  const when = new Map(); // group root → era indexes it is on the map
  const size = new Map(); // node → its largest area in any era
  nodesByEra.forEach((nodes, i) => {
    for (const [n, a] of nodes) {
      if (!when.has(n)) when.set(n, new Set());
      if (a >= GONE) when.get(n).add(i);
      size.set(n, Math.max(size.get(n) ?? 0, a));
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
  // same name apart from a bracket, "of" or a generic word: colonies with colonies, states with states. Biggest first,
  // so when several share a name at once (the four parts of Rome in 300) the biggest carries it on.
  for (const kind of [(n) => n.startsWith("c:"), (n) => !n.startsWith("c:")]) {
    const list = all.filter(kind).sort((a, b) => size.get(b) - size.get(a));
    const byStem = new Map(); // first word → names, to keep this from comparing every pair
    for (const n of list) {
      const k = bare(nameOf(n)).toLowerCase().split(/\s+/)[0];
      if (!byStem.has(k)) byStem.set(k, []);
      byStem.get(k).push(n);
    }
    for (const long of list) {
      const words = bare(nameOf(long)).toLowerCase().split(/\s+/);
      // the short name is the start of the long one, or what follows its last "of"
      const of = words.lastIndexOf("of");
      for (const k of new Set([words[0], of >= 0 ? words[of + 1] : null].filter(Boolean)))
        for (const short of byStem.get(k) ?? [])
          if (short !== long && nameOf(short).length <= nameOf(long).length && sameName(nameOf(long), nameOf(short))) join(long, short);
    }
  }
  // lineages.ts: between two snapshots, a listed name that is new follows on from a listed name that is gone, when
  // that's the only pair or their names share a word (Parthia → Parthian Empire). A colony can become a state (British
  // American colonies → United States of America), not the other way round. Anything less clear stays apart: Qin and the Zhou states both end in 200 BCE,
  // and either could be read as the Han's predecessor.
  for (const names of lineages) {
    const listed = new Set(names);
    const isListed = (n) => listed.has(nameOf(n));
    for (let i = 0; i + 1 < nodesByEra.length; i++) {
      const [a, b] = [nodesByEra[i], nodesByEra[i + 1]];
      const big = (m, n) => (m.get(n) ?? 0) >= GONE;
      const gone = [...a.keys()].filter((n) => isListed(n) && big(a, n) && !big(b, n));
      const fresh = [...b.keys()].filter((n) => isListed(n) && big(b, n) && !big(a, n));
      // a state never carries on as a colony: the Mughal Empire doesn't become the East India Company's 1783 "India"
      const follows = (g, f) => g.startsWith("c:") || !f.startsWith("c:");
      if (!gone.length || !fresh.length) continue;
      if (gone.length === 1 && fresh.length === 1) {
        if (follows(gone[0], fresh[0])) join(gone[0], fresh[0]);
        continue;
      }
      for (const f of fresh) {
        const sf = stems(nameOf(f));
        const kin = gone.filter((g) => follows(g, f) && [...stems(nameOf(g))].some((w) => sf.has(w)));
        if (kin.length === 1) join(kin[0], f);
      }
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
  const firstSeen = new Map();
  named.forEach((m, i) => {
    for (const [n, a] of m) {
      if (a < GONE) continue;
      lastSeen.set(n, i);
      if (!firstSeen.has(n)) firstSeen.set(n, i);
    }
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
        // a real hand-over: the old name is gone for good and the new one is new here (not "Germany (after West Germany)")
        const renamed = !sameName(p.n, c.n) && !sameName(c.n, p.n) && lastSeen.get(p.n) < i && firstSeen.get(c.n) === i;
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
