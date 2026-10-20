// Smooth era changes. For a moment after the timeline moves, the map is painted from two "who owns this spot" grids,
// the old snapshot and the new one, instead of the tiles. Every spot always belongs to exactly one shape (or the sea),
// so borders slide without ever opening gaps or overlaps between neighbours.
//
// Names change between snapshots ("German Empire" → "Germany"), so nothing is matched by name: each new shape takes
// over from the old shape it overlaps most, keeps the ground they share, and spreads from there into the ground it
// gains. A shape with no ground in common (a brand-new state) grows out of its middle. Pure functions, no DOM.

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
  return { w, h, a, b, flip, pred, succ };
}

/**
 * Paints the map `e` of the way through the change (0 old, 1 new). Each cell is drawn in the solid colour of the
 * shape it belongs to right now (its new owner, or for ground not reached yet, the shape its old owner becomes), with
 * no blending, so only the borders move: nothing looks blurred or faded. colB holds rgb triples per new owner.
 */
export function paintMorph(p: MorphPlan, e: number, colB: Uint8Array, border: [number, number, number, number], out: Uint8ClampedArray, id: Int32Array = new Int32Array(p.w * p.h)) {
  const { w, h, a, b, flip, succ } = p;
  const n = w * h;
  // which shape each cell shows right now, named by its new owner, so no border shows inside a shape that is growing
  for (let i = 0; i < n; i++) id[i] = e >= flip[i] ? b[i] : succ[a[i]];
  const [br, bg, bb, ba] = border;
  for (let i = 0, o = 0; i < n; i++, o += 4) {
    const c = id[i] * 3;
    let r = colB[c];
    let g = colB[c + 1];
    let bl = colB[c + 2];
    const x = i % w;
    if ((x + 1 < w && id[i + 1] !== id[i]) || (i + w < n && id[i + w] !== id[i])) {
      r += (br - r) * ba;
      g += (bg - g) * ba;
      bl += (bb - bl) * ba;
    }
    out[o] = r;
    out[o + 1] = g;
    out[o + 2] = bl;
    out[o + 3] = 255;
  }
  return id; // also used to place the names
}
