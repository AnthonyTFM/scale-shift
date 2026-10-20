// Political-map colouring for every era at once, shared by build-data.mjs and recolor-eras.mjs.
// Every owner (the ruler for colonies, else the state itself) gets ONE colour for as long as it is on the map, from
// the first era it appears in to the last. Two owners that border each other in any era never share a colour.
// Owners are coloured together across all eras (DSATUR: the most constrained owner picks next), which fits the eight
// palette colours with no clashes for the current data.

import fs from "node:fs";
import path from "node:path";
import * as client from "topojson-client";

export const PALETTE_SIZE = 8;

const plain = (s) => s.toLowerCase().trim();
/** "Russia" ~ "Russian Empire", "United Kingdom" ~ "United Kingdom of Great Britain and Ireland": one starts the other. */
const sameStart = (a, b) => plain(a).startsWith(plain(b)) || plain(b).startsWith(plain(a));

/**
 * Who each shape belongs to in one era: its ruler for colonies, else itself. Sources sometimes give a ruler a name with
 * no shape of its own that era (1914 lists the Russian Empire as ruled by "Russia"); such a ruler is read as its
 * homeland, the biggest of its shapes whose name matches the ruler's, so the empire keeps its colour from the eras
 * before and after. Failing a name match, a shape that rules others in some era counts as the homeland (1945 lists the
 * United States as ruled by "USA"). `canon` maps a name to the one name its country goes by in every era, and `rulers`
 * is every name that rules other shapes in some era (see eraContext).
 */
export function ownersOf(geoms, canon = new Map(), rulers = new Set()) {
  const names = new Set(geoms.map((g) => g.properties?.n).filter(Boolean));
  const home = new Map();
  for (const g of geoms) {
    const s = g.properties?.s;
    const n = g.properties?.n;
    if (!s || !n || names.has(s)) continue;
    const rank = sameStart(n, s) ? 2 : rulers.has(n) ? 1 : 0; // a matching name beats a ruler elsewhere
    if (!rank) continue;
    const cur = home.get(s);
    if (!cur || rank > cur.rank || (rank === cur.rank && (g.properties.a || 0) > (cur.g.properties.a || 0))) home.set(s, { g, rank });
  }
  const c = (name) => canon.get(name) ?? name;
  return (props) => (props?.n ? c(props.s ? (home.get(props.s)?.g.properties.n ?? props.s) : props.n) : null);
}

/**
 * One name per country across eras when the sources rename it by adding words: "United Kingdom of Great Britain and
 * Ireland" is the "United Kingdom", the "Empire of Brazil" is "Brazil". A longer name is folded into a shorter one it
 * starts with (whole words) or ends with after "of", unless
 * the two ever border each other (then they need different colours); names with a bracket ("Germany (UK)", an
 * occupation zone) never fold.
 */
/** What ownersOf needs from all eras together: one name per country, and every name that rules others somewhere. */
export function eraContext(topos) {
  const rulers = new Set();
  for (const topo of topos) for (const g of topo.objects.p.geometries) if (g.properties?.s) rulers.add(g.properties.s);
  return { canon: canonicalNames(topos), rulers };
}

