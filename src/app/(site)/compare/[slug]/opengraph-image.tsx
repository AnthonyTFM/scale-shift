import { ImageResponse } from "next/og";
import { presets } from "@/content/presets";
import { site } from "@/content/site";
import { compareBySlug, compareShapes, compareSlug, compareSvg } from "@/lib/compare";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "The two shapes lined up at true size";

export function generateStaticParams() {
  return presets.map((p) => ({ slug: compareSlug(p) }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = compareBySlug(slug) ?? presets[0];
  const svg = compareSvg(compareShapes(p), size.width, size.height);
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative" }}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img src={src} width={size.width} height={size.height} style={{ position: "absolute", inset: 0 }} />
        <div
          style={{
            position: "absolute",
            left: 40,
            bottom: 40,
            display: "flex",
            flexDirection: "column",
            background: "rgba(14,42,71,0.93)",
            color: "#fff",
            padding: "22px 30px",
            borderRadius: 18,
            maxWidth: 1000,
          }}
        >
          <div style={{ fontSize: 26, color: "#FFB547", fontWeight: 700 }}>{`${site.name} · true size`}</div>
          <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.05 }}>{p.title}</div>
        </div>
      </div>
    ),
    size,
  );
}
