// OpenHistoricalMap (CC0, https://www.openhistoricalmap.org): dated national borders, used for Europe from 1920 on.
// Each border is one boundary relation with a start and end date. Fetches the relations it is given by id from OHM's
// Overpass API once and caches them in `.cache/ohm/`. Each way is simplified on its own, so two neighbours that share a
// way still meet exactly, then the ways are joined into rings. Used by build-data.mjs.

import fs from "node:fs";
import path from "node:path";

const OVERPASS = "https://overpass-api.openhistoricalmap.org/api/interpreter";
const SIMPLIFY_DEG = 0.002; // about 200 m: far finer than the maps are drawn

async function fetchRelation(id) {
  for (let tries = 1; ; tries++) {
    try {
      const res = await fetch(OVERPASS, { method: "POST", body: new URLSearchParams({ data: `[out:json][timeout:300];relation(${id});out geom;` }) });
      if (res.ok) return await res.text();
      if (tries >= 4) throw new Error(`OpenHistoricalMap relation ${id}: ${res.status}`);
    } catch (err) {
      if (tries >= 4) throw err;
    }
    await new Promise((r) => setTimeout(r, 5000 * tries));
  }
}

/** Douglas–Peucker: the points of a line that keep it within `tol` degrees of where it was; the ends always stay. */
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [x1, y1] = pts[a];
    const [x2, y2] = pts[b];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    let far = -1;
    let farD = tol * tol;
    for (let k = a + 1; k < b; k++) {
      const t = len2 ? Math.max(0, Math.min(1, ((pts[k][0] - x1) * dx + (pts[k][1] - y1) * dy) / len2)) : 0;
      const d = (x1 + t * dx - pts[k][0]) ** 2 + (y1 + t * dy - pts[k][1]) ** 2;
      if (d > farD) [far, farD] = [k, d];
    }
    if (far < 0) continue;
    keep[far] = 1;
    stack.push([a, far], [far, b]);
  }
  return pts.filter((_, k) => keep[k]);
}

const key = ([x, y]) => `${x},${y}`;

const lengthOf = (line) => line.reduce((t, p, k) => (k ? t + Math.hypot(p[0] - line[k - 1][0], p[1] - line[k - 1][1]) : 0), 0);

/**
 * Joins ways end to end into closed rings. Returns the rings and the share of the ways' length that did not close (a
 * gap in the border, or stray ways).
 */
function joinRings(ways) {
  const open = ways.map((w) => w.slice());
  const total = ways.reduce((t, w) => t + lengthOf(w), 0);
  const rings = [];
  let loose = 0;
  while (open.length) {
    let ring = open.pop();
    for (let grew = true; key(ring[0]) !== key(ring.at(-1)) && grew; ) {
      grew = false;
      for (let i = 0; i < open.length; i++) {
        const w = open[i];
        const [start, end] = [key(ring[0]), key(ring.at(-1))];
        if (key(w[0]) === end) ring = ring.concat(w.slice(1));
        else if (key(w.at(-1)) === end) ring = ring.concat(w.slice(0, -1).reverse());
        else if (key(w.at(-1)) === start) ring = w.concat(ring.slice(1));
        else if (key(w[0]) === start) ring = w.slice().reverse().concat(ring.slice(1));
        else continue;
        open.splice(i, 1);
        grew = true;
        break;
      }
    }
    if (key(ring[0]) === key(ring.at(-1)) && ring.length >= 4) rings.push(ring);
    else loose += lengthOf(ring);
  }
  return { rings, loose: total ? loose / total : 0 };
}

function inRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
    if (ring[i][1] > y !== ring[j][1] > y && x < ((ring[j][0] - ring[i][0]) * (y - ring[i][1])) / (ring[j][1] - ring[i][1]) + ring[i][0]) inside = !inside;
  return inside;
}

const MAX_LOOSE = 0.02; // a relation with more of its ways than this left open has a gap in its border

/**
 * The borders of the given relations, as { id, name, from, to, polys } (polys: MultiPolygon coordinates, lon/lat).
 * A relation whose ways don't join up (OHM leaves a border open where it was not yet fixed) is skipped with a warning;
 * a few stray ways that close nothing are dropped.
 */
export async function ohmRelations(cacheDir, ids) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const out = [];
  for (const id of ids) {
    const file = path.join(cacheDir, `${id}.json`);
    if (!fs.existsSync(file)) fs.writeFileSync(file, await fetchRelation(id));
    const rel = JSON.parse(fs.readFileSync(file, "utf8")).elements.find((e) => e.type === "relation" && e.id === id);
    if (!rel) throw new Error(`OpenHistoricalMap relation ${id} not found`);
    const ways = { outer: [], inner: [] };
    for (const m of rel.members ?? [])
      if (m.type === "way" && m.geometry?.length > 1) (m.role === "inner" ? ways.inner : ways.outer).push(simplify(m.geometry.map((p) => [p.lon, p.lat]), SIMPLIFY_DEG));
    const outer = joinRings(ways.outer);
    const inner = joinRings(ways.inner);
    const name = rel.tags["name:en"] || rel.tags.name;
    if (outer.loose > MAX_LOOSE || !outer.rings.length) {
      console.warn(`  ! OpenHistoricalMap: ${name} (${id}) has a gap in its border: left out`);
      continue;
    }
    const polys = outer.rings.map((r) => [r]);
    for (const h of inner.rings) polys.find((p) => inRing(h[0], p[0]))?.push(h);
    out.push({ id, name, from: rel.tags.start_date, to: rel.tags.end_date, polys });
  }
  return out;
}
