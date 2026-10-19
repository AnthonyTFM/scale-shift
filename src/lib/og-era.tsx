import { ImageResponse } from "next/og";
import { site } from "@/content/site";
import { eraByKey, eras, eraTitle, keyFromSlug } from "@/lib/eras";
import { worldMapDataUri } from "@/lib/og-map";

export const OG_SIZE = { width: 1200, height: 630 };

/** Era map image used for social previews and as the hero image on /eras/[slug]. */
export function eraImage(slug: string) {
  const era = eraByKey(keyFromSlug(slug)) ?? eras[eras.length - 1];
  const map = worldMapDataUri(era.key, OG_SIZE.width, OG_SIZE.height);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={map} width={OG_SIZE.width} height={OG_SIZE.height} style={{ position: "absolute", inset: 0 }} />
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
          }}
        >
          <div style={{ fontSize: 26, color: "#FFB547", fontWeight: 700 }}>{site.name}</div>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05 }}>{eraTitle(era)}</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
