// Smooth era changes: the border sweep. For two seconds after the timeline moves, the map shows the new era's own
// drawing, with the old era's drawing still showing wherever the moving border hasn't reached yet, and the moving border
// drawn as a line between the two. Only borders move: colours, line styles, lakes and names come from each era's normal
// drawing, so the map looks exactly like the old era at the start and exactly like the new one at the end.
//
// It is worked out on a grid of screen cells, a few pixels each, for the current view:
// - who owns each cell before and after (fillRings);
// - which new country carries on which old one (planSweep): the same look on the map (colour and dispute hatching) and
//   the same name or most of the smaller one's land. Colours already follow each country through every era, decided on
//   the whole world (scripts/lib/colors.mjs), so a country that carries on never changes colour, and the land it keeps
//   stays put. Matching on the part on screen alone made Poland the "successor" of the Russian Empire;
// - when each cell changes hands: a country spreads into the land it gains from the land it keeps, so its border sweeps
//   outward. A new country sweeps in from one side, never from every edge at once: from its border with whoever carries
//   on the country it takes most land from (Ukraine from Soviet Russia), else from its longest border with a country
//   that carries on;
// - and, each frame, the outline of the land still showing the old era and the moving border lines (sweepFrame).
// Pure functions, no DOM.
import type { Position } from "geojson";

/** How long borders take to sweep into a new era. */
export const SWEEP_MS = 2000;
/** The most grid cells a sweep is worked out on (a cell is at least 2 CSS pixels). */
export const SWEEP_CELLS = 160_000;

export type Owner = {
  /** how it looks on the map: fill colour plus dispute hatching */ look: string;
  /** name ("" for land the source leaves blank) */ name: string;
  /** its outline: 0 none, 1 faint dashes (blank land), 2 dashes (approximate border), 3 solid */ line: number;
};

export type SweepPlan = {
  gw: number;
  gh: number;
  /** owner of each cell before and after (0: sea or lake) */ a: Int32Array;
  b: Int32Array;
  /** the new owner carrying on each old owner, and the old owner each new owner carries on (0: none) */
  carriedBy: Int32Array;
  carries: Int32Array;
  /** when each cell switches to the new era, 0–1 (land changing hands and the cells just around it; elsewhere 0) */
  when: Float32Array;
  /** 1 where land changes hands */ changing: Uint8Array;
  /** the new owner whose moving border can be drawn through a cell (0: none) */ front: Int32Array;
  /** style of the moving border through a cell (see Owner.line) */ style: Uint8Array;
  /** every cell that ever shows the old era lies in this box (x0, y0, x1, y1), or null when no land changes hands */
  box: [number, number, number, number] | null;
};

const RAD = Math.PI / 180;
const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (Math.max(-85, Math.min(85, lat)) * RAD) / 2));

// the eight neighbours of a cell; steps cost 5 straight and 7 diagonally (≈ 1 : √2), so fronts move out in
// near-circles rather than squares
const DX = [-1, 1, 0, 0, -1, 1, -1, 1];
const DY = [0, 0, -1, 1, -1, -1, 1, 1];
const COST = [5, 5, 5, 5, 7, 7, 7, 7];

/**
 * A ring of lon/lat points in grid cells (`cs` pixels each), on a Mercator map at scale `k` with longitude `lon0` and the
 * equator at (cx, cy) in pixels. Longitudes are unwrapped along the ring, so a ring crossing the far side of the world
 * stays in one piece; it may then run past ±180°, so fill it once for each copy of the world on screen.
 */
