// Small shapes on the map. Two things made small territories look like glitches:
// - simplification: every border is simplified with one tolerance, so a territory of a few hundred km² (an exclave, a
//   free city, Liechtenstein) came out as a triangle or a box. keepSmallOutlines simplifies each small ring relative to
//   its own size instead, so it keeps its real outline;
// - leftovers: the steps after the topology (overlaps cut apart, coastal strips filled) leave specks and hairline
//   strips that no source draws: a few km² wedged where three borders meet, a strip a kilometre wide along a border.
//   foldSpecks gives each one whole to the neighbour it shares most border with. Real territories are not folded: only
//   pieces smaller than the specks build-data.mjs already drops (SPECK_KM2), or strips with no coast that are narrower
//   than the file's coordinates can draw (THIN_KM), and never the last piece of a named shape.
// Used by build-data.mjs.

import fs from "node:fs";
import path from "node:path";
import { geoArea, geoLength } from "d3-geo";
import * as client from "topojson-client";
import { writeFileRetrying } from "./files.mjs";

const EARTH_R = 6371.0088;
const DETAIL = 50; // a small ring keeps the points that each hold at least 1/DETAIL of its area (Visvalingam weight)
const SPECK_KM2 = 40; // pieces smaller than this are specks (as build-data.mjs drops them: 1e-6 of the sphere)
const THIN_KM = 1; // area / perimeter: a strip about 2 km wide, the step of the file's coordinates
const INLAND = 0.5; // ...if less than this share of its outline is coast (a thin spit of land is real: the Curonian Spit)

const polysOf = (g) => (g.type === "Polygon" ? [g.arcs] : g.type === "MultiPolygon" ? g.arcs : []);
const arcIndex = (a) => (a < 0 ? ~a : a);

/** Twice the planar area of a ring of [x, y] points, signed. */
function planarArea2(ring) {
  let t = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    t += x1 * y2 - x2 * y1;
  }
  return t;
}

/**
 * On a topology from topojson-simplify's presimplify (absolute coordinates, each point's weight as its third value):
 * points on the outline of a ring too small for `minWeight` are kept down to 1/DETAIL of that ring's area, so after
 * simplify(minWeight) the ring is simplified for its own size. An arc shared by several rings follows the smallest.
 */
export function keepSmallOutlines(topo, minWeight) {
  const { arcs } = topo;
  const keep = new Float64Array(arcs.length).fill(minWeight);
  const floor = minWeight / DETAIL; // no finer than this: the file's coordinates can't draw it
  const points = (ring) => ring.flatMap((a, j) => (a < 0 ? [...arcs[~a]].reverse() : arcs[a]).slice(j ? 1 : 0));
  for (const g of topo.objects.p.geometries)
    for (const p of polysOf(g))
      for (const ring of p) {
        const t = Math.max(floor, Math.abs(planarArea2(points(ring))) / 2 / DETAIL);
        if (t >= minWeight) continue;
        for (const a of ring) keep[arcIndex(a)] = Math.min(keep[arcIndex(a)], t);
      }
  arcs.forEach((arc, k) => {
    if (keep[k] < minWeight) for (const pt of arc) if (pt[2] >= keep[k] && pt[2] < minWeight) pt[2] = minWeight;
  });
  return topo;
}

/** The arcs of a topology as lon/lat lines. */
function decodeArcs(topo) {
  const {
    scale: [sx, sy],
    translate: [tx, ty],
  } = topo.transform;
  return topo.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]) => [(x += dx) * sx + tx, (y += dy) * sy + ty]);
  });
}

