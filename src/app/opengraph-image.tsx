import { ImageResponse } from "next/og";
import { site } from "@/content/site";
import { worldMapDataUri } from "@/lib/og-map";
import { ogFonts } from "@/lib/og-fonts";
import { logoMarkUri, og } from "@/lib/og-brand";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${site.name}: drag countries and empires to see their real size`;

export default async function Image() {
  const map = worldMapDataUri("present", size.width, size.height);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: og.paper, fontFamily: "Inter" }}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img src={map} width={size.width} height={size.height} style={{ position: "absolute", inset: 0, opacity: 0.55 }} />
        <div
          style={{
            position: "absolute",
            left: 48,
            top: 48,
            display: "flex",
            flexDirection: "column",
            background: og.card,
            color: og.ink,
            padding: "34px 40px 38px",
            borderRadius: 28,
            border: `3px solid ${og.line}`,
            boxShadow: `0 10px 0 0 ${og.line}`,
            maxWidth: 780,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <img src={logoMarkUri} width={84} height={84} />
            <div style={{ fontFamily: "Bricolage Grotesque", fontSize: 76, lineHeight: 1, letterSpacing: -1 }}>{site.name}</div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 500, marginTop: 22, color: og.muted }}>Every nation, every era, at its real size.</div>
          <div style={{ display: "flex", marginTop: 26 }}>
            <div
              style={{
                display: "flex",
                background: og.blue,
                color: "#fff",
                fontSize: 28,
                fontWeight: 700,
                padding: "12px 24px",
                borderRadius: 999,
                boxShadow: `0 6px 0 0 ${og.blueShadow}`,
              }}
            >
              2000 BCE → today
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: ogFonts() },
  );
}
