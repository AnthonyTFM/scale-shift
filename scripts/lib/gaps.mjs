// Fills land the source leaves blank along a coast with the shapes beside it. The source's outlines often stop short of
// the real coastline, so strips between a shape and the sea came out "not mapped" (white on the map). A strip that
// touches one shape goes to it; a strip that touches several is shared out, each part going to the shape nearest it,
// so every shape reaches its own stretch of shore. Land that no shape touches (an island off the coast) stays as it is.
// Strips go to unnamed shapes too, so a named shape never runs on along a coast in front of an unnamed one.
// Everywhere, thin strips are filled; inside the region `inside` picks, wider ones too (wider blank land elsewhere can
// be a real gap in the source).
// The same goes for the thin coastal slivers of a "leftover" shape: an older shape the source still draws underneath
// newer ones, which shows through only where they stop short of the coast. Its other pieces stay as they are.
// Thin unnamed pieces wedged between two or more named neighbours, with no coast, go whole to the one they share most
// border with.
// Runs on the era files after the overlaps are separated. Used by build-data.mjs.

import fs from "node:fs";
import path from "node:path";
import { geoArea, geoCentroid, geoLength } from "d3-geo";
import polygonClipping from "polygon-clipping";
import * as client from "topojson-client";
import * as server from "topojson-server";

const EARTH_R = 6371.0088;
const OUTPUT_QUANTIZE = 2e4; // as build-data.mjs writes the era files
const TOUCH = 0.03; // degrees: a shape this close to a strip borders it (about one step of the file's coordinates)
const CELL = 0.01; // degrees: the grid a strip is shared out on
const SLIVER_KM2 = 50; // holes this small that nothing covers are slivers between a shape and its strip: filled
const SEA_SHARE = 0.03; // a leftover piece with this share of its outline on the sea lies along the coast
const NOTCH_DEG = 3; // a ring that turns back sharper than this has a notch (a stray line on the map): closed
const GAP_KM = 15; // an unnamed piece between named neighbours no wider than this (area / perimeter) is a gap: filled
const ENCLOSED_SHARE = 0.9; // ...if this share of its outline borders them (it has no coast)
const LOST_KM2 = 10; // a shape that loses more than this when given a strip: the clipping failed, the strip stays
const HAIRLINE_KM = 1; // ...but not a hairline this thin: invisible, and sharing it out would break up its neighbours
const THIN_KM = 10; // a blank strip or leftover piece no wider than this (area / perimeter) is a sliver along the coast

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

/** The area of polygons in km², whichever way their rings run. */
const km2Of = (polys) => polys.reduce((t, [outer, ...holes]) => t + ringKm2(outer) - holes.reduce((h, r) => h + ringKm2(r), 0), 0);

/** polygon-clipping returns counter-clockwise outer rings; d3 wants them clockwise (else a shape covers the globe). */
function d3Winding(polys) {
  return polys.map((rings) => (geoArea({ type: "Polygon", coordinates: rings }) > 2 * Math.PI ? rings.map((r) => [...r].reverse()) : rings));
}

/**
 * Closes the needle-thin notches a strip can leave between a shape's old coast and its new land: where a ring runs in
 * and almost straight back out (a turn sharper than NOTCH_DEG), the tip goes, until none is left. Drawn, such a notch
 * is a stray line through the shape. Only notches into the shape are closed: a thin spit of land sticking out stays.
 */
