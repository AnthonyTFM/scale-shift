// The daily puzzle's pre-drawn outlines (public/data/daily/shapes/*.json, from scripts/build-daily.mjs) and how to frame them.

/** One drawing of a shape: an SVG path and its bounding box [x0, y0, x1, y1]. */
export type Outline = { d: string; b: [number, number, number, number] };
export type ShapeFile = { merc: Outline; ea: Outline };
type Box = Outline["b"];

/** The part of a shape that gets drawn: the kept rings as a path, and their bounding box. */
export type Part = { d: string; b: Box };
const parts = new WeakMap<Outline, Part>();

/**
 * The part of an outline worth drawing: its biggest ring and the rings near it, link by link. Without this, a country
 * with far-off islands (France's overseas departments, the Dutch Caribbean) is framed across half the world and drawn
 * as a speck. Only the kept rings are drawn, so a left-out island can't show up at the edge of a tile either.
 */
export function mainPart(o: Outline): Part {
  const known = parts.get(o);
  if (known) return known;
  const rings = o.d
    .split("M")
    .filter(Boolean)
    .map((part) => {
      const n = part
        .replace(/Z/gi, "")
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      let area = 0;
      let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
      for (let i = 0; i + 1 < n.length; i += 2) {
        const [x, y] = [n[i], n[i + 1]];
        const [nx, ny] = [n[(i + 2) % n.length], n[(i + 3) % n.length]];
        area += x * ny - nx * y;
        [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
      }
      return { d: `M${part}`, area: Math.abs(area) / 2, box: [x0, y0, x1, y1] as Box };
    })
    .filter((r) => Number.isFinite(r.box[0]))
    .sort((a, b) => b.area - a.area);
  if (!rings.length) {
    const whole = { d: o.d, b: o.b };
    parts.set(o, whole);
    return whole;
  }
  // grow a cluster from the biggest ring: take in any ring that lies close to it (within 3/4 of the cluster's size), and
  // keep going, so island chains and two-part countries (Malaysia, Norway with Svalbard) stay whole while far-off
  // territories drop out (French Guiana, the Azores, the Galápagos); checked against every puzzle shape, both drawings
  let box = rings[0].box;
  const kept = [rings[0]];
  let rest = rings.slice(1);
  for (let added = true; added && rest.length; ) {
    added = false;
    rest = rest.filter((r) => {
      const near = (Math.max(box[2] - box[0], box[3] - box[1]) * 3) / 4;
      const gap = Math.max(r.box[0] - box[2], box[0] - r.box[2], r.box[1] - box[3], box[1] - r.box[3], 0);
      if (gap > near) return true;
      box = [Math.min(box[0], r.box[0]), Math.min(box[1], r.box[1]), Math.max(box[2], r.box[2]), Math.max(box[3], r.box[3])];
      kept.push(r);
      added = true;
      return false;
    });
  }
  // nothing left out: draw the original path as it is
  const part = { d: rest.length ? kept.map((r) => r.d).join("") : o.d, b: box };
  parts.set(o, part);
  return part;
}

/** The bounding box of the part that gets drawn. */
export const mainBox = (o: Outline): Box => mainPart(o).b;

/**
 * A normal web map can't really draw the poles: Mercator stretches Antarctica into a strip along the bottom edge, which
 * nobody recognises. For a shape that close to a pole, the "normal map" drawing is its true outline blown up to the area
 * the map gives it (Antarctica: about 24× its real area), so it still shrinks to its real size on the reveal. Both
 * drawings are in the same units (km at the same scale), so scaling by √(map area ÷ real area) is exact.
 */
export function withMapDrawing(file: ShapeFile, e: { a: number; m: number; lat: number }): ShapeFile {
  if (Math.abs(e.lat) < 80) return file;
  const k = Math.sqrt(e.m / e.a);
  const scale = (v: number) => Math.round(v * k);
  return {
    ...file,
    merc: {
      d: file.ea.d.replace(/-?\d+(?:\.\d+)?/g, (n) => String(scale(Number(n)))),
      b: file.ea.b.map(scale) as Outline["b"],
    },
  };
}