export function canonicalNames(topos) {
  const seen = new Set();
  // "a|b" for names whose own shapes border each other in some era (colonies don't count: two labels for one empire's
  // colonies may well touch, and should share its colour)
  const touch = new Set();
  for (const topo of topos) {
    const geoms = topo.objects.p.geometries;
    const nb = client.neighbors(geoms);
    geoms.forEach((g, i) => {
      for (const name of [g.properties?.n, g.properties?.s]) if (name) seen.add(name);
      const a = g.properties?.n;
      if (a) for (const j of nb[i]) if (geoms[j].properties?.n && geoms[j].properties.n !== a) touch.add(a + "|" + geoms[j].properties.n);
    });
  }
  const names = [...seen].filter((n) => !/[()]/.test(n)).sort((a, b) => a.length - b.length);
  const canon = new Map();
  for (const long of names)
    for (const short of names) {
      if (short.length >= long.length) break;
      if (!plain(long).startsWith(plain(short) + " ") && !plain(long).endsWith(" of " + plain(short))) continue;
      if (!touch.has(long + "|" + short)) {
        canon.set(long, canon.get(short) ?? short);
        break;
      }
    }
  return canon;
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Colours every era topology in `topos` (sets properties.k on every named shape) so each owner keeps one colour across
 * all of them. Returns the number of neighbouring owner pairs that had to share a colour (0 unless the palette is too
 * small for the map).
 */
export function colorAllEras(topos) {
  const { canon, rulers } = eraContext(topos);
  // who borders whom, in any era
  const adj = new Map();
  const link = (a, b) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a).add(b);
  };
  for (const topo of topos) {
    const geoms = topo.objects.p.geometries;
    const ownerOf = ownersOf(geoms, canon, rulers);
    const nb = client.neighbors(geoms);
    geoms.forEach((g, i) => {
      const o = ownerOf(g.properties);
      if (!o) return;
      if (!adj.has(o)) adj.set(o, new Set());
      for (const j of nb[i]) {
        const other = ownerOf(geoms[j].properties);
        if (other && other !== o) {
          link(o, other);
          link(other, o);
        }
      }
    });
  }

  // DSATUR: repeatedly colour the owner whose neighbours already use the most colours (ties: most neighbours, then name)
  const color = new Map();
  const left = new Set(adj.keys());
  const usedBy = (o) => {
    const used = new Set();
    for (const x of adj.get(o)) if (color.has(x)) used.add(color.get(x));
    return used;
  };
  let clashes = 0;
  while (left.size) {
    let pick = null;
    let pickSat = -1;
    let pickDeg = -1;
    for (const o of left) {
      const sat = usedBy(o).size;
      const deg = adj.get(o).size;
      if (sat > pickSat || (sat === pickSat && (deg > pickDeg || (deg === pickDeg && o < pick)))) [pick, pickSat, pickDeg] = [o, sat, deg];
    }
    const used = usedBy(pick);
    const start = hashString(pick) % PALETTE_SIZE;
    let c = -1;
    for (let t = 0; t < PALETTE_SIZE && c < 0; t++) if (!used.has((start + t) % PALETTE_SIZE)) c = (start + t) % PALETTE_SIZE;
    if (c < 0) {
      // no colour free: share with the fewest neighbours
      let fewest = Infinity;
      for (let t = 0; t < PALETTE_SIZE; t++) {
        const n = [...adj.get(pick)].filter((x) => color.get(x) === t).length;
        if (n < fewest) [fewest, c] = [n, t];
      }
      clashes += fewest;
    }
    color.set(pick, c);
    left.delete(pick);
  }

  for (const topo of topos) {
    const ownerOf = ownersOf(topo.objects.p.geometries, canon, rulers);
    for (const g of topo.objects.p.geometries) {
      const o = ownerOf(g.properties);
      if (o) g.properties.k = color.get(o);
    }
  }
  return clashes;
}

/** Re-colours the era files on disk (public/data/eras, in src/data/eras.json order) and bumps the data version. */
export function recolorEraFiles(root) {
  const eras = JSON.parse(fs.readFileSync(path.join(root, "src/data/eras.json"), "utf8"));
  const files = eras.map((e) => path.join(root, "public/data/eras", `${e.key}.json`));
  const topos = files.map((f) => JSON.parse(fs.readFileSync(f, "utf8")));
  const clashes = colorAllEras(topos);
  topos.forEach((t, i) => fs.writeFileSync(files[i], JSON.stringify(t)));
  // new colours mean new files: bump the data version so browsers and the CDN fetch them again
  fs.writeFileSync(path.join(root, "src/data/data-version.json"), JSON.stringify({ v: Date.now().toString(36) }));
  return { eras: eras.length, clashes };
}
