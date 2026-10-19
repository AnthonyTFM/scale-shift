// Small world files for decoration: the homepage globe (public/data/globe.json) and the faint map behind page headers
// (public/world.svg). Built from the present-day snapshot, heavily simplified. Run after build-data.mjs.
import { readFileSync, writeFileSync } from "node:fs";
import { feature, quantize } from "topojson-client";
import { presimplify, simplify, quantile } from "topojson-simplify";
import { geoEqualEarth, geoPath } from "d3-geo";

const topo = JSON.parse(readFileSync("public/data/eras/present.json", "utf8"));
const pre = presimplify(topo);
// keep the most important ~12% of points, then round coordinates so the file stays small
const small = quantize(simplify(pre, quantile(pre, 0.12)), 1e4);
// keep only what the globe draws: name and colour index
for (const g of small.objects.p.geometries) g.properties = { n: g.properties.n, k: g.properties.k ?? 0 };
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
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 487"><path d="${d}" fill="#8fc3ea" fill-opacity="0.16"/></svg>\n`,
);
console.log(`globe.json ${(JSON.stringify(small).length / 1024).toFixed(0)} KB, world.svg ${(d.length / 1024).toFixed(0)} KB`);
