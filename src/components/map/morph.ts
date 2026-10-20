// Smooth era changes. For a moment after the timeline moves, the map is painted from two "who owns this spot" grids,
// the old snapshot and the new one, instead of the tiles. Every spot always belongs to exactly one shape (or the sea),
// so borders slide without ever opening gaps or overlaps between neighbours.
//
// Names change between snapshots ("German Empire" → "Germany"), so nothing is matched by name: a new shape carries on
// an old one when each is the other's biggest overlap. It keeps the ground they share and spreads from there into the
// ground it gains. A brand-new state grows out of its middle; an old state nothing carries on keeps its own look while
// it shrinks. Until the moving border reaches a spot, the spot looks exactly as it did before: only borders move.
// Pure functions, no DOM.

/** Owner of each grid cell: 0 is sea (no shape), n is shape n - 1. */
export type OwnerGrid = Int32Array;

export type MorphPlan = {
  w: number;
  h: number;
  a: OwnerGrid;
  b: OwnerGrid;
  /** when each cell switches to its new owner, 0–1 (0: ground the old and new shape share) */
  flip: Float32Array;
  /** old owner each new owner takes over from */ pred: Int32Array;
  /** new owner each old owner hands over to */ succ: Int32Array;
  /** the old owner each new owner carries on (each is the other's biggest overlap), or -1 for a brand-new shape */
  carries: Int32Array;
  /**
   * What an old owner's cells show until the border reaches them: the new owner carrying it on (ids 0…nB-1), or for an
   * old shape nothing carries on, its own id nB + old owner. Colours, border styles and names are looked up by id.
   */
  idA: Int32Array;
  nA: number;
  nB: number;
};

/** Plans the change from grid `a` (nA owners incl. sea) to grid `b` (nB owners incl. sea). */
export function planMorph(a: OwnerGrid, b: OwnerGrid, nA: number, nB: number, w: number, h: number): MorphPlan {
  const n = w * h;
  // who overlaps whom
  const overlap = new Int32Array(nA * nB);
  for (let i = 0; i < n; i++) overlap[a[i] * nB + b[i]]++;
  const pred = new Int32Array(nB);
  const succ = new Int32Array(nA);
  const best = new Int32Array(nA);
  for (let j = 0; j < nB; j++) {
    let top = 0;
    for (let i = 0; i < nA; i++) {
      const v = overlap[i * nB + j];
      if (v > top) [top, pred[j]] = [v, i];
      if (v > best[i]) [best[i], succ[i]] = [v, j];
    }
  }
  pred[0] = 0;
  succ[0] = 0;

  // Ground a new owner keeps: only where it carries on the old owner (each is the other's biggest overlap). A new
  // state carved out of an empire (Poland out of the Russian Empire) keeps nothing, so it grows in rather than popping up.
  const stable = (i: number) => a[i] === pred[b[i]] && succ[a[i]] === b[i];

  // spread each new owner from the ground it keeps into the ground it gains, staying inside its new borders. Steps cost
  // 5 straight and 7 diagonally (≈ 1 : √2), so fronts move out in near-circles rather than squares.
  const UNSET = 0x7fffffff;
  const dist = new Int32Array(n).fill(UNSET);
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
  const carries = new Int32Array(nB).fill(-1);
  const idA = new Int32Array(nA);
  for (let i = 0; i < nA; i++) idA[i] = nB + i;
  for (let j = 0; j < nB; j++)
    if (succ[pred[j]] === j) {
      carries[j] = pred[j];
      idA[pred[j]] = j;
    }
  return { w, h, a, b, flip, pred, succ, carries, idA, nA, nB };
}

/** Border style per shape, as the tiles draw it: none (sea, filled-in gaps), soft (unclaimed land), dashed (approximate), solid. */
export const LINE = { none: 0, soft: 1, dashed: 2, solid: 3 } as const;

/**
 * Paints the map `e` of the way through the change (0 old, 1 new). Each cell shows the shape it belongs to right now:
 * its new owner once the moving border has reached it, else the shape that was there before. Colours and border styles
 * come per id (see MorphPlan.idA) and stay as they were until the slide ends, so only the borders move: no blending,
 * no colour or style changes on the way. Fills `id` and `line` (each cell's id and border style) for what is drawn on top.
 */
