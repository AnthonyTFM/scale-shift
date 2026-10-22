// Fills land the source leaves blank along a coast with the shapes beside it. The source's outlines often stop short of
// the real coastline, so strips between a shape and the sea came out "not mapped" (white on the map). A strip that
// touches one shape goes to it; a strip that touches several is shared out, each part going to the shape nearest it,
// so every shape reaches its own stretch of shore. Land that no shape touches (an island off the coast) stays as it is.
// Runs on the era files after the overlaps are separated; `inside` picks the region it works in. Used by build-data.mjs.

import fs from "node:fs";
import path from "node:path";
import { geoArea, geoCentroid } from "d3-geo";
import polygonClipping from "polygon-clipping";
import * as client from "topojson-client";
import * as server from "topojson-server";

const EARTH_R = 6371.0088;
const OUTPUT_QUANTIZE = 2e4; // as build-data.mjs writes the era files
const TOUCH = 0.03; // degrees: a shape this close to a strip borders it (about one step of the file's coordinates)
const CELL = 0.01; // degrees: the grid a strip is shared out on
const SLIVER_KM2 = 50; // holes this small that nothing covers are slivers between a shape and its strip: filled

const polysOf = (g) => (!g ? [] : g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);
const boxOf = (polys) => {
  let [w, s, e, n] = [180, 90, -180, -90];
  for (const p of polys) for (const [x, y] of p[0]) [w, s, e, n] = [Math.min(w, x), Math.min(s, y), Math.max(e, x), Math.max(n, y)];
  return [w, s, e, n];
};
const meets = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
const ringKm2 = (ring) => {
  const a = geoArea({ type: "Polygon", coordinates: [ring] });
  return (a > 2 * Math.PI ? 4 * Math.PI - a : a) * EARTH_R ** 2;
};

/** polygon-clipping returns counter-clockwise outer rings; d3 wants them clockwise (else a shape covers the globe). */
function d3Winding(polys) {
  return polys.map((rings) => (geoArea({ type: "Polygon", coordinates: rings }) > 2 * Math.PI ? rings.map((r) => [...r].reverse()) : rings));
}

/** Squared distance from (x, y) to the segment (x1, y1)–(x2, y2), in degrees². */
function dist2(x, y, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = dx || dy ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy))) : 0;
  const px = x1 + t * dx - x;
  const py = y1 + t * dy - y;
  return px * px + py * py;
}

/** Whether (x, y) lies inside a polygon (outer ring plus holes, even-odd). */
function inPolygon(x, y, rings) {
  let inside = false;
  for (const r of rings)
    for (let i = 0, j = r.length - 1; i < r.length; j = i++)
      if (r[i][1] > y !== r[j][1] > y && x < ((r[j][0] - r[i][0]) * (y - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) inside = !inside;
  return inside;
}

/** Whether a strip lies in the region: a quarter of the points round its outline do (its middle can be out at sea). */
function inRegion(polys, inside) {
  const ring = polys[0][0];
  const step = Math.max(1, Math.floor(ring.length / 24));
  let yes = 0;
  let all = 0;
  for (let k = 0; k < ring.length; k += step, all++) if (inside(ring[k])) yes++;
  return yes * 4 >= all;
}

/** The boundary segments of `shapes` within `margin` of `box`, as flat [x1, y1, x2, y2, shape index] records. */
function segmentsNear(shapes, box, margin) {
  const b = [box[0] - margin, box[1] - margin, box[2] + margin, box[3] + margin];
  const out = [];
  for (const sh of shapes) {
    if (!meets(sh.box, b)) continue;
    for (const p of sh.polys)
      for (const r of p)
        for (let k = 1; k < r.length; k++) {
          const [x1, y1] = r[k - 1];
          const [x2, y2] = r[k];
          if (Math.max(x1, x2) < b[0] || Math.min(x1, x2) > b[2] || Math.max(y1, y2) < b[1] || Math.min(y1, y2) > b[3]) continue;
          out.push(x1, y1, x2, y2, sh.i);
        }
  }
  return out;
}

/** The shapes a strip borders: the ones within TOUCH of at least two of its corners. */
function bordering(rings, segs) {
  const hits = new Map();
  for (const r of rings)
    for (const [x, y] of r) {
      const near = new Set();
      for (let k = 0; k < segs.length; k += 5) if (dist2(x, y, segs[k], segs[k + 1], segs[k + 2], segs[k + 3]) <= TOUCH * TOUCH) near.add(segs[k + 4]);
      for (const i of near) hits.set(i, (hits.get(i) ?? 0) + 1);
    }
  return [...hits.entries()].filter(([, n]) => n >= 2).map(([i]) => i);
}

/**
 * Shares a strip between the shapes beside it: every cell of a fine grid goes to the nearest of them, each shape's cells
 * are joined and then cut to the strip's own outline. Returns [shape index, polygons] pieces.
 */
function shareOut(rings, owners, segs) {
  const own = [];
  for (let k = 0; k < segs.length; k += 5) if (owners.includes(segs[k + 4])) own.push(segs[k], segs[k + 1], segs[k + 2], segs[k + 3], segs[k + 4]);
  const box = boxOf([rings]);
  const x0 = box[0] - CELL;
  const y0 = box[1] - CELL;
  const cols = Math.ceil((box[2] - box[0]) / CELL) + 2;
  const rows = Math.ceil((box[3] - box[1]) / CELL) + 2;
  // the cells whose middle lies in the strip, plus one cell round them, so the joined cells cover the strip's edges
  const inside = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) if (inPolygon(x0 + (c + 0.5) * CELL, y0 + (r + 0.5) * CELL, rings)) inside[r * cols + c] = 1;
  const label = new Int32Array(cols * rows).fill(-1);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      let near = false;
      for (let dr = -1; dr <= 1 && !near; dr++)
        for (let dc = -1; dc <= 1 && !near; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          near = rr >= 0 && cc >= 0 && rr < rows && cc < cols && inside[rr * cols + cc] === 1;
        }
      if (!near) continue;
      const x = x0 + (c + 0.5) * CELL;
      const y = y0 + (r + 0.5) * CELL;
      let best = -1;
      let bd = Infinity;
      for (let k = 0; k < own.length; k += 5) {
        const d = dist2(x, y, own[k], own[k + 1], own[k + 2], own[k + 3]);
        if (d < bd) [bd, best] = [d, own[k + 4]];
      }
      label[r * cols + c] = best;
    }
  const pieces = [];
  for (const i of owners) {
    const rects = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; ) {
        if (label[r * cols + c] !== i) {
          c++;
          continue;
        }
        let e = c;
        while (e < cols && label[r * cols + e] === i) e++;
        const [xa, xb, ya, yb] = [x0 + c * CELL, x0 + e * CELL, y0 + r * CELL, y0 + (r + 1) * CELL];
        rects.push([[[xa, ya], [xb, ya], [xb, yb], [xa, yb], [xa, ya]]]);
        c = e;
      }
    if (!rects.length) continue;
    const piece = polygonClipping.intersection(rings, polygonClipping.union(...rects));
    if (piece.length) pieces.push([i, piece]);
  }
  return pieces;
}

