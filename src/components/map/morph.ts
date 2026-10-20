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

  // spread each new owner from the ground it keeps into the ground it gains (8 neighbours, one step per cell)
  const dist = new Float32Array(n).fill(-1);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  const stable = (i: number) => a[i] === pred[b[i]];
  for (let i = 0; i < n; i++) if (stable(i)) dist[i] = 0;
  const near = (i: number, visit: (q: number) => void) => {
    const x = i % w;
    const y = (i - x) / w;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h) visit(ny * w + nx);
      }
  };
  for (let i = 0; i < n; i++) {
    if (dist[i] !== 0) continue;
    let edge = false;
    near(i, (q) => {
      if (dist[q] < 0 && b[q] === b[i]) edge = true;
    });
    if (edge) queue[tail++] = i;
  }
  const spread = () => {
    while (head < tail) {
      const i = queue[head++];
      near(i, (q) => {
        if (dist[q] < 0 && b[q] === b[i]) {
          dist[q] = dist[i] + 1;
          queue[tail++] = q;
        }
      });
    }
  };
  spread();
  // ground nobody reached (a new state, or an island): grow from the middle of what's left, a few rounds at most
  for (let round = 0; round < 4; round++) {
    const sx = new Float64Array(nB);
    const sy = new Float64Array(nB);
    const cnt = new Float64Array(nB);
    for (let i = 0; i < n; i++)
      if (dist[i] < 0) {
        sx[b[i]] += i % w;
        sy[b[i]] += Math.floor(i / w);
        cnt[b[i]]++;
      }
    const seed = new Int32Array(nB).fill(-1);
    const seedD = new Float64Array(nB).fill(Infinity);
    let any = false;
    for (let i = 0; i < n; i++) {
      if (dist[i] >= 0) continue;
      any = true;
      const o = b[i];
      const d = (i % w - sx[o] / cnt[o]) ** 2 + (Math.floor(i / w) - sy[o] / cnt[o]) ** 2;
      if (d < seedD[o]) [seedD[o], seed[o]] = [d, i];
    }
    if (!any) break;
    for (const s of seed)
      if (s >= 0) {
        dist[s] = 0;
        queue[tail++] = s;
      }
    spread();
  }
  // each owner's gains take the same time to fill, however big they are
  const far = new Float32Array(nB);
  for (let i = 0; i < n; i++) if (dist[i] > far[b[i]]) far[b[i]] = dist[i];
  const flip = new Float32Array(n);
  for (let i = 0; i < n; i++) flip[i] = stable(i) ? 0 : dist[i] < 0 ? 1 : (dist[i] + 1) / (far[b[i]] + 1);
  return { w, h, a, b, flip, pred, succ };
}

/**
 * Paints the map `e` of the way through the change (0 old, 1 new). colA/colB are rgb triples per owner; a cell takes
 * its new owner's colour once it has flipped, and every colour eases from the old shape's to the new one's on the way.
 */
export function paintMorph(p: MorphPlan, e: number, colA: Uint8Array, colB: Uint8Array, border: [number, number, number, number], out: Uint8ClampedArray) {
  const { w, h, a, b, flip, pred, succ } = p;
  const n = w * h;
  // which shape each cell shows right now, named by its new owner, so no border shows inside a shape that is growing
  const id = new Int32Array(n);
  for (let i = 0; i < n; i++) id[i] = e >= flip[i] ? b[i] : succ[a[i]];
  const [br, bg, bb, ba] = border;
  for (let i = 0, o = 0; i < n; i++, o += 4) {
    const flipped = e >= flip[i];
    const from = (flipped ? pred[b[i]] : a[i]) * 3;
    const to = (flipped ? b[i] : succ[a[i]]) * 3;
    let r = colA[from] + (colB[to] - colA[from]) * e;
    let g = colA[from + 1] + (colB[to + 1] - colA[from + 1]) * e;
    let bl = colA[from + 2] + (colB[to + 2] - colA[from + 2]) * e;
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
}
