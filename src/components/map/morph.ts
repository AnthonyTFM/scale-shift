// Smooth era changes. For a moment after the timeline moves, the map is painted from two "who owns this spot" grids,
// the old snapshot and the new one, instead of the tiles. Every spot always belongs to exactly one shape (or the sea),
// so borders slide without ever opening gaps or overlaps between neighbours. Nothing fades: each spot switches to its
// new owner in one step, when the new owner's edge reaches it.
//
// Names change between snapshots ("German Empire" → "Germany"), so nothing is matched by name: a new shape carries
// on an old one when each is the other's biggest overlap. It keeps the ground they share and spreads from there into
// the ground it gains. A new shape with no such partner (a brand-new state) grows out of its middle, and an old shape
// with none (a state that is swallowed) keeps its own look while it shrinks. Pure functions, no DOM.

/** Owner of each grid cell: 0 is sea (no shape), n is shape n - 1. */
export type OwnerGrid = Int32Array;

export type MorphPlan = {
  w: number;
  h: number;
  a: OwnerGrid;
  b: OwnerGrid;
  nA: number;
  nB: number;
  /** when each cell switches to its new owner, 0–1 (0: ground an old shape and the new shape carrying it on share) */
  flip: Float32Array;
  /** the old owner each new owner carries on, or -1 for a brand-new shape */ pred: Int32Array;
  /**
   * What an old owner's cells show until they switch: the new owner carrying it on (ids 0…nB-1), or for an old shape
   * nothing carries on, its own id nB + old owner. Ids are what colours, borders and names are looked up by.
   */
  idA: Int32Array;
};

/** Plans the change from grid `a` (nA owners incl. sea) to grid `b` (nB owners incl. sea). */
export function planMorph(a: OwnerGrid, b: OwnerGrid, nA: number, nB: number, w: number, h: number): MorphPlan {
  const n = w * h;
  // who overlaps whom: a pair carries on when each is the other's biggest overlap
  const overlap = new Int32Array(nA * nB);
  for (let i = 0; i < n; i++) overlap[a[i] * nB + b[i]]++;
  const bestOfB = new Int32Array(nB);
  const bestOfA = new Int32Array(nA);
  const topB = new Int32Array(nB);
  const topA = new Int32Array(nA);
  for (let i = 0; i < nA; i++)
    for (let j = 0; j < nB; j++) {
      const v = overlap[i * nB + j];
      if (v > topB[j]) [topB[j], bestOfB[j]] = [v, i];
      if (v > topA[i]) [topA[i], bestOfA[i]] = [v, j];
    }
  const pred = new Int32Array(nB).fill(-1);
  const idA = new Int32Array(nA);
  for (let i = 0; i < nA; i++) idA[i] = nB + i;
  for (let j = 0; j < nB; j++) {
    const i = bestOfB[j];
    if (topB[j] > 0 && bestOfA[i] === j) {
      pred[j] = i;
      idA[i] = j;
    }
  }
  pred[0] = 0;
  idA[0] = 0;

  // spread each new owner from the ground it keeps into the ground it gains, staying inside its new borders. Steps cost
  // 5 straight and 7 diagonally (≈ 1 : √2), so fronts move out in near-circles rather than squares.
  const UNSET = 0x7fffffff;
  const dist = new Int32Array(n).fill(UNSET);
  const stable = (i: number) => pred[b[i]] === a[i];
  // cells waiting to spread, by distance mod 8 (a step costs at most 7, so a bucket never mixes two distances)
  const buckets: number[][] = Array.from({ length: 8 }, () => []);
  let waiting = 0;
  const reach = (i: number, d: number) => {
    dist[i] = d;
    buckets[d & 7].push(i, d);
    waiting++;
  };
  for (let i = 0; i < n; i++) if (stable(i)) dist[i] = 0;
  const unreached = (q: number, from: number) => dist[q] === UNSET && b[q] === b[from];
  for (let i = 0; i < n; i++) {
    if (dist[i] !== 0) continue;
    const x = i % w;
    if ((x > 0 && unreached(i - 1, i)) || (x + 1 < w && unreached(i + 1, i)) || (i >= w && unreached(i - w, i)) || (i + w < n && unreached(i + w, i))) {
      dist[i] = UNSET; // queue it so it spreads, at distance 0
      reach(i, 0);
    }
  }
  const spread = () => {
    for (let d = 0; waiting > 0; d++) {
      const list = buckets[d & 7];
      while (list.length) {
        const at = list.pop()!;
        const i = list.pop()!;
        waiting--;
        if (at !== d || dist[i] !== d) continue; // reached sooner some other way
        const x = i % w;
        const y = (i - x) / w;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const q = ny * w + nx;
            if (b[q] !== b[i] || dist[q] === 0) continue;
            const nd = d + (dx && dy ? 7 : 5);
            if (nd < dist[q]) reach(q, nd);
          }
      }
    }
  };
  spread();
  // ground nobody reached (a new state, or an island): grow from the middle of what's left, a few rounds at most
  for (let round = 0; round < 4; round++) {
    const sx = new Float64Array(nB);
    const sy = new Float64Array(nB);
    const cnt = new Float64Array(nB);
    for (let i = 0; i < n; i++)
      if (dist[i] === UNSET) {
        sx[b[i]] += i % w;
        sy[b[i]] += Math.floor(i / w);
        cnt[b[i]]++;
      }
    const seed = new Int32Array(nB).fill(-1);
    const seedD = new Float64Array(nB).fill(Infinity);
    let any = false;
    for (let i = 0; i < n; i++) {
      if (dist[i] !== UNSET) continue;
      any = true;
      const o = b[i];
      const d = (i % w - sx[o] / cnt[o]) ** 2 + (Math.floor(i / w) - sy[o] / cnt[o]) ** 2;
      if (d < seedD[o]) [seedD[o], seed[o]] = [d, i];
    }
    if (!any) break;
    for (const s of seed) if (s >= 0) reach(s, 1); // 1, not 0: 0 means ground kept from before
    spread();
  }
  // each owner's gains take the same time to fill, however big they are
  const far = new Float32Array(nB);
  for (let i = 0; i < n; i++) if (dist[i] !== UNSET && dist[i] > far[b[i]]) far[b[i]] = dist[i];
  const flip = new Float32Array(n);
  for (let i = 0; i < n; i++) flip[i] = stable(i) ? 0 : dist[i] === UNSET ? 1 : (dist[i] + 1) / (far[b[i]] + 1);
  return { w, h, a, b, nA, nB, flip, pred, idA };
}

