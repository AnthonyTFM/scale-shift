// Server-only: renders a world map (optionally for one era) as SVG: a data URI for Open Graph images, and the equal-area
// era maps on /eras pages.
import fs from "node:fs";
import path from "node:path";
import { geoEqualEarth, geoGraticule10, geoMercator, geoPath, type GeoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, Geometry } from "geojson";
import { POLITICAL } from "./palette";

const DATA = path.join(process.cwd(), "public", "data");

const LAND = "#EFE3C8";

/**
 * The big lakes, drawn as water over any era: the border sources leave them out differently, so without this some
 * eras show the Great Lakes or Lake Victoria as land (the map page does the same, from the same file).
 */
function lakesSvg(path_: GeoPath) {
  const topo = JSON.parse(fs.readFileSync(path.join(DATA, "lakes.json"), "utf8")) as Topology;
  let d = "";
  for (const f of feature(topo, topo.objects.lakes as GeometryCollection).features) d += path_(f) ?? "";
  return d ? `<path d="${d}" fill="#9FCBE0" stroke="rgba(88,60,46,0.6)" stroke-width="0.6"/>` : "";
}

// centred like the map page (the world is cut at 168.5°W, so no country is split across the edges)
const CUT_CENTER = 11.5;

/** Height of the equal-area map at a given width (no data needed, for image sizes in pages). */
export const equalAreaHeight = (width: number) => Math.ceil(geoPath(geoEqualEarth().fitWidth(width, { type: "Sphere" })).bounds({ type: "Sphere" })[1][1]);

/** The world (one era's borders) on an equal-area map: shapes at their true relative size, as the site argues. */
export function equalAreaMapSvg(eraKey: string, width = 1200) {
  const height = equalAreaHeight(width);
  // a pixel of margin all round, so the outline drawn on the edge of the globe isn't cut off
  const projection = geoEqualEarth()
    .rotate([-CUT_CENTER, 0])
    .fitExtent(
      [
        [1, 1],
        [width - 1, height - 1],
      ],
      { type: "Sphere" },
    );
  const path_ = geoPath(projection);
  path_.digits(1);
  type P = { n: string; s?: string; b: number; k?: number; m?: number };
  let shapes = "";
  const topo = JSON.parse(fs.readFileSync(path.join(DATA, "eras", `${eraKey}.json`), "utf8")) as Topology;
  for (const f of feature(topo, topo.objects.p as GeometryCollection<P>).features as Feature<Geometry, P>[]) {
    const d = path_(f);
    if (!d) continue;
    const fill = f.properties.n ? POLITICAL[f.properties.k ?? 0] : LAND;
    const stroke = f.properties.m ? fill : f.properties.n ? "rgba(88,60,46,0.6)" : "rgba(88,60,46,0.2)";
    shapes += `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="0.6"${f.properties.n && f.properties.b < 2 ? ' stroke-dasharray="2 2"' : ""}/>`;
  }
  const sphere = path_({ type: "Sphere" });
  const eq = projection([0, 0])![1];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path d="${sphere}" fill="#9FCBE0"/><path d="${path_(geoGraticule10())}" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="0.6"/>${shapes}${lakesSvg(path_)}<line x1="0" x2="${width}" y1="${eq}" y2="${eq}" stroke="rgba(122,62,30,0.5)" stroke-dasharray="6 5"/><path d="${sphere}" fill="none" stroke="#7FAFC7" stroke-width="1.2"/></svg>`;
  return { svg, width, height };
}

export function worldMapDataUri(eraKey: string | null, width = 1200, height = 630) {
  const projection = geoMercator()
    .scale(width / (2 * Math.PI) / 0.98)
    .translate([width / 2, height * 0.62])
    .precision(1);
  const path_ = geoPath(projection);
  type P = { n: string; s?: string; b: number; k?: number; m?: number };
  let shapes = "";
  const topo = JSON.parse(fs.readFileSync(path.join(DATA, "eras", `${eraKey ?? "present"}.json`), "utf8")) as Topology;
  const fc = feature(topo, topo.objects.p as GeometryCollection<P>);
  for (const f of fc.features as Feature<Geometry, P>[]) {
    const d = path_(f);
    if (!d) continue;
    const fill = f.properties.n ? POLITICAL[f.properties.k ?? 0] : LAND;
    const stroke = f.properties.m ? fill : f.properties.n ? "rgba(88,60,46,0.6)" : "rgba(88,60,46,0.2)";
    shapes += `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="0.6"${f.properties.n && f.properties.b < 2 ? ' stroke-dasharray="2 2"' : ""}/>`;
  }
  const eq = projection([0, 0])![1];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#9FCBE0"/>${shapes}${lakesSvg(path_)}<line x1="0" x2="${width}" y1="${eq}" y2="${eq}" stroke="rgba(122,62,30,0.5)" stroke-dasharray="6 5"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