export function paintMorph(
  p: MorphPlan,
  e: number,
  colId: Uint8Array,
  lineId: Uint8Array,
  out: Uint8ClampedArray,
  id: Int32Array = new Int32Array(p.w * p.h),
  line: Uint8Array = new Uint8Array(p.w * p.h),
) {
  const { a, b, flip, idA } = p;
  for (let i = 0, o = 0; i < id.length; i++, o += 4) {
    const k = e >= flip[i] ? b[i] : idA[a[i]];
    id[i] = k;
    line[i] = lineId[k];
    const c = k * 3;
    out[o] = colId[c];
    out[o + 1] = colId[c + 1];
    out[o + 2] = colId[c + 2];
    out[o + 3] = 255;
  }
  return id;
}

/**
 * The border lines for one frame, drawn the way the tiles draw them, so a border looks the same during the slide as
 * before and after it. Lines run between cells of different shapes (grid units; cell centres at +0.5), grouped by
 * style, and joined into long polylines so dashes stay evenly spaced. A border between two shapes is marked `twice`:
 * the tiles stroke each shape's outline, so a shared border is drawn twice and looks darker than a coastline.
 */
export function borderLines(ids: Int32Array, line: Uint8Array, w: number, h: number) {
  // segments per group (style × twice), as point keys on the half-cell lattice
  const W = 2 * w + 3;
  const groups: number[][] = Array.from({ length: 8 }, () => []);
  for (let y = 0; y + 1 < h; y++)
    for (let x = 0; x + 1 < w; x++) {
      const i = y * w + x;
      const tl = ids[i];
      const tr = ids[i + 1];
      const bl = ids[i + w];
      const br = ids[i + w + 1];
      if (tl === tr && tl === bl && tl === br) continue;
      const kind = Math.max(line[i], line[i + 1], line[i + w], line[i + w + 1]);
      if (kind === LINE.none) continue;
      // two different shapes on land (not just a coast): drawn twice, as each shape's outline is on the tiles
      const land = [tl, tr, bl, br].filter((v) => v !== 0);
      const twice = land.some((v) => v !== land[0]) ? 1 : 0;
      const list = groups[kind * 2 + twice];
      // midpoints of the square's sides that a border crosses, on the doubled lattice (whole numbers)
      const cx = 2 * x + 2;
      const cy = 2 * y + 2;
      const mids: number[] = [];
      if (tl !== tr) mids.push((cy - 1) * W + cx);
      if (tr !== br) mids.push(cy * W + cx + 1);
      if (bl !== br) mids.push((cy + 1) * W + cx);
      if (tl !== bl) mids.push(cy * W + cx - 1);
      if (mids.length === 2) list.push(mids[0], mids[1]);
      else for (const m of mids) list.push(m, cy * W + cx); // borders meeting in the square's middle
    }
  // join each group's segments into polylines
  const out: { kind: number; twice: boolean; lines: Float32Array[] }[] = [];
  groups.forEach((segs, g) => {
    if (!segs.length) return;
    const ends = new Map<number, number[]>();
    for (let s = 0; s < segs.length; s += 2)
      for (const p of [segs[s], segs[s + 1]]) {
        const at = ends.get(p);
        if (at) at.push(s);
        else ends.set(p, [s]);
      }
    const used = new Uint8Array(segs.length / 2);
    const lines: Float32Array[] = [];
    const walk = (start: number, s0: number) => {
      const pts = [start];
      let p = start;
      let s = s0;
      while (s >= 0 && !used[s / 2]) {
        used[s / 2] = 1;
        p = segs[s] === p ? segs[s + 1] : segs[s];
        pts.push(p);
        s = (ends.get(p) ?? []).find((t) => !used[t / 2]) ?? -1;
      }
      const xy = new Float32Array(pts.length * 2);
      pts.forEach((q, n) => {
        xy[2 * n] = (q % W) / 2;
        xy[2 * n + 1] = Math.floor(q / W) / 2;
      });
      lines.push(xy);
    };
    // open lines from their loose ends first, then closed loops
    for (const [p, list] of ends) if (list.length === 1 && !used[list[0] / 2]) walk(p, list[0]);
    for (let s = 0; s < segs.length; s += 2) if (!used[s / 2]) walk(segs[s], s);
    out.push({ kind: g >> 1, twice: (g & 1) === 1, lines });
  });
  return out;
}
