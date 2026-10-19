// Map state <-> URL hash, so every comparison is a shareable link.
// Format: #e=<era>&s=<shape>;<shape>  where shape = era,name,color[,lon,lat,rot]

export type ShapeRef = {
  era: string;
  name: string;
  color: number;
  lon?: number;
  lat?: number;
  rot?: number;
};

export type MapState = { era: string; shapes: ShapeRef[]; /** focus point: opens "Who ruled here?" */ at?: [number, number] };

const MAX_SHAPES = 12;

export function encodeState(state: MapState): string {
  const shapes = state.shapes
    .slice(0, MAX_SHAPES)
    .map((s) => {
      const parts = [s.era, encodeURIComponent(s.name), String(s.color)];
      if (s.lon !== undefined && s.lat !== undefined) parts.push(s.lon.toFixed(2), s.lat.toFixed(2), String(Math.round(s.rot ?? 0)));
      return parts.join(",");
    })
    .join(";");
  const at = state.at ? `&at=${state.at[0].toFixed(2)},${state.at[1].toFixed(2)}` : "";
  return `e=${state.era}${shapes ? `&s=${shapes}` : ""}${at}`;
}

export function decodeState(hash: string): MapState | null {
  const raw = hash.replace(/^#/, "");
  if (!raw) return null;
  // Parse by hand: names are percent-encoded once and must stay encoded until split on "," and ";".
  const params = new Map(
    raw.split("&").map((kv) => {
      const i = kv.indexOf("=");
      return i < 0 ? [kv, ""] : [kv.slice(0, i), kv.slice(i + 1)];
    }),
  );
  const era = params.get("e");
  if (!era || !/^(present|\d{1,4}(bce)?)$/.test(era)) return null;
  const shapes: ShapeRef[] = [];
  for (const chunk of (params.get("s") || "").split(";").filter(Boolean).slice(0, MAX_SHAPES)) {
    const [shapeEra, name, color, lon, lat, rot] = chunk.split(",");
    if (!shapeEra || !name || !/^(present|us|\d{1,4}(bce)?)$/.test(shapeEra)) continue;
    let decoded: string;
    try {
      decoded = decodeURIComponent(name);
    } catch {
      continue;
    }
    const ref: ShapeRef = { era: shapeEra, name: decoded, color: Number(color) || 0 };
    const x = Number(lon),
      y = Number(lat),
      r = Number(rot);
    if (lon !== undefined && Number.isFinite(x) && Number.isFinite(y)) {
      ref.lon = Math.max(-180, Math.min(180, x));
      ref.lat = Math.max(-80, Math.min(80, y));
      ref.rot = Number.isFinite(r) ? r : 0;
    }
    shapes.push(ref);
  }
  const state: MapState = { era, shapes };
  const at = (params.get("at") || "").split(",").map(Number);
  if (at.length === 2 && at.every(Number.isFinite)) state.at = [Math.max(-180, Math.min(180, at[0])), Math.max(-85, Math.min(85, at[1]))];
  return state;
}

/** Link that opens the map at an era, focused on a point. */
/** Where the interactive map lives. */
export const MAP_PATH = "/map";

/** Link to the map showing a given state. */
export function mapUrl(state: MapState) {
  return `${MAP_PATH}#${encodeState(state)}`;
}

export function mapLink(era: string, at?: [number, number]) {
  return mapUrl({ era, shapes: [], at });
}
