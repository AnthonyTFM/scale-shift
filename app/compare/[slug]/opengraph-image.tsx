import { ImageResponse } from "next/og";
import { geoAzimuthalEqualArea, geoPath } from "d3-geo";
import { comparisons, getComparison } from "@/content/comparisons";
import { site } from "@/content/site";
import { centreAt, getEntity, getIndex, shapeAt } from "@/lib/data-server";
import { areaAt, formatKm2, yearLabel } from "@/lib/format";

export const alt = "Two shapes compared at true size";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return comparisons.map((c) => ({ slug: c.slug }));
}

const COLORS = ["#e2483a", "#3f6fd8"];

/** Both outlines drawn with the same equal-area scale, so their sizes compare honestly. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getComparison(slug)!;
  const ix = getIndex();
  const sides = [c.a, c.b].map((s) => {
    const e = getEntity(s.id)!;
    const shape = shapeAt(s.id, s.year)!;
    const centre = centreAt(s.id, s.year) ?? [0, 0];
    return { e, shape, centre, year: s.year, area: areaAt(e, ix.years, s.year) ?? 0 };
  });
  const boxW = 470;
  const boxH = 400;
  // scale chosen so the larger shape fits its box; the smaller one keeps the same scale
  const scales = sides.map((s) => {
    const p = geoAzimuthalEqualArea().rotate([-s.centre[0], -s.centre[1]]).fitSize([boxW, boxH], s.shape);
    return p.scale();
  });
  const scale = Math.min(...scales);
  const paths = sides.map((s) => {
    const p = geoAzimuthalEqualArea()
      .rotate([-s.centre[0], -s.centre[1]])
      .scale(scale)
      .translate([boxW / 2, boxH / 2]);
    return geoPath(p)(s.shape) ?? "";
  });

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#0f2e36", color: "#f1f4ef", padding: 48 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontSize: 56, fontWeight: 700, maxWidth: 900 }}>{c.title}</div>
          <div style={{ fontSize: 28, color: "#e8a92a" }}>{site.name}</div>
        </div>
        <div style={{ display: "flex", flex: 1, justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          {sides.map((s, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: boxW }}>
              <svg width={boxW} height={boxH - 40} viewBox={`0 20 ${boxW} ${boxH - 40}`}>
                <path d={paths[i]} fill={COLORS[i]} fillOpacity={0.75} stroke={COLORS[i]} strokeWidth={3} />
              </svg>
              <div style={{ fontSize: 30, fontWeight: 700 }}>{`${s.e.n}${s.year !== ix.today ? `, ${yearLabel(s.year)}` : ""}`}</div>
              <div style={{ fontSize: 24, color: "#c8d2c3" }}>{formatKm2(s.area)}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
