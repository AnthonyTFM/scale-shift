// Political-map colouring shared by build-data.mjs and recolor-eras.mjs.
// Every owner (the ruler for colonies, else the state itself) gets one of PALETTE_SIZE colours, never the same as a
// neighbour. Eras are coloured in year order, and each owner first tries to keep the colour it had in the previous
// era (same name), then the colour of whoever held its land before, so a country doesn't change colour from one
// snapshot to the next unless a neighbour forces it to.

import { geoContains } from "d3-geo";
import * as client from "topojson-client";

export const PALETTE_SIZE = 8;

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

const ownerOf = (props) => (props?.n ? props.s || props.n : null);

/**
 * Colours `topo` (sets properties.k on every named shape) and returns what the next era needs to carry the colours
 * on: each owner's colour, and the shapes to look up who held a spot. Pass the previous era's return value as `prev`.
 */
export function assignColors(topo, prev = null) {
  const geoms = topo.objects.p.geometries;
  const nb = client.neighbors(geoms);
  const adj = new Map();
  const area = new Map();
  // each owner's label point: its homeland (the shape with its own name), else its biggest shape. An empire's biggest
  // shape can be a colony on another continent, which would look up the wrong predecessor.
  const labelAt = new Map();
  geoms.forEach((g, i) => {
    const o = ownerOf(g.properties);
    if (!o) return;
    if (!adj.has(o)) adj.set(o, new Set());
    for (const j of nb[i]) {
      const other = ownerOf(geoms[j].properties);
      if (other && other !== o) adj.get(o).add(other);
    }
    const a = g.properties.a || 0;
    const home = g.properties.n === o;
    const cur = labelAt.get(o);
    if (g.properties.l && (!cur || (home && !cur.home) || (home === cur.home && a > cur.a))) labelAt.set(o, { a, home, l: g.properties.l });
    area.set(o, (area.get(o) || 0) + a);
  });

  // what each owner would like to keep: its own colour last era, else the colour of whoever held its middle
  const wish = new Map();
  if (prev) {
    for (const o of adj.keys()) {
      if (prev.color.has(o)) {
        wish.set(o, prev.color.get(o));
        continue;
      }
      const at = labelAt.get(o)?.l;
      const before = at && prev.shapes.find((s) => geoContains(s, at));
      const was = before && ownerOf(before.properties);
      if (was && prev.color.has(was)) wish.set(o, prev.color.get(was));
    }
  }

  // biggest owners choose first, so the countries people notice most are the ones that keep their colour
  const color = new Map();
  const order = [...adj.keys()].sort((a, b) => (area.get(b) || 0) - (area.get(a) || 0) || a.localeCompare(b));
  for (const o of order) {
    const used = new Set([...adj.get(o)].map((x) => color.get(x)).filter((x) => x !== undefined));
    const want = wish.get(o);
    let pick = want !== undefined && !used.has(want) ? want : undefined;
    if (pick === undefined) {
      const start = hashString(o) % PALETTE_SIZE;
      pick = start;
      for (let t = 0; t < PALETTE_SIZE; t++) {
        const c = (start + t) % PALETTE_SIZE;
        if (!used.has(c)) {
          pick = c;
          break;
        }
      }
    }
    color.set(o, pick);
  }
  for (const g of geoms) {
    const o = ownerOf(g.properties);
    if (o) g.properties.k = color.get(o);
  }
  const shapes = client.feature(topo, topo.objects.p).features.filter((f) => f.geometry && ownerOf(f.properties));
  return { color, shapes };
}
