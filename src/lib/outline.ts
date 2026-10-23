// The daily puzzle's pre-drawn outlines (public/data/daily/shapes/*.json, from scripts/build-daily.mjs) and how to frame them.

/** One drawing of a shape: an SVG path and its bounding box [x0, y0, x1, y1]. */
export type Outline = { d: string; b: [number, number, number, number] };
export type ShapeFile = { merc: Outline; ea: Outline };
type Box = Outline["b"];

const boxes = new WeakMap<Outline, Box>();

/**
 * The part of an outline worth framing: its biggest ring and the rings near it, link by link. Without this, a country with far-off
 * islands (France's overseas departments, the Dutch Caribbean) is framed across half the world and drawn as a speck.
 * The far-off parts are simply left outside the frame.
 */
export function mainBox(o: Outline): Box {
  const known = boxes.get(o);
  if (known) return known;
  const rings = o.d
    .split("M")
    .filter(Boolean)
    .map((part) => {
      const n = part.replace(/Z/gi, "").trim().split(/[\s,]+/).map(Number);
      let area = 0;
      let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
      for (let i = 0; i + 1 < n.length; i += 2) {
        const [x, y] = [n[i], n[i + 1]];
        const [nx, ny] = [n[(i + 2) % n.length], n[(i + 3) % n.length]];
        area += x * ny - nx * y;
        [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
      }
      return { area: Math.abs(area) / 2, box: [x0, y0, x1, y1] as Box };
    })
    .filter((r) => Number.isFinite(r.box[0]))
    .sort((a, b) => b.area - a.area);
  let box: Box = o.b;
  if (rings.length) {
    // grow a cluster from the biggest ring: take in any ring that lies close to it (within 3/4 of the cluster's size), and
    // keep going, so island chains and two-part countries (Malaysia, Norway with Svalbard) stay whole while far-off
    // territories drop out (French Guiana, the Azores, the Galápagos); checked against every puzzle shape
    box = rings[0].box;
    let rest = rings.slice(1);
    for (let added = true; added && rest.length; ) {
      added = false;
      const near = (Math.max(box[2] - box[0], box[3] - box[1]) * 3) / 4;
      rest = rest.filter((r) => {
        const gap = Math.max(r.box[0] - box[2], box[0] - r.box[2], r.box[1] - box[3], box[1] - r.box[3], 0);
        if (gap > near) return true;
        box = [Math.min(box[0], r.box[0]), Math.min(box[1], r.box[1]), Math.max(box[2], r.box[2]), Math.max(box[3], r.box[3])];
        added = true;
        return false;
      });
    }
  }
  boxes.set(o, box);
  return box;
}
