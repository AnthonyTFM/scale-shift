import type { MapState, Overlay } from "./types";
import { TODAY } from "./format";

/**
 * URL format (short so links fit in a tweet):
 *   ?y=<year>&o=<id>~<year>~<follow 1|0>~<lon|_>~<lat|_>~<rot>!<next overlay>…
 */
export function encodeState(state: MapState): string {
  const params = new URLSearchParams();
  params.set("y", String(state.year));
  if (state.overlays.length) {
    params.set(
      "o",
      state.overlays
        .map((o) =>
          [
            o.id,
            o.year,
            o.follow ? 1 : 0,
            o.pos ? o.pos[0].toFixed(2) : "_",
            o.pos ? o.pos[1].toFixed(2) : "_",
            Math.round(o.rot),
          ].join("~"),
        )
        .join("!"),
    );
  }
  return params.toString();
}

let uidCounter = 0;
export const newUid = () => `o${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

export function decodeState(query: string, validYears: number[]): MapState | null {
  const params = new URLSearchParams(query);
  const y = Number(params.get("y"));
  const o = params.get("o");
  if (!params.has("y") && !o) return null;
  const year = validYears.includes(y) ? y : TODAY;
  const overlays: Overlay[] = [];
  if (o) {
    o.split("!").forEach((chunk, idx) => {
      const [id, yr, follow, lon, lat, rot] = chunk.split("~");
      if (!id || !/^[a-z0-9-]+$/.test(id)) return;
      const oy = Number(yr);
      const pos: [number, number] | null =
        lon && lat && lon !== "_" && lat !== "_" && Number.isFinite(+lon) && Number.isFinite(+lat) ? [+lon, +lat] : null;
      overlays.push({
        uid: newUid(),
        id,
        year: validYears.includes(oy) ? oy : year,
        follow: follow !== "0",
        pos,
        rot: Number.isFinite(+rot) ? +rot : 0,
        color: idx % 8,
      });
    });
  }
  return { year, overlays: overlays.slice(0, 12) };
}
