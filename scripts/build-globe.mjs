// Small world files for decoration: the homepage globe (public/data/globe.json) and the faint map behind page headers
// (public/world.svg, a soft blue silhouette for the light page headers). Built from the present-day snapshot, heavily simplified. Run after build-data.mjs.
import { readFileSync, writeFileSync } from "node:fs";
import { feature, quantize } from "topojson-client";
import { presimplify, simplify, quantile } from "topojson-simplify";
import { geoEqualEarth, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";

const topo = JSON.parse(readFileSync("public/data/eras/present.json", "utf8"));
const pre = presimplify(topo);
// keep the most important ~12% of points, then round coordinates so the file stays small
const small = quantize(simplify(pre, quantile(pre, 0.12)), 1e4);
// keep only what the globe draws: name and colour index
for (const g of small.objects.p.geometries) g.properties = { n: g.properties.n, k: g.properties.k ?? 0 };
// Simplifying squashes some tiny islands into slivers of 2 points with no area. On the globe, a sliver lying exactly on
// the visible edge makes the clipping think it covers the whole sphere, and the ocean flashes that country's colour.
const solid = (ring) => new Set(ring.map((p) => p.join())).size >= 3;
let dropped = 0;
for (const g of small.objects.p.geometries) {
  if (g.type !== "Polygon" && g.type !== "MultiPolygon") continue;
  const coords = feature(small, g).geometry.coordinates;
  const polys = g.type === "Polygon" ? [coords] : coords;
  const keep = polys.map((rings) => solid(rings[0]));
  dropped += keep.filter((k) => !k).length;
  if (g.type === "Polygon") {
    if (!keep[0]) {
      g.type = null;
      delete g.arcs;
    }
  } else {
    g.arcs = g.arcs.filter((_, i) => keep[i]);
    if (!g.arcs.length) {
      g.type = null;
      delete g.arcs;
    }
  }
}
writeFileSync("public/data/globe.json", JSON.stringify(small));

// land as one faint outline drawing, Equal Earth projection, 1000 × 487
const land = feature(small, small.objects.p);
const proj = geoEqualEarth().fitSize([1000, 487], { type: "Sphere" });
const path = geoPath(proj);
path.digits?.(1);
// skip specks: islands smaller than ~2 px across at this size
const d = land.features
  .map((f) => path(f))
  .filter(Boolean)
  .join("")
  .replace(/M[^M]*?Z/g, (ring) => (ring.length > 40 ? ring : ""));
writeFileSync(
  "public/world.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 487"><path d="${d}" fill="#2563eb" fill-opacity="0.08"/></svg>\n`,
);
// The globe's first frame as a picture (public/globe-still.svg): the homepage shows it straight away, so countries are
// on screen before the live globe's script and data arrive. Keep the rotation, tilt and colours in step with
// src/lib/globe.ts and src/lib/palette.ts.
const POLITICAL = ["#F6C28B", "#F29E8E", "#F5D671", "#B6D98A", "#8DD0B8", "#C4ACE5", "#F2A6C6", "#E2B88E"];
const START_LON = -20;
const TILT = -18;
{
  const lighter = simplify(pre, quantile(pre, 0.06));
  const shapes = feature(lighter, lighter.objects.p).features.filter((f) => f.geometry && small.objects.p.geometries.find((g) => g.properties.n === f.properties.n)?.type);
  const ortho = geoOrthographic().clipAngle(90).scale(47.5).translate([50, 50]).rotate([START_LON, TILT]);
  const p = geoPath(ortho);
  p.digits?.(1);
  const fills = POLITICAL.map((color, i) => {
    const d = shapes
      .filter((f) => (f.properties.k ?? 0) % POLITICAL.length === i)
      .map((f) => p(f) ?? "")
      .join("")
      .replace(/M[^M]*?Z/g, (ring) => (ring.length > 24 ? ring : ""));
    return d ? `<path d="${d}" fill="${color}"/>` : "";
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${p(geoGraticule10())}" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="0.15"/><g stroke="rgba(88,60,46,0.45)" stroke-width="0.12" stroke-linejoin="round">${fills}</g></svg>\n`;
  writeFileSync("public/globe-still.svg", svg);
  console.log(`globe-still.svg ${(svg.length / 1024).toFixed(0)} KB`);
}
console.log(`globe.json ${(JSON.stringify(small).length / 1024).toFixed(0)} KB (${dropped} slivers removed), world.svg ${(d.length / 1024).toFixed(0)} KB`);
