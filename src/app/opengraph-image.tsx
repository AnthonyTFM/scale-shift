import { ImageResponse } from "next/og";
import { site } from "@/content/site";
import { worldMapDataUri } from "@/lib/og-map";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${site.name}: drag countries and empires to see their real size`;

export default async function Image() {
  const map = worldMapDataUri("present", size.width, size.height);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative" }}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img src={map} width={size.width} height={size.height} style={{ position: "absolute", inset: 0 }} />
        <div
          style={{
            position: "absolute",
            left: 40,
            top: 40,
            display: "flex",
            flexDirection: "column",
            background: "rgba(14,42,71,0.93)",
            color: "#fff",
            padding: "26px 34px",
            borderRadius: 18,
            maxWidth: 760,
          }}
        >
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1 }}>{site.name}</div>
          <div style={{ fontSize: 32, marginTop: 12, color: "#E6EBF3" }}>Drag any nation, through any era, and see its real size.</div>
          <div style={{ fontSize: 24, marginTop: 14, color: "#FFB547", fontWeight: 700 }}>2000 BCE → today</div>
        </div>
      </div>
    ),
    size,
  );
}