export function projectRing(ring: Position[], lon0: number, k: number, cx: number, cy: number, cs: number) {
  const pts = new Float64Array(ring.length * 2);
  let lon = ((((ring[0][0] - lon0 + 180) % 360) + 360) % 360) - 180;
  let minX = Infinity;
  let maxX = -Infinity;
  for (let i = 0; i < ring.length; i++) {
    if (i) {
      let d = ring[i][0] - ring[i - 1][0];
      if (d > 180) d -= 360;
      else if (d < -180) d += 360;
      lon += d;
    }
    const x = (cx + k * lon * RAD) / cs;
    pts[2 * i] = x;
    pts[2 * i + 1] = (cy - k * mercY(ring[i][1])) / cs;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  return { pts, minX, maxX };
}

/**
 * Writes `id` into every cell of `grid` (gw × gh) whose centre the rings cover, moved `dx` cells sideways. Even-odd, so
 * holes keep whatever was under them, like a canvas fill.
 */
export function fillRings(grid: Int32Array, gw: number, gh: number, rings: Float64Array[], id: number, dx = 0) {
  // the edges that cross at least one row of cell centres (y + 0.5): first row, end row, x on the first row, slope
  let ne = 0;
  for (const r of rings) ne += r.length / 2;
  const r0 = new Int32Array(ne);
  const r1 = new Int32Array(ne);
  const x0 = new Float64Array(ne);
  const slope = new Float64Array(ne);
  let m = 0;
  let top = gh;
  let bottom = 0;
  for (const r of rings) {
    const n = r.length / 2;
    for (let i = 0; i < n; i++) {
      const j = i + 1 < n ? i + 1 : 0;
      const ya = r[2 * i + 1];
      const yb = r[2 * j + 1];
      if (ya === yb) continue;
      const lo = ya < yb ? ya : yb;
      const hi = ya < yb ? yb : ya;
      const s = Math.max(0, Math.ceil(lo - 0.5));
      const e = Math.min(gh, Math.ceil(hi - 0.5));
      if (s >= e) continue;
      const sl = (r[2 * j] - r[2 * i]) / (yb - ya);
      r0[m] = s;
      r1[m] = e;
      slope[m] = sl;
      x0[m] = r[2 * i] + (s + 0.5 - ya) * sl + dx;
      if (s < top) top = s;
      if (e > bottom) bottom = e;
      m++;
    }
  }
  if (!m) return;
  const order = Array.from({ length: m }, (_, i) => i).sort((p, q) => r0[p] - r0[q]);
  const active: number[] = [];
  const xs = new Float64Array(m);
  let next = 0;
  for (let y = top; y < bottom; y++) {
    while (next < m && r0[order[next]] <= y) active.push(order[next++]);
    let c = 0;
    for (let k = 0; k < active.length; k++) {
      const e = active[k];
      if (r1[e] <= y) {
        active[k--] = active[active.length - 1];
        active.pop();
        continue;
      }
      xs[c++] = x0[e] + (y - r0[e]) * slope[e];
    }
    if (c < 2) continue;
    const row = xs.subarray(0, c).sort();
    const base = y * gw;
    for (let k = 0; k + 1 < c; k += 2) {
      const xa = Math.max(0, Math.ceil(row[k] - 0.5));
      const xb = Math.min(gw, Math.ceil(row[k + 1] - 0.5));
      if (xa < xb) grid.fill(id, base + xa, base + xb);
    }
  }
}

/** Works out a sweep from the owner grid `a` (owners `ownA`, 0 = sea) to `b` (owners `ownB`). */
export function planSweep(a: Int32Array, b: Int32Array, ownA: Owner[], ownB: Owner[], gw: number, gh: number): SweepPlan {
  const n = gw * gh;
  const NA = ownA.length;
  const NB = ownB.length;

  // how much land each old and new owner have, and share, in cells
  const cntA = new Int32Array(NA);
  const cntB = new Int32Array(NB);
  const shared = new Map<number, number>();
  let key = -1;
  let run = 0;
  for (let i = 0; i < n; i++) {
    cntA[a[i]]++;
    cntB[b[i]]++;
    const k = a[i] && b[i] ? a[i] * NB + b[i] : -1;
    if (k !== key) {
      if (key >= 0) shared.set(key, (shared.get(key) ?? 0) + run);
      key = k;
      run = 0;
    }
    run++;
  }
  if (key >= 0) shared.set(key, (shared.get(key) ?? 0) + run);

  // which new owner carries on which old one: the same look, and the same name or most of the smaller one's land
  const carriedBy = new Int32Array(NA);
  const carries = new Int32Array(NB);
  const pred = new Int32Array(NB); // the old owner each new owner takes most land from
  const predCells = new Int32Array(NB);
  const pairs: [number, number, number, number][] = [];
  for (const [k, cells] of shared) {
    const i = Math.floor(k / NB);
    const j = k - i * NB;
    if (cells > predCells[j]) {
      predCells[j] = cells;
      pred[j] = i;
    }
    if (ownA[i].look !== ownB[j].look) continue;
    const sameName = ownA[i].name !== "" && ownA[i].name === ownB[j].name;
    if (sameName || cells * 2 >= Math.min(cntA[i], cntB[j])) pairs.push([sameName ? 1 : 0, cells, i, j]);
  }
  pairs.sort((p, q) => q[0] - p[0] || q[1] - p[1]);
  for (const [, , i, j] of pairs)
    if (!carriedBy[i] && !carries[j]) {
      carriedBy[i] = j;
      carries[j] = i;
    }

  // land kept by the country carrying it on, and land changing hands; sea, lakes and coasts the two sources draw
  // differently are neither (they show as in the new era)
  const changing = new Uint8Array(n);
  const kept = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!a[i] || !b[i]) continue;
    if (carriedBy[a[i]] === b[i]) kept[i] = 1;
    else changing[i] = 1;
  }

  // how far each changing cell is from where its new owner's border sets off, spreading through the new owner's land only
  const UNSET = 0x7fffffff;
  const dist = new Int32Array(n).fill(UNSET);
  let buckets: number[][] = [];
  const reach = (i: number, d: number) => {
    dist[i] = d;
    (buckets[d] ??= []).push(i);
  };
  const spread = () => {
    for (let d = 0; d < buckets.length; d++) {
      const q = buckets[d];
      if (!q) continue;
      for (let qi = 0; qi < q.length; qi++) {
        const i = q[qi];
        if (dist[i] !== d) continue;
        const x = i % gw;
        const y = (i - x) / gw;
        for (let s = 0; s < 8; s++) {
          const nx = x + DX[s];
          const ny = y + DY[s];
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const p = ny * gw + nx;
          if (changing[p] && b[p] === b[i] && dist[p] > d + COST[s]) reach(p, d + COST[s]);
        }
      }
    }
    buckets = [];
  };
  /** Starts every unreached changing cell next to a cell `ok` accepts, one step from it. Returns the owners started. */
  const startNextTo = (ok: (owner: number, neighbour: number, p: number) => boolean) => {
    const started = new Uint8Array(NB);
    for (let i = 0; i < n; i++) {
      if (!changing[i] || dist[i] !== UNSET) continue;
      const x = i % gw;
      const y = (i - x) / gw;
      let best = UNSET;
      for (let s = 0; s < 8; s++) {
        const nx = x + DX[s];
        const ny = y + DY[s];
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const p = ny * gw + nx;
        if (COST[s] < best && ok(b[i], b[p], p)) best = COST[s];
      }
      if (best !== UNSET) {
        reach(i, best);
        started[b[i]] = 1;
      }
    }
    return started;
  };

  // 1. a country spreads into the land it gains from the land it keeps
  startNextTo((owner, q, p) => kept[p] === 1 && q === owner);
  spread();

  // 2. a new country, or land a country gains away from what it keeps, sweeps in from one side: its border with one
  // neighbour, never every edge at once (that leaves a ring of the old country). The neighbour is whoever carries on the
  // country it takes most land from (Ukraine from Soviet Russia), else the country that carries on with the longest
  // border, else any neighbour with the longest border; a piece with no land border sweeps in from its west side.
  const carrier = new Int32Array(NB);
  for (let j = 1; j < NB; j++) {
    const c = pred[j] ? carriedBy[pred[j]] : 0;
    carrier[j] = c !== j ? c : 0;
  }
  for (let pass = 0; pass < 40; pass++) {
    // borders of the land still to reach, per owner and neighbour
    const border = new Map<number, number>();
    let left = false;
    for (let i = 0; i < n; i++) {
      if (!changing[i] || dist[i] !== UNSET) continue;
      left = true;
      const x = i % gw;
      const y = (i - x) / gw;
      for (let s = 0; s < 4; s++) {
        const nx = x + DX[s];
        const ny = y + DY[s];
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const q = b[ny * gw + nx];
        if (q && q !== b[i]) border.set(b[i] * NB + q, (border.get(b[i] * NB + q) ?? 0) + 1);
      }
    }
    if (!left) break;
    const pick = new Int32Array(NB);
    const rank = new Int32Array(NB);
    const len = new Int32Array(NB);
    for (const [k, cells] of border) {
      const j = Math.floor(k / NB);
      const q = k - j * NB;
      const r = q === carrier[j] ? 3 : carries[q] ? 2 : 1;
      if (r > rank[j] || (r === rank[j] && cells > len[j])) {
        rank[j] = r;
        len[j] = cells;
        pick[j] = q;
      }
    }
    // the cells next to the picked neighbour, and the middle of each owner's land still to reach and of those cells
    const cand: number[] = [];
    const sum = new Float64Array(NB * 6);
    for (let i = 0; i < n; i++) {
      if (!changing[i] || dist[i] !== UNSET) continue;
      const j = b[i];
      const x = i % gw;
      const y = (i - x) / gw;
      sum[j * 6] += x;
      sum[j * 6 + 1] += y;
      sum[j * 6 + 2]++;
      if (!pick[j]) continue;
      let best = UNSET;
      for (let s = 0; s < 8; s++) {
        const nx = x + DX[s];
        const ny = y + DY[s];
        if (nx >= 0 && ny >= 0 && nx < gw && ny < gh && b[ny * gw + nx] === pick[j] && COST[s] < best) best = COST[s];
      }
      if (best === UNSET) continue;
      cand.push(i, best);
      sum[j * 6 + 3] += x;
      sum[j * 6 + 4] += y;
      sum[j * 6 + 5]++;
    }
    // Starting cells all round a piece (a new colony inside unclaimed land) would close in like a ring: such a piece
    // sweeps across from its west side instead.
    const round = new Float64Array(NB);
    for (let c = 0; c < cand.length; c += 2) {
      const j = b[cand[c]];
      const x = cand[c] % gw;
      round[j] += Math.hypot(x - sum[j * 6] / sum[j * 6 + 2], (cand[c] - x) / gw - sum[j * 6 + 1] / sum[j * 6 + 2]);
    }
    const ringed = new Uint8Array(NB);
    const westMost = new Float64Array(NB);
    for (let j = 1; j < NB; j++) {
      const k = sum[j * 6 + 5];
      if (!k) continue;
      const off = Math.hypot(sum[j * 6 + 3] / k - sum[j * 6] / sum[j * 6 + 2], sum[j * 6 + 4] / k - sum[j * 6 + 1] / sum[j * 6 + 2]);
      ringed[j] = off < 0.3 * (round[j] / k) ? 1 : 0;
    }
    for (let c = 0; c < cand.length; c += 2) {
      const j = b[cand[c]];
      if (ringed[j]) westMost[j] = Math.max(westMost[j], sum[j * 6] / sum[j * 6 + 2] - (cand[c] % gw));
    }
    const started = new Uint8Array(NB);
    for (let c = 0; c < cand.length; c += 2) {
      const i = cand[c];
      const j = b[i];
      if (ringed[j] && westMost[j] > 0 && sum[j * 6] / sum[j * 6 + 2] - (i % gw) < 0.7 * westMost[j]) continue;
      reach(i, cand[c + 1]);
      started[j] = 1;
    }
    const west: number[] = [];
    for (let i = 0; i < n; i++) {
      if (!changing[i] || dist[i] !== UNSET || started[b[i]]) continue;
      const w = i - 1;
      if (i % gw === 0 || !(changing[w] && b[w] === b[i] && dist[w] === UNSET)) west.push(i);
    }
    for (const i of west) reach(i, 0);
    spread();
  }

  // when each cell switches: each country's sweep takes the whole time, however far it goes
  const far = new Int32Array(NB);
  for (let i = 0; i < n; i++) if (changing[i] && dist[i] !== UNSET && dist[i] > far[b[i]]) far[b[i]] = dist[i];
  const when = new Float32Array(n);
  for (let i = 0; i < n; i++) if (changing[i]) when[i] = dist[i] === UNSET ? 0.5 : 0.02 + (0.98 * dist[i]) / (far[b[i]] || 1);

  // Around land changing hands, the cells next to it switch with it, so the outline of what still shows the old era
  // never cuts into that land early. The gaining country's own land switches at once instead: the old border there has
  // to go as soon as the sweep sets off. Two cells deep is enough; further out both eras look the same.
  const front = new Int32Array(n);
  const style = new Uint8Array(n);
  const from = new Int32Array(n).fill(-1);
  let ring: number[] = [];
  for (let i = 0; i < n; i++) {
    if (!changing[i]) continue;
    from[i] = i;
    front[i] = b[i];
    style[i] = Math.max(ownA[a[i]].line, ownB[b[i]].line);
    ring.push(i);
  }
  for (let step = 0; step < 2; step++) {
    const next: number[] = [];
    for (const i of ring) {
      const x = i % gw;
      const y = (i - x) / gw;
      const src = from[i];
      for (let s = 0; s < 8; s++) {
        const nx = x + DX[s];
        const ny = y + DY[s];
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const p = ny * gw + nx;
        if (from[p] !== -1) continue;
        from[p] = src;
        if (kept[p] && b[p] === b[src]) front[p] = b[p];
        else when[p] = when[src];
        next.push(p);
      }
    }
    ring = next;
  }
  let bx0 = gw;
  let by0 = gh;
  let bx1 = -1;
  let by1 = -1;
  for (let i = 0; i < n; i++) {
    if (from[i] === -1) continue;
    const x = i % gw;
    const y = (i - x) / gw;
    if (x < bx0) bx0 = x;
    if (x > bx1) bx1 = x;
    if (y < by0) by0 = y;
    if (y > by1) by1 = y;
  }
  const box: SweepPlan["box"] = bx1 >= 0 ? [bx0, by0, bx1, by1] : null;
  return { gw, gh, a, b, carriedBy, carries, when, changing, front, style, box };
}

