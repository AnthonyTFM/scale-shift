// Server-only: the game's two-shape picture for social previews. Each shape as a normal web map draws it (pale) with
// its real size in full colour standing inside, all at one scale, the way the proof on the homepage ends. Reads the
// daily pool's pre-drawn outlines (public/data/daily/shapes, see scripts/build-daily.mjs).
import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import pool from "@/data/daily-pool.json";
import { site } from "@/content/site";
import { mainPart, withMapDrawing, type Outline, type ShapeFile } from "./outline";
import type { PoolEntry } from "./daily";
import { ogFonts } from "./og-fonts";
import { logoMarkUri, og } from "./og-brand";

export const OG_SIZE = { width: 1200, height: 630 };
// the daily game's shape colours
const COLORS = ["#FF5B4A", "#2F6BFF"];
const SHAPES = path.join(process.cwd(), "public", "data", "daily", "shapes");

export function poolEntry(id: string) {
  return (pool as PoolEntry[]).find((e) => e.id === id);
}

function loadShape(id: string): ShapeFile {
  const file = JSON.parse(fs.readFileSync(path.join(SHAPES, `${id}.json`), "utf8")) as ShapeFile;
  const e = poolEntry(id);
  return e ? withMapDrawing(file, e) : file;
}

/**
 * The biggest ring alone when it is most of the country (a preview reads better without far-off islands), the kept
 * rings together when it isn't (Indonesia, the Philippines: the islands are the country).
 */
function mainland(o: Outline): Outline {
  let best: Outline | null = null;
  let bestArea = 0;
  let total = 0;
  for (const ring of mainPart(o).d.split("M").filter(Boolean)) {
    const n = ring.replace(/Z/gi, "").trim().split(/[\s,]+/).map(Number);
    let area = 0;
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (let i = 0; i + 1 < n.length; i += 2) {
      const [x, y] = [n[i], n[i + 1]];
      const [nx, ny] = [n[(i + 2) % n.length], n[(i + 3) % n.length]];
      area += x * ny - nx * y;
      [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
    }
    area = Math.abs(area) / 2;
    total += area;
    if (Number.isFinite(x0) && area > bestArea) {
      bestArea = area;
      best = { d: `M${ring}`, b: [x0, y0, x1, y1] };
    }
  }
  return best && bestArea >= 0.6 * total ? best : mainPart(o);
}

/** The two shapes side by side (map size pale, real size solid), as an SVG data URI of the given size. */
export function pairDataUri(ids: [string, string], width: number, height: number) {
  const pad = 24;
  const ground = height - 18;
  const parts = ids.map((id) => {
    const f = loadShape(id);
    return { map: mainland(f.merc), real: mainland(f.ea) };
  });
  const span = (b: Outline["b"]) => [b[2] - b[0], b[3] - b[1]];
  // one scale that fits the biggest of the four drawings in its half of the picture
  const k = Math.min(
    ...parts.flatMap((p) =>
      [p.map.b, p.real.b].map((b) => {
        const [w, h] = span(b);
        return Math.min((width / 2 - pad * 2) / Math.max(w, 1e-9), (height - pad * 2) / Math.max(h, 1e-9));
      }),
    ),
  );
  const place = (b: Outline["b"], cx: number) => `translate(${cx} ${ground}) scale(${k}) translate(${-(b[0] + b[2]) / 2} ${-b[3]})`;
  const shapes = parts
    .map((p, i) => {
      const cx = (width / 2) * i + width / 4;
      const c = COLORS[i];
      return (
        `<path d="${p.map.d}" transform="${place(p.map.b, cx)}" fill="${c}" fill-opacity="0.18" stroke="${c}" stroke-opacity="0.6" stroke-width="${1.4 / k}" fill-rule="evenodd" stroke-linejoin="round"/>` +
        `<path d="${p.real.d}" transform="${place(p.real.b, cx)}" fill="${c}" fill-opacity="0.9" stroke="${c}" stroke-width="${1.2 / k}" fill-rule="evenodd" stroke-linejoin="round"/>`
      );
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><line x1="${pad}" x2="${width - pad}" y1="${height - 2}" y2="${height - 2}" stroke="${og.line}" stroke-width="3"/>${shapes}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * A social preview card: the two shapes on the left (pale = as a normal map draws them, solid = real size), the title
 * and a line on the right, the wordmark below. The same for the daily game, endless mode and every country page.
 */
export function pairImage({ ids, eyebrow, title, line, legend }: { ids: [string, string]; eyebrow: string; title: string; line: string; legend?: string }) {
  const picture = pairDataUri(ids, 600, 400);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: og.paper, fontFamily: "Inter", color: og.ink }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 660, padding: "48px 0 48px 48px" }}>
          <div style={{ display: "flex", background: og.card, borderRadius: 28, border: `3px solid ${og.line}`, boxShadow: `0 10px 0 0 ${og.line}`, padding: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={picture} width={600} height={400} />
          </div>
          <div style={{ display: "flex", fontSize: 24, color: og.muted, marginTop: 18 }}>{legend ?? "Pale: on a normal map. Solid: real size."}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, padding: "48px 48px 48px 40px" }}>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: og.blue }}>{eyebrow}</div>
          <div style={{ display: "flex", fontFamily: "Bricolage Grotesque", fontSize: 66, lineHeight: 1.02, marginTop: 14 }}>{title}</div>
          <div style={{ display: "flex", fontSize: 30, lineHeight: 1.3, marginTop: 22, color: og.muted }}>{line}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 40 }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={logoMarkUri} width={48} height={48} />
            <div style={{ fontFamily: "Bricolage Grotesque", fontSize: 36, color: og.ink }}>{site.name}</div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: ogFonts() },
  );
}