/** Fills the coastal strips in one era topology. Returns the new topology and how many strips were filled. */
export function fillGaps(topo, inside) {
  const feats = client.feature(topo, topo.objects.p).features;
  const shapes = [];
  const strips = [];
  feats.forEach((f, i) => {
    const polys = polysOf(f.geometry);
    if (!polys.length) return;
    const it = { i, polys, box: boxOf(polys) };
    if (f.properties.n && !f.properties.x) shapes.push(it);
    else if (f.properties.m && inRegion(polys, inside)) strips.push(it);
  });
  const now = new Map(); // shape index -> its polygons so far
  const removed = new Set();
  let filled = 0;
  for (const st of strips) {
    const segs = segmentsNear(shapes, st.box, 0.5);
    const changes = new Map();
    let ok = true;
    for (const rings of st.polys) {
      const owners = bordering(rings, segs);
      if (!owners.length) {
        ok = false; // land no shape touches (an island): it stays as it is
        break;
      }
      try {
        const pieces = owners.length === 1 ? [[owners[0], [rings]]] : shareOut(rings, owners, segs);
        for (const [i, piece] of pieces) {
          const before = changes.get(i) ?? now.get(i) ?? polysOf(feats[i].geometry);
          changes.set(i, polygonClipping.union(before, piece));
        }
      } catch {
        ok = false; // the clipping failed here: this strip stays as it is
        break;
      }
    }
    if (!ok) continue;
    for (const [i, polys] of changes) now.set(i, polys);
    removed.add(st.i);
    filled++;
  }
  if (!filled) return { topo, filled: 0 };

  // holes left between a shape and its new land that nothing covers are slivers: fill them
  const covered = (x, y, self) =>
    shapes.some((sh) => sh.i !== self && x >= sh.box[0] && x <= sh.box[2] && y >= sh.box[1] && y <= sh.box[3] && sh.polys.some((p) => inPolygon(x, y, p)));
  const out = feats
    .map((f, i) => {
      if (removed.has(i)) return null;
      if (!now.has(i)) return { f, original: f };
      const polys = d3Winding(now.get(i)).map((rings) =>
        rings.filter((r, k) => {
          if (k === 0 || ringKm2(r) >= SLIVER_KM2) return true;
          const c = geoCentroid({ type: "Polygon", coordinates: [[...r].reverse()] });
          return covered(c[0], c[1], i);
        }),
      );
      const geometry = polys.length === 1 ? { type: "Polygon", coordinates: polys[0] } : { type: "MultiPolygon", coordinates: polys };
      const g = { type: "Feature", properties: { ...f.properties }, geometry };
      g.properties.a = Math.round(geoArea(g) * EARTH_R ** 2);
      return { f: g, original: f };
    })
    .filter(Boolean);
  const result = client.quantize(server.topology({ p: { type: "FeatureCollection", features: out.map((o) => o.f) } }), OUTPUT_QUANTIZE);
  // rounding the file's coordinates can turn a shape inside out: then this era keeps its blank strips
  const inverted = client.feature(result, result.objects.p).features.some((f, i) => f.geometry && out[i].f !== out[i].original && geoArea(f) > 2 * Math.PI);
  return inverted ? { topo, filled: 0, inverted: true } : { topo: result, filled };
}

/** Fills the coastal strips inside a region in every era file on disk (public/data/eras, in src/data/eras.json order). */
export function fillGapEraFiles(root, inside) {
  const eras = JSON.parse(fs.readFileSync(path.join(root, "src/data/eras.json"), "utf8"));
  const report = [];
  for (const e of eras) {
    const file = path.join(root, "public/data/eras", `${e.key}.json`);
    const { topo, filled, inverted } = fillGaps(JSON.parse(fs.readFileSync(file, "utf8")), inside);
    if (filled) fs.writeFileSync(file, JSON.stringify(topo));
    report.push({ era: e.key, filled, inverted });
  }
  return report;
}