function closeNotches(ring, k0) {
  const r = ring.slice(0, -1);
  let twice = 0; // twice the ring's signed area: its sign says which way it runs
  for (let k = 0; k < r.length; k++) twice += r[k][0] * r[(k + 1) % r.length][1] - r[(k + 1) % r.length][0] * r[k][1];
  const hole = k0 > 0;
  for (let k = 0; r.length > 3 && k < r.length; ) {
    const [a, b, c] = [r[(k - 1 + r.length) % r.length], r[k], r[(k + 1) % r.length]];
    const [ux, uy, vx, vy] = [a[0] - b[0], a[1] - b[1], c[0] - b[0], c[1] - b[1]];
    const lu = Math.hypot(ux, uy);
    const lv = Math.hypot(vx, vy);
    // the corner's turn runs the ring's way round for a spit sticking out of an outer ring (or into a hole)
    const outward = Math.sign(vx * uy - vy * ux) === Math.sign(twice);
    if (lu && lv && outward === hole && (ux * vx + uy * vy) / (lu * lv) > Math.cos((NOTCH_DEG * Math.PI) / 180)) {
      r.splice(k, 1);
      k = Math.max(0, k - 1); // the corner before may be a tip now
    } else k++;
  }
  return [...r, r[0]];
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

/** Whether a piece is a thin strip: none of its parts is wider than `km` (area / perimeter). */
function thinStrip(polys, km = THIN_KM) {
  return polys.every(
    ([outer, ...holes]) =>
      (ringKm2(outer) - holes.reduce((t, h) => t + ringKm2(h), 0)) / (geoLength({ type: "LineString", coordinates: outer }) * EARTH_R) <= km,
  );
}

/** Whether a ring is enclosed by shapes: nearly all its corners lie on one of their outlines (it has no coast). */
function enclosed(ring, segs) {
  let on = 0;
  for (const [x, y] of ring) {
    for (let k = 0; k < segs.length; k += 5)
      if (dist2(x, y, segs[k], segs[k + 1], segs[k + 2], segs[k + 3]) <= TOUCH * TOUCH) {
        on++;
        break;
      }
  }
  return on >= ring.length * ENCLOSED_SHARE;
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

/** Whether a piece is a thin sliver along the coast: part of its outline borders no other shape, and it is narrow. */
function coastalSliver(rings, segs) {
  const ring = rings[0];
  let free = 0;
  for (const [x, y] of ring) {
    let near = false;
    for (let k = 0; k < segs.length && !near; k += 5) near = dist2(x, y, segs[k], segs[k + 1], segs[k + 2], segs[k + 3]) <= TOUCH * TOUCH;
    if (!near) free++;
  }
  const km2 = geoArea({ type: "Polygon", coordinates: rings }) * EARTH_R ** 2;
  return free >= ring.length * SEA_SHARE && km2 / (geoLength({ type: "LineString", coordinates: ring }) * EARTH_R) <= THIN_KM;
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
  // most border first
  return [...hits.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([i]) => i);
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

/**
 * Fills the coastal strips in one era topology; `leftover` picks the shapes whose coastal slivers are given away too.
 * Returns the new topology and how many strips were filled.
 */
export function fillGaps(topo, inside, leftover = () => false) {
  const feats = client.feature(topo, topo.objects.p).features;
  const drawn = []; // every shape but the blank land
  const shapes = []; // the shapes strips can go to
  const strips = []; // blank strips, and leftover slivers (with the index of their piece)
  feats.forEach((f, i) => {
    const polys = polysOf(f.geometry);
    if (!polys.length) return;
    const it = { i, polys, box: boxOf(polys) };
    if (f.properties.m) {
      if (thinStrip(polys) || inRegion(polys, inside)) strips.push(it);
    } else if (!f.properties.x) {
      drawn.push(it);
      if (!leftover(f.properties)) shapes.push(it);
    }
  });
  for (const lo of drawn) {
    if (!leftover(feats[lo.i].properties)) continue;
    const segs = segmentsNear(
      drawn.filter((o) => o.i !== lo.i),
      lo.box,
      0.1,
    );
    // (no region test: slivers lie on the coast itself, often just past the coastline it is judged by)
    lo.polys.forEach((rings, part) => {
      if (coastalSliver(rings, segs)) strips.push({ i: lo.i, part, polys: [rings], box: boxOf([rings]) });
    });
  }
  // thin unnamed pieces wedged between named neighbours, with no coast of their own, go to one of those neighbours
  const named = shapes.filter((sh) => feats[sh.i].properties.n);
  for (const un of drawn) {
    if (feats[un.i].properties.n || leftover(feats[un.i].properties)) continue;
    un.polys.forEach((rings, part) => {
      if (!thinStrip([rings], GAP_KM) || thinStrip([rings], HAIRLINE_KM)) return;
      const box = boxOf([rings]);
      const segs = segmentsNear(named, box, 0.1);
      if (enclosed(rings[0], segs) && bordering(rings, segs).length >= 2) strips.push({ i: un.i, part, polys: [rings], box, named: true });
    });
  }
  const now = new Map(); // shape index -> its polygons so far
  const removed = new Set();
  const given = new Map(); // leftover index -> the pieces given away
  let filled = 0;
  for (const st of strips) {
    const segs = segmentsNear(st.named ? named : shapes, st.box, 0.5);
    const changes = new Map();
    let ok = true;
    for (const rings of st.polys) {
      const owners = bordering(rings, segs);
      if (!owners.length) {
        ok = false; // land no shape touches (an island): it stays as it is
        break;
      }
      try {
        // a gap between neighbours goes whole to the one it shares most border with; a strip is shared out
        const pieces = owners.length === 1 || st.named ? [[owners[0], [rings]]] : shareOut(rings, owners, segs);
        for (const [i, piece] of pieces) {
          const before = changes.get(i) ?? now.get(i) ?? polysOf(feats[i].geometry);
          const after = polygonClipping.union(before, piece);
          // outlines that almost coincide can make the clipping lose some of the shape or break it into many pieces:
          // then it's a failure
          if (after.length > before.length + 10 || km2Of(polygonClipping.difference(before, after)) > LOST_KM2) throw new Error("bad union");
          if (st.named && after.length > before.length) throw new Error("gap left apart"); // it would show as a line through the shape
          changes.set(i, after);
        }
      } catch {
        ok = false; // the clipping failed here: this strip stays as it is
        break;
      }
    }
    if (!ok) continue;
    for (const [i, polys] of changes) now.set(i, polys);
    if (st.part === undefined) removed.add(st.i);
    else given.set(st.i, (given.get(st.i) ?? new Set()).add(st.part));
    filled++;
  }
  if (!filled) return { topo, filled: 0 };

  // holes left between a shape and its new land that nothing covers are slivers: fill them
  const covered = (x, y, self) =>
    drawn.some((sh) => sh.i !== self && x >= sh.box[0] && x <= sh.box[2] && y >= sh.box[1] && y <= sh.box[3] && sh.polys.some((p) => inPolygon(x, y, p)));
  const out = feats
    .map((f, i) => {
      if (removed.has(i)) return null;
      if (given.has(i)) {
        // a leftover or unnamed shape keeps the pieces it didn't give away (with any strips it took itself)
        const parts = polysOf(f.geometry);
        let keep = parts.filter((_, part) => !given.get(i).has(part));
        if (now.has(i)) {
          try {
            keep = d3Winding(polygonClipping.difference(now.get(i), ...[...given.get(i)].map((part) => parts[part])));
          } catch {
            // the clipping failed: it keeps its other pieces without the strips it took
          }
        }
        if (!keep.length) return null;
        const g = { type: "Feature", properties: { ...f.properties }, geometry: { type: "MultiPolygon", coordinates: keep } };
        g.properties.a = Math.round(geoArea(g) * EARTH_R ** 2);
        return { f: g, original: f };
      }
      if (!now.has(i)) return { f, original: f };
      const polys = d3Winding(now.get(i)).map((rings) =>
        rings
          .filter((r, k) => {
            if (k === 0 || ringKm2(r) >= SLIVER_KM2) return true;
            const c = geoCentroid({ type: "Polygon", coordinates: [[...r].reverse()] });
            return covered(c[0], c[1], i);
          })
          .map(closeNotches),
      );
      const geometry = polys.length === 1 ? { type: "Polygon", coordinates: polys[0] } : { type: "MultiPolygon", coordinates: polys };
      const g = { type: "Feature", properties: { ...f.properties }, geometry };
      g.properties.a = Math.round(geoArea(g) * EARTH_R ** 2);
      return { f: g, original: f };
    })
    .filter(Boolean);
  const result = client.quantize(server.topology({ p: { type: "FeatureCollection", features: out.map((o) => o.f) } }), OUTPUT_QUANTIZE);
  // rounding the file's coordinates can turn a needle-thin piece of a shape inside out (it would cover the globe): wind
  // it back. A piece with holes is not wound back: then this era keeps its blank strips
  let inverted = false;
  client.feature(result, result.objects.p).features.forEach((f, i) => {
    if (!f.geometry || out[i].f === out[i].original) return;
    const g = result.objects.p.geometries[i];
    polysOf(f.geometry).forEach((rings, k) => {
      if (geoArea({ type: "Polygon", coordinates: rings }) <= 2 * Math.PI) return;
      if (rings.length > 1) {
        inverted = true;
        return;
      }
      const arcs = g.type === "Polygon" ? g.arcs : g.arcs[k];
      arcs[0] = arcs[0].reverse().map((a) => ~a); // the same ring, the other way round
    });
  });
  return inverted ? { topo, filled: 0, inverted: true } : { topo: result, filled };
}

/**
 * Fills the coastal strips in every era file on disk (public/data/eras, in src/data/eras.json order): the thin ones
 * everywhere, the wider ones inside the region `inside` picks.
 * `leftover(year, props)` picks the shapes whose coastal slivers go too. Runs a few passes, so a strip that only touched
 * a sliver goes to the shape that took the sliver.
 */
export function fillGapEraFiles(root, inside, leftover = () => false) {
  const eras = JSON.parse(fs.readFileSync(path.join(root, "src/data/eras.json"), "utf8"));
  const report = [];
  for (const e of eras) {
    const file = path.join(root, "public/data/eras", `${e.key}.json`);
    let topo = JSON.parse(fs.readFileSync(file, "utf8"));
    let filled = 0;
    let inverted = false;
    for (let pass = 0; pass < 3; pass++) {
      const r = fillGaps(topo, inside, (props) => leftover(e.year, props));
      inverted ||= !!r.inverted;
      if (!r.filled) break;
      topo = r.topo;
      filled += r.filled;
    }
    if (filled) writeRetrying(file, JSON.stringify(topo));
    report.push({ era: e.key, filled, inverted });
  }
  return report;
}

/** Writes a file, waiting and trying again a few times if Windows briefly holds it (a virus scan of the last write). */
function writeRetrying(file, text) {
  for (let tries = 1; ; tries++) {
    try {
      return fs.writeFileSync(file, text);
    } catch (err) {
      if (tries >= 10) throw err;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
    }
  }
}