/** Whether (x, y) lies inside a polygon (outer ring plus holes, even-odd, in lon/lat). */
function inRings(x, y, rings) {
  let inside = false;
  for (const r of rings)
    for (let i = 0, j = r.length - 1; i < r.length; j = i++)
      if (r[i][1] > y !== r[j][1] > y && x < ((r[j][0] - r[i][0]) * (y - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) inside = !inside;
  return inside;
}

/** A polygon's area in km², whichever way its rings run. */
function polygonKm2(rings) {
  const a = geoArea({ type: "Polygon", coordinates: rings });
  return (a > 2 * Math.PI ? 4 * Math.PI - a : a) * EARTH_R ** 2;
}

/** One pass over an era topology: folds the specks it can, smallest first. Returns how many it folded. */
function foldPass(topo) {
  const geoms = topo.objects.p.geometries;
  const lines = decodeArcs(topo);
  const km = lines.map((l) => geoLength({ type: "LineString", coordinates: l }) * EARTH_R);
  const ringCoords = (ring) => ring.flatMap((a, j) => (a < 0 ? [...lines[~a]].reverse() : lines[a]).slice(j ? 1 : 0));
  // every arc of a ring starts where the one before it ends (else the map would draw a straight line across the gap)
  const same = (p, q) => p[0] === q[0] && p[1] === q[1];
  const head = (a) => (a < 0 ? lines[~a].at(-1) : lines[a][0]);
  const tail = (a) => (a < 0 ? lines[~a][0] : lines[a].at(-1));
  const closed = (ring) => ring.every((a, i) => same(tail(a), head(ring[(i + 1) % ring.length])));
  const users = new Map(); // arc -> the shapes using it
  geoms.forEach((g, gi) =>
    polysOf(g).forEach((p) =>
      p.forEach((ring) =>
        ring.forEach((a) => {
          const k = arcIndex(a);
          if (!users.has(k)) users.set(k, new Set());
          users.get(k).add(gi);
        }),
      ),
    ),
  );
  // every speck: [shape, piece, the neighbour it shares most border with, its area]
  const specks = [];
  geoms.forEach((g, gi) => {
    const polys = polysOf(g);
    polys.forEach((p, pi) => {
      if (polys.length === 1 && g.properties?.n) return; // a named shape keeps its last piece
      const rings = p.map(ringCoords);
      const label = g.properties?.l;
      if (label && inRings(label[0], label[1], rings)) return; // ...and the piece its name sits on
      const area = polygonKm2(rings);
      let perimeter = 0;
      let coast = 0;
      const shared = new Map();
      for (const ring of p)
        for (const a of ring) {
          const k = arcIndex(a);
          if (ring === p[0]) perimeter += km[k];
          const others = [...users.get(k)].filter((o) => o !== gi);
          if (!others.length && ring === p[0]) coast += km[k];
          for (const o of others) shared.set(o, (shared.get(o) ?? 0) + km[k]);
        }
      if (!shared.size) return; // an island
      const thin = area / Math.max(perimeter, 1e-9) < THIN_KM && coast < perimeter * INLAND;
      if (area >= SPECK_KM2 && !thin) return;
      const to = [...shared.entries()].sort((x, y) => y[1] - x[1])[0][0];
      specks.push([gi, pi, to, area]);
    });
  });
  // pieces are counted by their place in a shape: a shape that took land this pass is renumbered, so it gives none
  // away until the next; one that gave land loses those pieces only at the end of the pass, so it takes none
  const gave = new Map(); // shape -> the pieces it gave away
  const took = new Set();
  let folded = 0;
  for (const [gi, pi, to, area] of specks.sort((x, y) => x[3] - y[3])) {
    if (took.has(gi) || gave.has(to)) continue;
    const polys = polysOf(geoms[gi]);
    if (geoms[gi].properties?.n && (gave.get(gi)?.size ?? 0) + 1 >= polys.length) continue; // a named shape keeps a piece
    const piece = polys[pi];
    const pieceArcs = new Set(piece.flat().map(arcIndex));
    const target = polysOf(geoms[to]);
    // the receiving shape's piece it touches (a speck too, maybe: then that one may move on next pass)
    const touching = target.map((p, i) => i).filter((i) => target[i].flat().some((a) => pieceArcs.has(arcIndex(a))));
    const joined = touching.length === 1 ? joinPiece(piece, target[touching[0]]) : null;
    if (!joined || !joined.every(closed)) continue;
    // the joined piece covers exactly the land of the two (to the precision of a spherical area)
    const before = area + polygonKm2(target[touching[0]].map(ringCoords));
    if (Math.abs(polygonKm2(joined.map(ringCoords)) - before) > 0.5 + before * 1e-7) continue;
    setPolys(geoms[to], [...target.filter((_, i) => i !== touching[0]), joined]);
    took.add(to);
    gave.set(gi, (gave.get(gi) ?? new Set()).add(pi));
    folded++;
  }
  for (const [gi, pieces] of gave)
    setPolys(
      geoms[gi],
      polysOf(geoms[gi]).filter((_, i) => !pieces.has(i)),
    );
  return folded;
}

/** Where the elements `pred` picks sit in a ring of them: one unbroken run (start, length), else null. */
function runOf(ring, pred) {
  const n = ring.length;
  const count = ring.filter(pred).length;
  if (!count || count === n) return null;
  const start = ring.findIndex((a, i) => pred(a) && !pred(ring[(i - 1 + n) % n]));
  for (let k = 0; k < count; k++) if (!pred(ring[(start + k) % n])) return null;
  return { start, len: count };
}

/**
 * Joins a piece without holes to the polygon it borders, keeping that polygon's rings as they are: a piece that fills
 * one of its holes closes the hole; a piece that runs along one stretch of its ring takes that stretch's place with the
 * rest of the piece's outline. Null when they meet in some other way (along two stretches, or a whole ring).
 */
function joinPiece(piece, target) {
  if (piece.length !== 1) return null;
  const outer = piece[0];
  const mine = new Set(outer.map(arcIndex));
  const hole = target.findIndex((ring, r) => r > 0 && ring.length === outer.length && ring.every((a) => mine.has(arcIndex(a))));
  if (hole > 0) return target.filter((_, r) => r !== hole);
  const rings = target.map((ring, r) => r).filter((r) => target[r].some((a) => mine.has(arcIndex(a))));
  if (rings.length !== 1) return null;
  const ring = target[rings[0]];
  const theirs = new Set(ring.filter((a) => mine.has(arcIndex(a))).map(arcIndex));
  const run = runOf(ring, (a) => theirs.has(arcIndex(a)));
  const back = runOf(outer, (a) => theirs.has(arcIndex(a)));
  if (!run || !back || run.len !== back.len) return null;
  // the two rings run along the stretch in opposite directions, arc for arc
  for (let k = 0; k < run.len; k++) if (outer[(back.start + k) % outer.length] !== ~ring[(run.start + run.len - 1 - k) % ring.length]) return null;
  const after = (r, { start, len }) => Array.from({ length: r.length - len }, (_, k) => r[(start + len + k) % r.length]);
  // the polygon's ring from the far end of the stretch round to its near end, then the piece's outline back
  return target.map((r, i) => (i === rings[0] ? [[...after(ring, run), ...after(outer, back)]] : [r])).flat();
}

function setPolys(g, polys) {
  if (!polys.length) {
    g.type = null;
    delete g.arcs;
  } else if (polys.length === 1) {
    g.type = "Polygon";
    g.arcs = polys[0];
  } else {
    g.type = "MultiPolygon";
    g.arcs = polys;
  }
}

/** Drops the arcs no shape uses any more and renumbers the rest. */
function pruneArcs(topo) {
  const used = new Set();
  for (const g of topo.objects.p.geometries) for (const p of polysOf(g)) for (const r of p) for (const a of r) used.add(arcIndex(a));
  const map = new Int32Array(topo.arcs.length).fill(-1);
  const arcs = [];
  topo.arcs.forEach((arc, k) => {
    if (used.has(k)) {
      map[k] = arcs.length;
      arcs.push(arc);
    }
  });
  const re = (a) => (a < 0 ? ~map[~a] : map[a]);
  for (const g of topo.objects.p.geometries) {
    if (g.type === "Polygon") g.arcs = g.arcs.map((r) => r.map(re));
    else if (g.type === "MultiPolygon") g.arcs = g.arcs.map((p) => p.map((r) => r.map(re)));
  }
  topo.arcs = arcs;
}

/**
 * Folds the specks and hairline strips of one era topology into their neighbours (in place). Shapes that changed get
 * their area (a, km²) again; shapes left with no land are dropped. Returns how many pieces were folded.
 */
export function foldSpecks(topo) {
  const geoms = topo.objects.p.geometries;
  const before = geoms.map((g) => JSON.stringify(g.arcs ?? null));
  let folded = 0;
  for (let pass = 0; pass < 20; pass++) {
    const n = foldPass(topo);
    if (!n) break;
    folded += n;
  }
  if (!folded) return 0;
  topo.objects.p.geometries = geoms.filter((g) => g.type);
  geoms.forEach((g, i) => {
    if (!g.type || JSON.stringify(g.arcs) === before[i]) return;
    // piece by piece, so a piece wound the wrong way (drawn the same on the canvas) can't count as the rest of the globe
    const { geometry } = client.feature(topo, g);
    const polys = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
    g.properties.a = Math.round(polys.reduce((t, rings) => t + polygonKm2(rings), 0));
  });
  pruneArcs(topo);
  return folded;
}

/** foldSpecks on every era file on disk (public/data/eras, as listed in src/data/eras.json). */
export function foldSpeckEraFiles(root) {
  const eras = JSON.parse(fs.readFileSync(path.join(root, "src/data/eras.json"), "utf8"));
  const report = [];
  for (const e of eras) {
    const file = path.join(root, "public/data/eras", `${e.key}.json`);
    const topo = JSON.parse(fs.readFileSync(file, "utf8"));
    const folded = foldSpecks(topo);
    if (folded) writeFileRetrying(file, JSON.stringify(topo));
    report.push({ era: e.key, folded });
  }
  return report;
}
