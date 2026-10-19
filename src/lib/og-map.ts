// Server-only: renders a world map (optionally for one era) to an SVG data URI for Open Graph images.
import fs from "node:fs";
import path from "node:path";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, Geometry } from "geojson";

const DATA = path.join(process.cwd(), "public", "data");

const POLITICAL = ["#F6C28B", "#F29E8E", "#F5D671", "#B6D98A", "#8DD0B8", "#C4ACE5", "#F2A6C6", "#E2B88E"];
const LAND = "#EFE3C8";

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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#9FCBE0"/>${shapes}<line x1="0" x2="${width}" y1="${eq}" y2="${eq}" stroke="rgba(122,62,30,0.5)" stroke-dasharray="6 5"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
