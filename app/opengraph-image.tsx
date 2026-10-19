import { ImageResponse } from "next/og";
import { site } from "@/content/site";

export const alt = `${site.name}: true size of countries and empires through history`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0f2e36",
          color: "#f1f4ef",
          padding: 64,
        }}
      >
        <div style={{ fontSize: 40, color: "#e8a92a" }}>{site.name}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, maxWidth: 1000 }}>See how big every empire really was.</div>
          <div style={{ fontSize: 34, marginTop: 20, color: "#c8d2c3" }}>Drag countries across the map, from 1 BC to today.</div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {["#e2483a", "#3f6fd8", "#e8a92a", "#2e9e6a", "#a3449a"].map((c) => (
            <div key={c} style={{ width: 64, height: 18, borderRadius: 9, background: c }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