/** Where a sweep frame's outline goes: a canvas Path2D, only ever filled or clipped. */
export type PathSink = {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  rect(x: number, y: number, w: number, h: number): void;
};

export type FrontLine = { style: number; pts: number[] };

/**
 * One frame of a sweep at time t (0–1, eased): adds to `area` the outline of the land still showing the old era (cells
 * whose switch time is after t), traced between cell centres so the moving edge is smooth, and returns the moving border
 * lines along it, in pixels (`cs` per cell).
 */
export function sweepFrame(p: SweepPlan, t: number, cs: number, area: PathSink): FrontLine[] {
  if (!p.box) return [];
  const { gw, gh, when, front, changing, style } = p;
  const W = gw + 2;
  // corners sit on cell centres: corner (X, Y) is cell (X - 1, Y - 1), and the cells along the screen edge repeat
  // outward so the outline reaches the edge
  const cell = (X: number, Y: number) => Math.min(gh - 1, Math.max(0, Y - 1)) * gw + Math.min(gw - 1, Math.max(0, X - 1));
  const [bx0, by0, bx1, by1] = p.box;
  // pieces of moving border: edge ids of both ends, both ends, style
  const segs: number[] = [];
  const px = new Float64Array(8);
  const py = new Float64Array(8);
  const pid = new Int32Array(8); // edge id where the outline crosses, or -1 for a corner
  for (let Y = by0; Y <= by1 + 1; Y++) {
    let run = -1;
    const T = (Y - 0.5) * cs;
    const B = (Y + 0.5) * cs;
    for (let X = bx0; X <= bx1 + 2; X++) {
      const c0 = cell(X, Y);
      const c1 = cell(X + 1, Y);
      const c2 = cell(X + 1, Y + 1);
      const c3 = cell(X, Y + 1);
      const v0 = when[c0];
      const v1 = when[c1];
      const v2 = when[c2];
      const v3 = when[c3];
      const in0 = v0 > t;
      const in1 = v1 > t;
      const in2 = v2 > t;
      const in3 = v3 > t;
      const full = X <= bx1 + 1 && in0 && in1 && in2 && in3;
      if (full) {
        if (run < 0) run = X;
        continue;
      }
      if (run >= 0) {
        area.rect((run - 0.5) * cs, T, (X - run) * cs, cs);
        run = -1;
      }
      if (X > bx1 + 1 || !(in0 || in1 || in2 || in3)) continue;
      // a square the outline crosses: walk its corners clockwise, keeping those inside and the points where its edges
      // cross t (worked out left to right and top to bottom, so neighbouring squares agree exactly)
      const L = (X - 0.5) * cs;
      const R = (X + 0.5) * cs;
      let k = 0;
      const corner = (x: number, y: number) => {
        px[k] = x;
        py[k] = y;
        pid[k++] = -1;
      };
      const cross = (x: number, y: number, id: number) => {
        px[k] = x;
        py[k] = y;
        pid[k++] = id;
      };
      if (in0) corner(L, T);
      if (in0 !== in1) cross(L + ((t - v0) / (v1 - v0)) * cs, T, (Y * W + X) * 2);
      if (in1) corner(R, T);
      if (in1 !== in2) cross(R, T + ((t - v1) / (v2 - v1)) * cs, (Y * W + X + 1) * 2 + 1);
      if (in2) corner(R, B);
      if (in2 !== in3) cross(L + ((t - v3) / (v2 - v3)) * cs, B, ((Y + 1) * W + X) * 2);
      if (in3) corner(L, B);
      if (in3 !== in0) cross(L, T + ((t - v0) / (v3 - v0)) * cs, (Y * W + X) * 2 + 1);
      // left open: a fill or clip closes each piece itself, and in Chrome each closePath takes longer the more the path
      // already holds, which made frames with a long moving border take 60–150 ms to draw
      area.moveTo(px[0], py[0]);
      for (let q = 1; q < k; q++) area.lineTo(px[q], py[q]);
      // the moving border runs between two crossings in a row, where all four cells belong to the same gaining country
      const o = front[c0];
      if (!o || front[c1] !== o || front[c2] !== o || front[c3] !== o) continue;
      const ch = changing[c0] ? c0 : changing[c1] ? c1 : changing[c2] ? c2 : changing[c3] ? c3 : -1;
      if (ch < 0) continue;
      for (let q = 0; q < k; q++) {
        const r = (q + 1) % k;
        if (pid[q] >= 0 && pid[r] >= 0) segs.push(pid[q], pid[r], px[q], py[q], px[r], py[r], style[ch]);
      }
    }
  }

  // join the pieces into lines, so dashes run on along them
  const S = 7;
  const nseg = segs.length / S;
  const ends = new Map<number, number[]>();
  for (let s = 0; s < nseg; s++)
    for (const id of [segs[s * S], segs[s * S + 1]]) {
      const list = ends.get(id);
      if (list) list.push(s);
      else ends.set(id, [s]);
    }
  const used = new Uint8Array(nseg);
  const lines: FrontLine[] = [];
  /** Follows the line from segment `s` through its end on edge `id`, adding the points it passes. */
  const follow = (s: number, id: number, out: number[]) => {
    for (;;) {
      let q = -1;
      for (const c of ends.get(id)!) if (c !== s && !used[c] && segs[c * S + 6] === segs[s * S + 6]) q = c;
      if (q < 0) return;
      used[q] = 1;
      const atA = segs[q * S] === id;
      out.push(atA ? segs[q * S + 4] : segs[q * S + 2], atA ? segs[q * S + 5] : segs[q * S + 3]);
      id = atA ? segs[q * S + 1] : segs[q * S];
      s = q;
    }
  };
  for (let s = 0; s < nseg; s++) {
    if (used[s]) continue;
    used[s] = 1;
    const ahead = [segs[s * S + 2], segs[s * S + 3], segs[s * S + 4], segs[s * S + 5]];
    follow(s, segs[s * S + 1], ahead);
    const behind: number[] = [];
    follow(s, segs[s * S], behind);
    const pts: number[] = [];
    for (let q = behind.length - 2; q >= 0; q -= 2) pts.push(behind[q], behind[q + 1]);
    lines.push({ style: segs[s * S + 6], pts: pts.concat(ahead) });
  }
  return lines;
}

