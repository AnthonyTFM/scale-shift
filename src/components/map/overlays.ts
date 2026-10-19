import { lineages } from "@/content/lineages";
import { loadLayer, type IndexRow, type Layer } from "@/lib/data";
import { eraIndex, eras } from "@/lib/eras";
import { anchorOf, areaKm2, dropFarParts } from "@/lib/geo";
import { eraKeyOfYear } from "./era-keys";
import type { Overlay } from "./engine";

let counter = 0;
export const newId = () => `o${Date.now().toString(36)}${(counter++).toString(36)}`;

/** All names a state has had (or just its own name). */
export function lineageFor(name: string): string[] {
  return lineages.find((l) => l.names.includes(name))?.names ?? [name];
}

export function pickNameInLayer(names: string[], layer: Layer): string | null {
  let best: string | null = null;
  let bestArea = -1;
  for (const n of names) {
    const f = layer.byName.get(n);
    if (f && !f.props.x && f.props.a > bestArea) {
      best = n;
      bestArea = f.props.a;
    }
  }
  return best;
}

export type OverlayStep = { era: string; name: string; km2: number };

/** Every snapshot in which this shape (or an earlier/later name for it) appears. */
export function timelineSteps(name: string, sourceEra: string, index: IndexRow[]): OverlayStep[] {
  if (sourceEra === "us") return [];
  const names = new Set(lineageFor(name));
  const byEra = new Map<string, OverlayStep>();
  for (const row of index) {
    if (row.us || !names.has(row.n)) continue;
    row.y.forEach((y, i) => {
      const key = eraKeyOfYear(y);
      const prev = byEra.get(key);
      if (!prev || row.a[i] > prev.km2) byEra.set(key, { era: key, name: row.n, km2: row.a[i] });
    });
  }
  return [...byEra.values()].sort((a, b) => eraIndex(a.era) - eraIndex(b.era));
}

export async function buildOverlay(
  eraKey: string,
  name: string,
  opts: { color: number; lon?: number; lat?: number; rot?: number; id?: string },
): Promise<Overlay | null> {
  const layer = await loadLayer(eraKey);
  const f = layer.byName.get(name);
  if (!f) return null;
  const { geom, hidden } = dropFarParts(f.geom);
  const origin = anchorOf(geom);
  const moved = opts.lon !== undefined && opts.lat !== undefined;
  return {
    id: opts.id ?? newId(),
    name,
    era: eraKey,
    color: opts.color,
    origin,
    lon: moved ? opts.lon! : origin[0],
    lat: moved ? opts.lat! : origin[1],
    rot: opts.rot ?? 0,
    moved: moved || !!opts.rot,
    geom,
    hiddenParts: hidden,
    km2: hidden ? areaKm2(geom) : f.props.a,
    props: f.props,
  };
}

/** Swap an overlay to another snapshot of the same state, keeping colour, position and rotation. */
export async function overlayAtEra(o: Overlay, eraKey: string, name: string): Promise<Overlay | null> {
  const next = await buildOverlay(eraKey, name, {
    color: o.color,
    id: o.id,
    ...(o.moved ? { lon: o.lon, lat: o.lat, rot: o.rot } : {}),
  });
  return next;
}

export const DEFAULT_ERA = eras[eras.length - 1].key;
