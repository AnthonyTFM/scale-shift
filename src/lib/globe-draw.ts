// Draws the homepage globe. Shared by the background worker (src/components/home/globe.worker.ts) and the main-thread
// fallback in Globe.tsx, so both draw exactly the same picture.
import { geoCentroid, geoDistance, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { POLITICAL } from "./palette";
import { dropSlivers, GLOBE_INSET, GLOBE_TILT, type GlobeCountry, type RawGlobeCountry } from "./globe";

export type GlobeTopology = Topology<{ p: GeometryCollection<{ n: string; k: number }> }>;
type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
/** A country with the smallest circle on the sphere around it: its centre and angular radius (radians). */
type Placed = { c: GlobeCountry; at: [number, number]; r: number };

/** Every vertex of a country, to measure how far it reaches from its centre. */
function vertices(g: GlobeCountry["geometry"]): [number, number][] {
  const t = g as { type: string; coordinates: unknown };
  if (t.type === "Polygon") return (t.coordinates as [number, number][][]).flat();
  if (t.type === "MultiPolygon") return (t.coordinates as [number, number][][][]).flat(2);
  return [];
}

function place(c: GlobeCountry): Placed {
  const at = geoCentroid(c as never) as [number, number];
  const r = vertices(c.geometry).reduce((m, p) => Math.max(m, geoDistance(at, p)), 0);
  return { c, at, r };
}

/** The countries in globe.json, grouped by fill colour. */
export function globeCountries(topo: GlobeTopology): Placed[][] {
  const all = (feature(topo, topo.objects.p) as unknown as { features: RawGlobeCountry[] }).features.map(dropSlivers).map(place);
  return POLITICAL.map((_, i) => all.filter((p) => p.c.properties.k % POLITICAL.length === i));
}

/** Draws the turning parts (grid and countries); the sea, glow and edge shading are CSS layers behind and in front. */
export function globeRenderer(ctx: Ctx) {
  const proj = geoOrthographic().clipAngle(90);
  const path = geoPath(proj, ctx as CanvasRenderingContext2D);
  const outline = geoPath(proj);
  const graticule = geoGraticule10();
  return (groups: Placed[][], lon: number, size: number, dpr: number) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    proj.scale(size / 2 - GLOBE_INSET).translate([size / 2, size / 2]).rotate([lon, GLOBE_TILT]);
    ctx.beginPath();
    path(graticule);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 0.6;
    ctx.stroke();
    // skip countries wholly on the far side (their circle never reaches the visible half): same picture, less work
    const facing: [number, number] = [-lon, -GLOBE_TILT];
    const shown = (p: Placed) => !(geoDistance(facing, p.at) - p.r > Math.PI / 2 + 0.01);
    // every colour's fill first, then every border on top: one fill and one stroke per colour (8 of each, not ~200)
    if (typeof Path2D !== "undefined") {
      const shapes = groups.map((group) => {
        const g = new Path2D();
        for (const p of group) if (shown(p)) outline.context(g as unknown as CanvasRenderingContext2D)(p.c.geometry);
        return g;
      });
      shapes.forEach((g, i) => {
        ctx.fillStyle = POLITICAL[i];
        ctx.fill(g);
      });
      ctx.strokeStyle = "rgba(88, 60, 46, 0.35)";
      ctx.lineWidth = 0.5;
      for (const g of shapes) ctx.stroke(g);
      return;
    }
    // a worker without Path2D: trace each colour twice instead
    const trace = (group: Placed[]) => {
      ctx.beginPath();
      for (const p of group) if (shown(p)) path(p.c.geometry);
    };
    groups.forEach((group, i) => {
      trace(group);
      ctx.fillStyle = POLITICAL[i];
      ctx.fill();
    });
    ctx.strokeStyle = "rgba(88, 60, 46, 0.35)";
    ctx.lineWidth = 0.5;
    for (const group of groups) {
      trace(group);
      ctx.stroke();
    }
  };
}
