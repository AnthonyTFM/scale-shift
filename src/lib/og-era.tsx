import { ImageResponse } from "next/og";
import { site } from "@/content/site";
import { eraByKey, eras, eraTitle, keyFromSlug } from "@/lib/eras";
import { worldMapDataUri } from "@/lib/og-map";
import { ogFonts } from "@/lib/og-fonts";
import { logoMarkUri, og } from "@/lib/og-brand";

export const OG_SIZE = { width: 1200, height: 630 };

/** Era map image used for social previews (the era pages show the equal-area map from /era-maps/[slug]/map). */
export function eraImage(slug: string) {
  const era = eraByKey(keyFromSlug(slug)) ?? eras[eras.length - 1];
  const map = worldMapDataUri(era.key, OG_SIZE.width, OG_SIZE.height);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: og.paper, fontFamily: "Inter" }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={map} width={OG_SIZE.width} height={OG_SIZE.height} style={{ position: "absolute", inset: 0 }} />
        <div
          style={{
            position: "absolute",
            left: 40,
            bottom: 46,
            display: "flex",
            flexDirection: "column",
            background: og.card,
            color: og.ink,
            padding: "22px 30px 26px",
            borderRadius: 24,
            border: `3px solid ${og.line}`,
            boxShadow: `0 8px 0 0 ${og.line}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={logoMarkUri} width={40} height={40} />
            <div style={{ fontFamily: "Bricolage Grotesque", fontSize: 30, color: og.blue }}>{site.name}</div>
          </div>
          <div style={{ fontFamily: "Bricolage Grotesque", fontSize: 64, lineHeight: 1.05, marginTop: 8 }}>{eraTitle(era)}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: ogFonts() },
  );
}
