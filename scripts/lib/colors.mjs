// Political-map colouring for every era at once, shared by build-data.mjs and recolor-eras.mjs.
// Every owner (the ruler for colonies, else the state itself) gets ONE colour for as long as it is on the map, from
// the first era it appears in to the last. Two owners that border each other in any era never share a colour.
// Owners are coloured together across all eras (DSATUR: the most constrained owner picks next), which fits the eight
// palette colours with no clashes for the current data.

import fs from "node:fs";
import path from "node:path";
import { geoContains } from "d3-geo";
import * as client from "topojson-client";
import { writeFileRetrying } from "./files.mjs";

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
 * Renames the automatic matching below misses, as [old, new]: one country, one colour. The Khanate of Bukhara grew so
 * much by 1800 that the Emirate's label point falls outside the khanate's old land.
 */
const RENAMED = [["Khanate of Bukhara", "Emirate of Bukhara"]]; // the Manghit khans took the title of emir in 1785

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
  const canon = canonicalNames(topos);
  for (const [from, to] of RENAMED) canon.set(from, canon.get(to) ?? to);
  lineages(topos, canon, rulers);
  return { canon, rulers };
}

/**
 * Countries that carry on under a new name from one era to the next (German Empire → Germany, Russian Empire → Soviet
 * Russia → USSR → Russia) are one country for colour: each one's label point lies inside the other's own land, or the
 * new one is the old one's main successor (its label point inside the old land, and at least a quarter of its size, or
 * a twentieth when the names share a word: Ottoman Empire → Ottoman Sultanate → Turkey). They are joined into `canon` unless any two of them are ever on the map at the same time.
 */
function lineages(topos, canon, rulers) {
  const eras = topos.map((topo) => {
    const ownerOf = ownersOf(topo.objects.p.geometries, canon, rulers);
    const land = new Map(); // owner → its own shapes (not colonies), with boxes
    const label = new Map(); // owner → label point of its biggest own shape
    const size = new Map(); // owner → area of its own land
    for (const f of client.feature(topo, topo.objects.p).features) {
      const o = ownerOf(f.properties);
      // own land: not a colony, or the homeland a ruler is read as (1914 lists the Russian Empire under "Russia")
      if (!o || !f.geometry || (f.properties.s && o !== (canon.get(f.properties.n) ?? f.properties.n))) continue;
      size.set(o, (size.get(o) || 0) + (f.properties.a || 0));
      const box = bboxOf(f.geometry);
      if (!land.has(o)) land.set(o, []);
      land.get(o).push({ f, box });
      const cur = label.get(o);
      if (f.properties.l && (!cur || f.properties.a > cur.a)) label.set(o, { a: f.properties.a, l: f.properties.l });
    }
    return { land, label, size };
  });
  const inside = (pt, shapes) => shapes?.some(({ f, box }) => pt[0] >= box[0] && pt[0] <= box[2] && pt[1] >= box[1] && pt[1] <= box[3] && geoContains(f, pt));
  const holderOf = (pt, era) => {
    for (const [o, shapes] of era.land) if (inside(pt, shapes)) return o;
    return null;
  };
  // eras each name is on the map
  const when = new Map();
  eras.forEach((e, i) => {
    for (const o of e.land.keys()) {
      if (!when.has(o)) when.set(o, new Set());
      when.get(o).add(i);
    }
  });
  const root = new Map();
  const find = (x) => (root.has(x) && root.get(x) !== x ? find(root.get(x)) : x);
  const members = new Map();
  const group = (x) => members.get(find(x)) ?? [x];
  for (let i = 0; i + 1 < eras.length; i++) {
    // biggest first, so an empire's main successor is matched before its smaller pieces
    const order = [...eras[i].label.keys()].sort((a, b) => (eras[i].size.get(b) || 0) - (eras[i].size.get(a) || 0));
    for (const x of order) {
      const l = eras[i].label.get(x).l;
      const back = (o) => {
        const ly = eras[i + 1].label.get(o)?.l;
        return !!ly && inside(ly, eras[i].land.get(x));
      };
      const bigger = (p, q) => (eras[i + 1].size.get(q) || 0) - (eras[i + 1].size.get(p) || 0);
      const share = (o) => (eras[i + 1].size.get(o) || 0) / Math.max(1, eras[i].size.get(x) || 0);
      const words = new Set(plain(x).split(/[^\p{L}]+/u).filter((w) => w.length >= 4 && !["empire", "kingdom", "republic", "state", "states"].includes(w)));
      const kin = (o) => plain(o).split(/[^\p{L}]+/u).some((w) => words.has(w));
      const inOld = [...eras[i + 1].label.keys()].filter(back);
      // a successor sharing the old name first, then a two-way match, then the biggest new country lying inside the old
      // one if it is at least a quarter of its size
      const two = holderOf(l, eras[i + 1]);
      const y =
        inOld.filter((o) => kin(o) && share(o) >= 0.05).sort(bigger)[0] ??
        (two && back(two) ? two : undefined) ??
        inOld.filter((o) => share(o) >= 0.25).sort(bigger)[0];
      if (!y || find(y) === find(x)) continue;
      const gx = group(x);
      const gy = group(y);
      if (gx.some((a) => gy.some((b) => [...(when.get(a) ?? [])].some((k) => when.get(b)?.has(k))))) continue; // on the map together
      // the later name becomes the group's name
      const [rx, ry] = [find(x), find(y)];
      root.set(rx, ry);
      members.set(ry, [...gx, ...gy]);
      members.delete(rx);
    }
  }
  for (const [name, r] of canon) if (find(r) !== r) canon.set(name, find(r));
  for (const x of root.keys()) if (find(x) !== x) canon.set(x, find(x));
}