/** Which id every cell shows `e` of the way through the change (0 old, 1 new). */
export function idsAt(p: MorphPlan, e: number, out: Int32Array) {
  const { a, b, flip, idA } = p;
  for (let i = 0; i < out.length; i++) out[i] = e >= flip[i] ? b[i] : idA[a[i]];
  return out;
}

/** Paints each cell in its id's colour (rgb triples per id), solid: no blending, so nothing looks blurred or faded. */
export function paintIds(ids: Int32Array, cols: Uint8Array, out: Uint8ClampedArray) {
  for (let i = 0, o = 0; i < ids.length; i++, o += 4) {
    const c = ids[i] * 3;
    out[o] = cols[c];
    out[o + 1] = cols[c + 1];
    out[o + 2] = cols[c + 2];
    out[o + 3] = 255;
  }
}

/** Border style per id, as on the tiles: none (sea, filled-in gaps), soft (unclaimed land), dashed (approximate), solid. */
export const LINE = { none: 0, soft: 1, dashed: 2, solid: 3 } as const;

/**
 * Border lines between cells of different ids, as segments [x1, y1, x2, y2, …] in grid cells (cell centres at +0.5),
 * one list per style. Where two styles meet, the stronger wins, as when the tiles draw each shape's outline. Dashes are
 * made by leaving out cells in a repeating pattern, since the segments are too short to dash one by one.
 */
export function borderSegments(ids: Int32Array, w: number, h: number, style: Uint8Array) {
  const out = { solid: [] as number[], dashed: [] as number[], soft: [] as number[] };
  for (let y = 0; y + 1 < h; y++)
    for (let x = 0; x + 1 < w; x++) {
      const i = y * w + x;
      const tl = ids[i];
      const tr = ids[i + 1];
      const bl = ids[i + w];
      const br = ids[i + w + 1];
      if (tl === tr && tl === bl && tl === br) continue;
      const kind = Math.max(style[tl], style[tr], style[bl], style[br]);
      if (kind === LINE.none) continue;
      const step = (x + y) % 6;
      if ((kind === LINE.dashed && step >= 3) || (kind === LINE.soft && step >= 2)) continue;
      const list = kind === LINE.solid ? out.solid : kind === LINE.dashed ? out.dashed : out.soft;
      // the square between the four cell centres; its middle is the corner the four cells share
      const cx = x + 1;
      const cy = y + 1;
      const mids: number[] = [];
      if (tl !== tr) mids.push(cx, cy - 0.5);
      if (tr !== br) mids.push(cx + 0.5, cy);
      if (bl !== br) mids.push(cx, cy + 0.5);
      if (tl !== bl) mids.push(cx - 0.5, cy);
      // two edge midpoints: one border crossing the square; three or four: borders meeting in its middle
      if (mids.length === 4) list.push(mids[0], mids[1], mids[2], mids[3]);
      else for (let m = 0; m < mids.length; m += 2) list.push(mids[m], mids[m + 1], cx, cy);
    }
  return out;
}
