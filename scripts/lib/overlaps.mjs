// Makes every spot on an era's map belong to one shape. The border sources sometimes draw territories on top of each
// other (1492 has thousands of overlapping homelands); the map fills one over the other but strokes every outline, so
// hidden outlines showed as stray lines running through other shapes. Where two shapes overlap, the smaller one keeps
// the shared ground and the larger one gets a hole there, so every territory stays visible.
// Shared by build-data.mjs and fix-overlaps.mjs.

import fs from "node:fs";
import path from "node:path";
import { geoArea, geoCentroid, geoContains } from "d3-geo";
import polygonClipping from "polygon-clipping";
import * as client from "topojson-client";
import * as server from "topojson-server";

const EARTH_R = 6371.0088;
const OUTPUT_QUANTIZE = 2e4; // as build-data.mjs writes the era files

const polysOf = (g) => (!g ? [] : g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);
const boxOf = (polys) => {
  let [w, s, e, n] = [180, 90, -180, -90];
  for (const p of polys) for (const [x, y] of p[0]) [w, s, e, n] = [Math.min(w, x), Math.min(s, y), Math.max(e, x), Math.max(n, y)];
  return [w, s, e, n];
};
const meets = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/** polygon-clipping returns counter-clockwise outer rings; d3 wants them clockwise (else a shape covers the globe). */
function d3Winding(polys) {
  return polys.map((rings) => (geoArea({ type: "Polygon", coordinates: rings }) > 2 * Math.PI ? rings.map((r) => [...r].reverse()) : rings));
}

/** Separates overlapping shapes in one era topology. Returns the new topology and how many shapes were cut. */
export function separateOverlaps(topo) {
  const feats = client.feature(topo, topo.objects.p).features;
  const items = feats.map((f) => {
    const polys = polysOf(f.geometry);
    const box = boxOf(polys);
    // shapes around a pole or across the date line are left alone: planar clipping is unreliable there
    const skip = !polys.length || box[2] - box[0] > 180 || box[1] < -80 || box[3] > 85;
    return { f, polys, box, skip, area: polys.length ? geoArea(f) : 0 };
  });
  const order = items.filter((it) => !it.skip).sort((a, b) => a.area - b.area);
  const done = [];
  let cut = 0;
  for (const it of order) {
    const over = done.filter((d) => meets(d.box, it.box)).map((d) => d.polys);
    if (over.length) {
      let rest = null;
      try {
        rest = polygonClipping.difference(it.polys, ...over);
      } catch {
        // a big, complicated shape can make one combined cut fail: cut the smaller shapes out one at a time instead,
        // skipping any that still fail
        rest = it.polys;
        for (const o of over) {
          try {
            rest = polygonClipping.difference(rest, o);
          } catch {
            /* keep this overlap */
          }
        }
      }
      // drop slivers (under ~5 km²): rounding the file's coordinates can turn them inside out
      rest = d3Winding(rest).filter((p) => geoArea({ type: "Polygon", coordinates: p }) * EARTH_R ** 2 > 5);
      const restArea = rest.reduce((s, p) => s + geoArea({ type: "Polygon", coordinates: p }), 0);
      if (it.area - restArea > it.area * 1e-4) {
        it.polys = rest;
        it.cut = true;
        cut++;
      }
    }
    if (it.polys.length) done.push(it);
  }
  // each shape as it will be written, with its original outline to fall back on
  const out = [];
  for (const it of items) {
    if (!it.cut) {
      out.push({ f: it.f, original: it.f });
      continue;
    }
    if (!it.polys.length) continue; // swallowed entirely by smaller shapes
    const geometry = it.polys.length === 1 ? { type: "Polygon", coordinates: it.polys[0] } : { type: "MultiPolygon", coordinates: it.polys };
    const f = { type: "Feature", properties: { ...it.f.properties }, geometry };
    // area and label point follow the shape as drawn
    f.properties.a = Math.round(geoArea(f) * EARTH_R ** 2);
    if (f.properties.l && !geoContains(f, f.properties.l)) {
      const biggest = it.polys.reduce((p, q) => (geoArea({ type: "Polygon", coordinates: q }) > geoArea({ type: "Polygon", coordinates: p }) ? q : p));
      const c = geoCentroid({ type: "Polygon", coordinates: biggest });
      if (geoContains(f, c)) f.properties.l = [Math.round(c[0] * 100) / 100, Math.round(c[1] * 100) / 100];
    }
    out.push({ f, original: it.f });
  }
  // rounding the file's coordinates can turn a small piece of a cut shape inside out: that piece is dropped (or, if it was
  // the whole shape, the shape goes back to its original outline)
  let result = null;
  for (let pass = 0; pass < 4; pass++) {
    result = client.quantize(server.topology({ p: { type: "FeatureCollection", features: out.map((o) => o.f) } }), OUTPUT_QUANTIZE);
    let fixed = 0;
    client.feature(result, result.objects.p).features.forEach((f, i) => {
      if (!f.geometry || geoArea(f) <= 2 * Math.PI || out[i].f === out[i].original) return;
      fixed++;
      const rounded = polysOf(f.geometry);
      const keep = polysOf(out[i].f.geometry).filter((_, k) => !rounded[k] || geoArea({ type: "Polygon", coordinates: rounded[k] }) <= 2 * Math.PI);
      if (keep.length && keep.length < rounded.length) out[i].f = { ...out[i].f, geometry: { type: "MultiPolygon", coordinates: keep } };
      else {
        out[i].f = out[i].original;
        cut--;
      }
    });
    if (!fixed) break;
  }
  return { topo: result, cut };
}

/** Separates overlapping shapes in every era file on disk (public/data/eras, in src/data/eras.json order). */
export function separateEraFiles(root) {
  const eras = JSON.parse(fs.readFileSync(path.join(root, "src/data/eras.json"), "utf8"));
  const report = [];
  for (const e of eras) {
    const file = path.join(root, "public/data/eras", `${e.key}.json`);
    const { topo, cut } = separateOverlaps(JSON.parse(fs.readFileSync(file, "utf8")));
    if (cut) fs.writeFileSync(file, JSON.stringify(topo));
    report.push({ era: e.key, cut });
  }
  return report;
}