function bboxOf(geom) {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  let [w, s, e, n] = [180, 90, -180, -90];
  for (const poly of polys) for (const [x, y] of poly[0]) [w, s, e, n] = [Math.min(w, x), Math.min(s, y), Math.max(e, x), Math.max(n, y)];
  return [w, s, e, n];
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

/**
 * After shapes have grown (the coastal gap fill), two owners can border each other with the same colour. Each owner
 * that `region` accepts (by its shapes' properties) and is its own owner (not a colony, whose colour is its ruler's)
 * that shares a colour with a neighbour gets one none of its neighbours use, in every era. Every other colour stays as
 * it is. Returns how many owners changed colour.
 */
export function settleColors(topos, region) {
  const { canon, rulers } = eraContext(topos);
  const adj = new Map();
  const color = new Map();
  const candidates = new Set();
  for (const topo of topos) {
    const geoms = topo.objects.p.geometries;
    const ownerOf = ownersOf(geoms, canon, rulers);
    const nb = client.neighbors(geoms);
    geoms.forEach((g, i) => {
      const o = ownerOf(g.properties);
      if (!o) return;
      if (!color.has(o)) color.set(o, g.properties.k);
      if (!adj.has(o)) adj.set(o, new Set());
      for (const j of nb[i]) {
        const q = ownerOf(geoms[j].properties);
        if (!q || q === o) continue;
        adj.get(o).add(q);
        if (!adj.has(q)) adj.set(q, new Set());
        adj.get(q).add(o);
      }
      if (o === g.properties.n && region(g.properties)) candidates.add(o);
    });
  }
  let changed = 0;
  for (const o of [...candidates].sort()) {
    const used = new Set([...adj.get(o)].map((q) => color.get(q)));
    if (!used.has(color.get(o))) continue;
    const start = hashString(o) % PALETTE_SIZE;
    for (let t = 0; t < PALETTE_SIZE; t++) {
      const c = (start + t) % PALETTE_SIZE;
      if (used.has(c)) continue;
      color.set(o, c);
      changed++;
      break;
    }
  }
  if (!changed) return 0;
  for (const topo of topos) {
    const ownerOf = ownersOf(topo.objects.p.geometries, canon, rulers);
    for (const g of topo.objects.p.geometries) {
      const o = ownerOf(g.properties);
      if (o && candidates.has(o)) g.properties.k = color.get(o);
    }
  }
  return changed;
}

/** settleColors on the era files on disk; rewrites only the files whose colours changed. */
export function settleEraFiles(root, region) {
  const eras = JSON.parse(fs.readFileSync(path.join(root, "src/data/eras.json"), "utf8"));
  const files = eras.map((e) => path.join(root, "public/data/eras", `${e.key}.json`));
  const texts = files.map((f) => fs.readFileSync(f, "utf8"));
  const topos = texts.map((t) => JSON.parse(t));
  const changed = settleColors(topos, region);
  topos.forEach((t, i) => {
    const text = JSON.stringify(t);
    if (text !== texts[i]) writeFileRetrying(files[i], text);
  });
  return changed;
}

/** Re-colours the era files on disk (public/data/eras, in src/data/eras.json order) and bumps the data version. */
export function recolorEraFiles(root) {
  const eras = JSON.parse(fs.readFileSync(path.join(root, "src/data/eras.json"), "utf8"));
  const files = eras.map((e) => path.join(root, "public/data/eras", `${e.key}.json`));
  const topos = files.map((f) => JSON.parse(fs.readFileSync(f, "utf8")));
  const clashes = colorAllEras(topos);
  topos.forEach((t, i) => writeFileRetrying(files[i], JSON.stringify(t)));
  // new colours mean new files: bump the data version so browsers and the CDN fetch them again
  fs.writeFileSync(path.join(root, "src/data/data-version.json"), JSON.stringify({ v: Date.now().toString(36) }));
  return { eras: eras.length, clashes };
}