/**
 * Adds to `area`, as rectangles in pixels (`cs` per cell), the cells along every coast of either era and wherever only
 * one era has land: the two sources draw coasts a little differently, and one may leave land out. One cell wider all
 * round, so the old coastline's edge is covered too. The old era blends into the new one there as the sweep starts,
 * instead of vanishing on its first frame. Land the moving border reaches (and the cells switching with it) is left to the border, so no old
 * colour lingers behind it. Returns false when there are none.
 */
export function landDiffers(p: SweepPlan, cs: number, area: PathSink) {
  const { gw, gh, a, b, when, front } = p;
  const free = (i: number) => when[i] === 0 && front[i] === 0;
  const mark = new Uint8Array(gw * gh);
  let any = false;
  for (let y = 0, i = 0; y < gh; y++)
    for (let x = 0; x < gw; x++, i++) {
      if (!free(i)) continue;
      // land in one era only, or land and sea side by side in either
      let seed = !a[i] !== !b[i];
      if (!seed && x + 1 < gw) seed = !a[i] !== !a[i + 1] || !b[i] !== !b[i + 1];
      if (!seed && y + 1 < gh) seed = !a[i] !== !a[i + gw] || !b[i] !== !b[i + gw];
      if (!seed) continue;
      any = true;
      for (let ny = Math.max(0, y - 1); ny <= Math.min(gh - 1, y + 1); ny++)
        for (let nx = Math.max(0, x - 1); nx <= Math.min(gw - 1, x + 1); nx++) if (free(ny * gw + nx)) mark[ny * gw + nx] = 1;
    }
  if (!any) return false;
  for (let y = 0; y < gh; y++) {
    let run = -1;
    for (let x = 0; x <= gw; x++) {
      const on = x < gw && mark[y * gw + x] === 1;
      if (on && run < 0) run = x;
      else if (!on && run >= 0) {
        area.rect(run * cs, y * cs, (x - run) * cs, cs);
        run = -1;
      }
    }
  }
  return true;
}

/**
 * Where each code shows at time t, per copy of the world (`copyOf` per grid column), six numbers each: the sums of x and
 * y and the number of cells showing it, then the same for just the cells it keeps at the end. A code is the new owner a
 * cell shows, or for old land the border hasn't reached, the new owner carrying its old owner on, or for an old country
 * nothing carries on, the number of new owners plus its own. Names follow these.
 */
export function shownSums(p: SweepPlan, t: number, wanted: Uint8Array, copyOf: Uint8Array, copies: number) {
  const out = new Float64Array(wanted.length * copies * 6);
  const NB = p.carries.length;
  for (let y = 0, i = 0; y < p.gh; y++)
    for (let x = 0; x < p.gw; x++, i++) {
      let code;
      if (p.when[i] <= t) code = p.b[i];
      else code = p.a[i] ? p.carriedBy[p.a[i]] || NB + p.a[i] : 0;
      if (!code || !wanted[code]) continue;
      const o = (code * copies + copyOf[x]) * 6;
      out[o] += x;
      out[o + 1] += y;
      out[o + 2]++;
      if (p.b[i] !== code) continue;
      out[o + 3] += x;
      out[o + 4] += y;
      out[o + 5]++;
    }
  return out;
}
