// Canvas map engine: draws the era basemap + draggable real-size overlays, handles pan/zoom/drag.
// Framework-free on purpose so dragging stays at 60fps; React talks to it through a few setters and callbacks.
import { geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import type { MultiLineString, MultiPolygon, Position } from "geojson";
import { featureAtIn, type Lake, type Layer, type PolityFeature, type PolityProps } from "@/lib/data";
import {
  type LonLat,
  type View,
  clampView,
  latFromMercY,
  mercY,
  minScale,
  normLon,
  panBy,
  placeGeometry,
  projectionFor,
  zoomAt,
  mercatorInflation,
  EARTH_RADIUS_KM,
} from "@/lib/geo";
import { SWEEP_CELLS, SWEEP_MS, type Owner, type SweepPlan, fillRings, planSweep, projectRing, shownSums, sweepFrame } from "./sweep";


export type Overlay = {
  id: string;
  /** data name */ name: string;
  /** source layer key: era key or "us" */ era: string;
  color: number;
  origin: LonLat;
  lon: number;
  lat: number;
  rot: number;
  moved: boolean;
  geom: MultiPolygon;
  hiddenParts: number;
  /** built from a shape cut into slices around a pole: fill only, an outline would show the cuts */
  sliced?: boolean;
  /** area of the drawn geometry (far-off parts excluded) */ km2: number;
  props: PolityProps;
};

/** A shaded wedge on the map, e.g. one country's Antarctic claim. */
export type ClaimShape = { id: string; label: string; color: string; geom: MultiPolygon; at: LonLat };

export type EngineCallbacks = {
  onSelect: (id: string | null) => void;
  onOverlayMove: (id: string, lon: number, lat: number, done: boolean) => void;
  onRemove: (id: string) => void;
  onMapClick: (at: LonLat, feature: PolityFeature | null) => void;
  onViewChange: (view: View) => void;
};

import { PALETTE, POLITICAL } from "@/lib/palette";
export { PALETTE, POLITICAL };

const COLORS = {
  ocean: "#9FCBE0",
  offMap: "#FBF6EE", // the thin bars above and below the world when zoomed all the way out
  land: "#EFE3C8", // land the source leaves unclaimed or unmapped
  border: "rgba(88, 60, 46, 0.6)",
  borderSoft: "rgba(88, 60, 46, 0.25)",
  stateLine: "rgba(88, 60, 46, 0.32)",
  equator: "rgba(122, 62, 30, 0.5)",
  graticule: "rgba(60, 50, 40, 0.08)",
  label: "#3A2C24",
  halo: "rgba(255, 250, 240, 0.9)",
  dispute: "#B4235A",
};

const RAD = Math.PI / 180;
// The cached world is cut at 168.5°W, in the Bering Strait between Russia and Alaska, so no country is split by the cut.
const CUT_CENTER = 11.5;

/** Overlap between neighbouring tiles, in pixels, so no hairline seams show where they meet. */
const TILE_PAD = 2;

/** Everything needed to draw the world at one zoom level: shape boxes, outlines made on demand and bitmap tiles. */
type BaseCache = {
  /** the era it draws */ layer: Layer | null;
  /** zoom (scale) the cache is for */ k: number;
  dpr: number;
  proj: ReturnType<typeof geoMercator>;
  /** tile edge in CSS pixels */ size: number;
  shapes: { f: PolityFeature; fill: string; box: [number, number, number, number] }[];
  claims: { c: ClaimShape; box: [number, number, number, number]; p2d?: Path2D }[];
  lakes: { l: Lake; box: [number, number, number, number]; p2d?: Path2D }[];
  paths: Map<PolityFeature, Path2D>;
  /** the outlines to stroke (see seamlessOutline), made on demand */ outlines: Map<PolityFeature, Path2D>;
  /** state lines: undefined until first needed, null when not shown at this zoom */
  states: { mesh: Path2D; clip: Path2D } | null | undefined;
  /** "col,row" → bitmap, least recently used first */ tiles: Map<string, HTMLCanvasElement>;
  /** how many tiles to keep */ keep: number;
};

/** A name on the map: where it goes and how it is drawn, plus the shape it names and how big that is on screen. */
type LabelItem = { text: string; p: [number, number]; size: number; weight: number; tw: number; f?: PolityFeature; sizePx?: number };

/** An era change in progress (see sweep.ts), worked out for one view and moved with the map if it moves meanwhile. */
type Sweep = {
  start: number;
  /** the view it was worked out for: its grid, old picture and names are in that view's pixels */ view: View;
  plan: SweepPlan;
  /** grid cell size, CSS pixels */ cs: number;
  /** the old era's land, borders and lakes as they were on screen (no names) */ old: HTMLCanvasElement;
  from: Layer;
  /** the shape behind each owner number on the grid, old and new (0: sea) */ ownersA: (PolityFeature | null)[];
  ownersB: (PolityFeature | null)[];
  /** the old era's highlighted country, shown until halfway */ fromHighlight: PolityFeature | null;
  /** names moving with their countries, worked out on the first frame */ labels: SweepLabels | null;
  /** at a steady pace (the timeline playing on into the next era), not easing in and out */ steady: boolean;
};

/** A name that follows its country through a sweep, in one copy of the world. */
type SweepLabel = {
  /** what it follows (see shownSums) */ code: number;
  /** for a new country taking an old one's name (Egypt changing hands): the old one's code, followed until halfway */
  from?: number;
  copy: number;
  /** the name as placed on the old and the new map */ old?: LabelItem;
  neu?: LabelItem;
  /** the middle of what it follows at the start and the end, and how many cells that was */ c0?: [number, number];
  c1?: [number, number];
  n0: number;
  n1: number;
};
type SweepLabels = {
  tracks: SweepLabel[];
  /** codes followed, and the copy of the world each grid column is in */ wanted: Uint8Array;
  copyOf: Uint8Array;
  /** names with no shape on the grid (US states), the old map's until halfway and the new map's after */ staticOld: LabelItem[];
  staticNew: LabelItem[];
};
/** Copies of the world a sweep's names keep apart (only a few are ever on screen), and the slot of the main one. */
const COPIES = 16;
const COPY0 = 8;

function hashIndex(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % POLITICAL.length;
}

/** Whether the edge a–b runs along the 180° meridian. */
const onSeam = (a: Position, b: Position) => Math.abs(a[0]) > 179.999 && Math.abs(b[0]) > 179.999 && Math.sign(a[0]) === Math.sign(b[0]);

/**
 * A shape's outline without its cuts along the 180° meridian. The source splits shapes that cross it (Chukotka, Fiji,
 * Russia), and stroking the cut draws a line through the land. `drawn` is the shape as drawn (moved and turned, for a
 * dragged one). Null when there is no cut, so the polygon itself can be stroked.
 */
function seamlessOutline(source: MultiPolygon, drawn: MultiPolygon = source): MultiLineString | null {
  const lines: Position[][] = [];
  let cut = false;
  source.coordinates.forEach((poly, p) =>
    poly.forEach((ring, r) => {
      const pts = drawn.coordinates[p][r];
      let run: Position[] = [pts[0]];
      for (let k = 1; k < ring.length; k++) {
        if (!onSeam(ring[k - 1], ring[k])) {
          run.push(pts[k]);
          continue;
        }
        cut = true;
        if (run.length > 1) lines.push(run);
        run = [pts[k]];
      }
      if (run.length > 1) lines.push(run);
    }),
  );
  return cut ? { type: "MultiLineString", coordinates: lines } : null;
}

/** A shape's fill on the base map. */
function fillFor(f: PolityFeature) {
  return f.props.n ? POLITICAL[f.props.k ?? hashIndex(f.props.s || f.props.n)] : COLORS.land;
}

/** How a shape looks to the border sweep: land that keeps its look keeps its place. */
function ownerOf(f: PolityFeature | null): Owner {
  if (!f) return { look: "", name: "", line: 0 };
  const line = f.props.m || f.sliced ? 0 : !f.props.n ? 1 : f.props.b >= 2 ? 3 : 2;
  return { look: fillFor(f) + (f.props.d ? "/hatched" : ""), name: f.props.n, line };
}

function hexToRgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export class MapEngine {
  private container: HTMLElement;
  private base: HTMLCanvasElement;
  private top: HTMLCanvasElement;
  private bctx: CanvasRenderingContext2D;
  private tctx: CanvasRenderingContext2D;
  private cb: EngineCallbacks;
  private w = 0;
  private h = 0;
  private dpr = 1;
  view: View = { lon: 10, y: mercY(25), k: 150 };

  private layer: Layer | null = null;
  private states: Layer | null = null;
  private labels = true;
  private claims: ClaimShape[] = [];
  private lakes: Lake[] = [];
  private highlight: string | null = null;
  private pin: LonLat | null = null;

  private overlays: Overlay[] = [];
  private selected: string | null = null;
  private placedCache = new Map<string, MultiPolygon>();
  private paths = new Map<string, Path2D>();
  private patterns = new Map<string, CanvasPattern | null>();

  private baseDirty = true;
  // Converting ~250 shapes to screen points every frame made phones stutter while panning. They are converted once per
  // zoom level instead (see BaseCache); panning only moves them, so every frame is a complete, exact drawing.
  private cache: BaseCache | null = null;
  /** the border sweep into the era just shown, while it runs */
  private sweep: Sweep | null = null;
  /** while the timeline plays on through the eras: the next sweep runs at a steady pace, straight on from the last */
  private steady = false;
  /** reused for the old era's picture in each sweep */
  private sweepCanvas: HTMLCanvasElement | null = null;
  private tilePool: HTMLCanvasElement[] = [];
  private prefetchTimer = 0;
  private lastViewChange = 0;
  private settleTimer = 0;
  private topDirty = true;
  private raf = 0;
  private ro: ResizeObserver;
  private pointers = new Map<number, { x: number; y: number }>();
  private gesture:
    | { kind: "pan"; startX: number; startY: number; lastX: number; lastY: number; moved: boolean; t: number }
    | { kind: "drag"; id: string; startX: number; startY: number; anchorPx: [number, number]; moved: boolean }
    | { kind: "pinch"; dist: number; midX: number; midY: number }
    | null = null;
  private flight = 0;
  private lastMoveEmit = 0;
  /**
   * Edge scrolling: with the mouse resting near a screen edge (or dragging a shape there), the map scrolls that way.
   * pointerAt is the drag position; hoverAt is the mouse position when nothing is pressed, with the time it reached the edge.
   */
  private edgeRaf = 0;
  private pointerAt: { x: number; y: number } | null = null;
  private hoverAt: { x: number; y: number; since: number } | null = null;

  constructor(container: HTMLElement, cb: EngineCallbacks) {
    this.container = container;
    this.cb = cb;
    this.base = document.createElement("canvas");
    this.top = document.createElement("canvas");
    for (const c of [this.base, this.top]) {
      c.style.position = "absolute";
      c.style.inset = "0";
      c.style.width = "100%";
      c.style.height = "100%";
      container.appendChild(c);
    }
    this.top.style.touchAction = "none";
    this.top.setAttribute("aria-hidden", "true");
    this.base.setAttribute("aria-hidden", "true");
    this.bctx = this.base.getContext("2d")!;
    this.tctx = this.top.getContext("2d")!;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();

    this.top.addEventListener("pointerdown", this.onPointerDown);
    this.top.addEventListener("pointermove", this.onPointerMove);
    this.top.addEventListener("pointerup", this.onPointerUp);
    this.top.addEventListener("pointerleave", this.onPointerLeave);
    this.top.addEventListener("pointercancel", this.onPointerUp);
    this.top.addEventListener("wheel", this.onWheel, { passive: false });
    this.top.addEventListener("dblclick", this.onDblClick);
    this.top.addEventListener("contextmenu", this.onContextMenu);
  }

  destroy() {
    clearTimeout(this.settleTimer);
    clearTimeout(this.prefetchTimer);
    cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this.edgeRaf);
    cancelAnimationFrame(this.flight);
    this.ro.disconnect();
    this.top.removeEventListener("pointerdown", this.onPointerDown);
    this.top.removeEventListener("pointermove", this.onPointerMove);
    this.top.removeEventListener("pointerup", this.onPointerUp);
    this.top.removeEventListener("pointerleave", this.onPointerLeave);
    this.top.removeEventListener("pointercancel", this.onPointerUp);
    this.top.removeEventListener("wheel", this.onWheel);
    this.top.removeEventListener("dblclick", this.onDblClick);
    this.top.removeEventListener("contextmenu", this.onContextMenu);
    this.base.remove();
    this.top.remove();
  }

  // ---------- public setters ----------

  /** Shows an era. From another era the borders sweep into place (see sweep.ts) unless the reader prefers less motion. */
  setLayer(layer: Layer | null) {
    const prev = this.layer;
    const prevCache = this.cache;
    // a new era while a sweep still runs (clicking quickly through the timeline) shows straight away; one that comes as a
    // sweep ends (the timeline playing on) sweeps in as usual, even while the reader pans the map or drags a shape
    const busy = this.sweepLeft() > 0;
    this.sweep = null;
    this.layer = layer;
    this.cache = null;
    if (prev && layer && prev !== layer && !busy) this.sweep = this.startSweep(prev, prevCache, layer);
    if (prevCache) this.recycle(...prevCache.tiles.values());
    this.markBase();
  }

  /** How long the border sweep now running has left, in ms (0 when none). */
  sweepLeft() {
    return this.sweep ? Math.max(0, SWEEP_MS - (performance.now() - this.sweep.start)) : 0;
  }
  /** Whether the next sweep runs at a steady pace instead of easing in and out: while the timeline plays on, so the
   * borders never slow to a stop between eras. A sweep already running keeps its pace. */
  setSteady(on: boolean) {
    this.steady = on;
  }
  setStates(states: Layer | null) {
    this.states = states;
    this.cache = null;
    this.markBase();
  }
  setClaims(list: ClaimShape[]) {
    this.claims = list;
    this.cache = null;
    this.markBase();
  }
  /** Big lakes, drawn as water over every era so they never appear or vanish between snapshots. */
  setLakes(list: Lake[]) {
    this.lakes = list;
    this.cache = null;
    this.markBase();
  }
  setLabels(on: boolean) {
    this.labels = on;
    this.markBase();
    this.markTop();
  }
  setHighlight(name: string | null, pin: LonLat | null) {
    this.highlight = name;
    this.pin = pin;
    this.markBase();
  }
  setOverlays(list: Overlay[], selected: string | null) {
    // keep a live drag position if React state is behind the pointer
    const dragging = this.gesture?.kind === "drag" ? this.overlays.find((o) => o.id === (this.gesture as { id: string }).id) : null;
    this.overlays = list.map((o) => (dragging && o.id === dragging.id ? { ...o, lon: dragging.lon, lat: dragging.lat, moved: true } : o));
    this.selected = selected;
    this.markTop();
  }

  getSize() {
    return { w: this.w, h: this.h };
  }

  /** Lon/lat at the centre of the screen. */
  center(): LonLat {
    return [this.view.lon, latFromMercY(this.view.y)];
  }

  setView(v: View, animate = false) {
    const target = clampView(v, this.w, this.h);
    cancelAnimationFrame(this.flight);
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!animate || reduce) {
      this.view = target;
      this.viewChanged();
      return;
    }
    const from = { ...this.view };
    let dLon = target.lon - from.lon;
    if (dLon > 180) dLon -= 360;
    if (dLon < -180) dLon += 360;
    const start = performance.now();
    const dur = 650;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      this.view = clampView(
        { lon: from.lon + dLon * e, y: from.y + (target.y - from.y) * e, k: from.k * (target.k / from.k) ** e },
        this.w,
        this.h,
      );
      this.viewChanged();
      if (t < 1) this.flight = requestAnimationFrame(step);
    };
    this.flight = requestAnimationFrame(step);
  }

  zoomBy(factor: number) {
    this.setView(zoomAt(this.view, factor, this.w / 2, this.h / 2, this.w, this.h), true);
  }
  panPixels(dx: number, dy: number) {
    this.view = panBy(this.view, dx, dy, this.w, this.h);
    this.viewChanged();
  }
  flyTo(lon: number, lat: number, k?: number) {
    this.setView({ lon, y: mercY(lat), k: k ?? Math.max(this.view.k, minScale(this.w, this.h) * 3) }, true);
  }

  /** Scale (k) that makes a region of `km2` fill a comfortable part of the screen at latitude `lat`. */
  scaleFor(km2: number, lat: number) {
    const sizeKm = Math.sqrt(km2) * Math.sqrt(mercatorInflation(lat));
    const k = (Math.min(this.w, this.h) * 0.45 * EARTH_RADIUS_KM) / Math.max(sizeKm, 30);
    return Math.max(minScale(this.w, this.h), k);
  }

  /** Re-render to a PNG for downloading. */
  async toBlob(caption: string): Promise<Blob | null> {
    this.drawNow();
    const out = document.createElement("canvas");
    out.width = this.base.width;
    out.height = this.base.height;
    const ctx = out.getContext("2d")!;
    ctx.drawImage(this.base, 0, 0);
    ctx.drawImage(this.top, 0, 0);
    ctx.scale(this.dpr, this.dpr);
    const pad = 12;
    ctx.font = "600 14px system-ui, sans-serif";
    const tw = ctx.measureText(caption).width;
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(this.w - tw - pad * 3, this.h - 40, tw + pad * 2, 28);
    ctx.fillStyle = "#fff";
    ctx.fillText(caption, this.w - tw - pad * 2, this.h - 21);
    return new Promise((resolve) => out.toBlob(resolve, "image/png"));
  }

  // ---------- internals ----------

  private markBase() {
    this.baseDirty = true;
    this.schedule();
  }
  private markTop() {
    this.topDirty = true;
    this.schedule();
  }
  private viewChanged() {
    // a sweep in progress carries on, moved with the map (see sweepShift)
    this.lastViewChange = performance.now();
    this.baseDirty = true;
    this.topDirty = true;
    this.schedule();
    this.cb.onViewChange(this.view);
  }
  private schedule() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.drawNow();
    });
  }

  private resize() {
    const r = this.container.getBoundingClientRect();
    this.w = Math.max(1, Math.round(r.width));
    this.h = Math.max(1, Math.round(r.height));
    // phones: draw at 1.5x at most; full retina density doubles the work and makes panning lag
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    this.dpr = Math.min(coarse ? 1.5 : 2, window.devicePixelRatio || 1);
    for (const c of [this.base, this.top]) {
      c.width = Math.round(this.w * this.dpr);
      c.height = Math.round(this.h * this.dpr);
    }
    this.view = clampView(this.view, this.w, this.h);
    // a sweep's picture of the old era no longer fits a new canvas size
    this.sweep = null;
    this.viewChanged();
  }

  private drawNow() {
    const projs = this.copyShifts().map((shift) => projectionFor(this.view, this.w, this.h, shift));
    // cleared first: a sweep frame asks for the next one while it draws
    if (this.baseDirty) {
      this.baseDirty = false;
      this.drawBase(projs);
    }
    if (this.topDirty) {
      this.topDirty = false;
      this.drawTop(projs);
    }
  }

  /** Sideways pixel offsets of every copy of the world on screen, the main copy first. Only one copy unless zoomed far out. */
  private copyShifts(v = this.view) {
    const size = 2 * Math.PI * v.k;
    const n = Math.max(0, Math.ceil((this.w + size) / 2 / size) - 1);
    const shifts = [0];
    for (let i = 1; i <= n; i++) shifts.push(-i * size, i * size);
    return shifts;
  }

  /** Visible lon/lat window, used to skip off-screen shapes. */
  private visibleBox(v = this.view) {
    const halfLon = (this.w / 2 / v.k) * (180 / Math.PI);
    const top = latFromMercY(v.y + this.h / 2 / v.k);
    const bottom = latFromMercY(v.y - this.h / 2 / v.k);
    return { lon: v.lon, halfLon, top, bottom };
  }

  private isVisible(bbox: [number, number, number, number], vb: ReturnType<MapEngine["visibleBox"]>) {
    if (bbox[3] < vb.bottom || bbox[1] > vb.top) return false;
    if (vb.halfLon >= 180) return true;
    const width = bbox[2] - bbox[0];
    if (width > 300) return true;
    const mid = (bbox[0] + bbox[2]) / 2;
    let d = Math.abs(normLon(mid - vb.lon));
    d = Math.min(d, 360 - d);
    return d <= vb.halfLon + width / 2 + 1;
  }

  private drawBase(projs: ReturnType<typeof projectionFor>[]) {
    const ctx = this.bctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const world = this.worldRect();
    ctx.fillStyle = COLORS.offMap;
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.fillStyle = COLORS.ocean;
    ctx.fillRect(world.x, world.y, world.w, world.h);
    // nothing spills into the bars (Antarctica's edge, claim wedges)
    ctx.save();
    ctx.beginPath();
    ctx.rect(world.x, world.y, world.w, world.h);
    ctx.clip();
    const cache = this.freshCache();
    if (this.sweep) this.drawSweep(this.sweep, cache, projs);
    else {
      this.drawTiles(cache);
      this.drawHighlight(cache);
      this.drawLines();
      if (this.labels) {
        const feats = this.labelFeats(cache);
        const states = this.showStates() ? this.states : null;
        for (const proj of projs) {
          this.paintLabels(ctx, this.planLabels(proj, feats, states));
          this.drawClaimLabels(ctx, proj);
        }
      }
    }
    if (this.pin) for (const proj of projs) this.drawPin(ctx, proj, this.pin);
    ctx.restore();
  }

  /** The shapes big enough on screen to be named. */
  private labelFeats(cache: BaseCache, v = this.view) {
    const vb = this.visibleBox(v);
    const minDeg = (1.2 / v.k) * (180 / Math.PI);
    return cache.shapes
      .filter((s) => s.f.bbox[2] - s.f.bbox[0] + (s.f.bbox[3] - s.f.bbox[1]) > minDeg && this.isVisible(s.f.bbox, vb))
      .map((s) => s.f);
  }

  /**
   * The tiles for the current zoom. Rebuilt when the zoom has changed by more than half (until then the tiles are
   * drawn scaled), and 150 ms after the map stops moving if the zoom changed at all, so the resting map is always sharp.
   */
  private freshCache(): BaseCache {
    const c = this.cache;
    const s = c ? this.view.k / c.k : 1;
    const settled = performance.now() - this.lastViewChange > 150;
    if (!c || c.dpr !== this.dpr || s < 0.67 || s > 1.5 || (settled && Math.abs(s - 1) > 1e-3)) {
      clearTimeout(this.settleTimer);
      if (c) this.recycle(...c.tiles.values());
      return (this.cache = this.buildCache());
    }
    if (Math.abs(s - 1) > 1e-3) {
      clearTimeout(this.settleTimer);
      this.settleTimer = window.setTimeout(() => this.markBase(), 160);
    }
    return c;
  }

  /** Works out each shape's box at this zoom. Outlines are converted to screen units later, the first time a tile needs them. */
  private buildCache(layer = this.layer): BaseCache {
    const k = this.view.k;
    const proj = geoMercator()
      .rotate([-CUT_CENTER, 0])
      .scale(k)
      .translate([0, 0])
      .precision(k > minScale(this.w, this.h) * 4 ? 0.5 : 0);
    // skip shapes smaller than ~1px on screen
    const minDeg = (1.2 / k) * (180 / Math.PI);
    const shapes = (layer?.features ?? [])
      .filter((f) => !f.props.x && f.bbox[2] - f.bbox[0] + (f.bbox[3] - f.bbox[1]) > minDeg)
      .map((f) => ({ f, fill: fillFor(f), box: this.cacheBox(f.bbox, k) }));
    const claims = this.claims.map((c) => {
      let [w, s, e, n] = [180, 90, -180, -90];
      for (const poly of c.geom.coordinates)
        for (const [lon, lat] of poly[0]) [w, s, e, n] = [Math.min(w, lon), Math.min(s, lat), Math.max(e, lon), Math.max(n, lat)];
      return { c, box: this.cacheBox([w, s, e, n], k) };
    });
    // big screens get bigger tiles, so a desktop window needs fewer of them
    const size = this.w * this.h > 900_000 ? 512 : 256;
    const lakes = this.lakes.filter((l) => l.bbox[2] - l.bbox[0] + (l.bbox[3] - l.bbox[1]) > minDeg).map((l) => ({ l, box: this.cacheBox(l.bbox, k) }));
    return { layer, k, dpr: this.dpr, proj, size, shapes, claims, lakes, paths: new Map(), outlines: new Map(), tiles: new Map(), keep: 24, states: k > minScale(this.w, this.h) * 2.2 ? undefined : null };
  }

  /** A box in the cache's units (screen pixels at its zoom, the cut meridian at ±π·k), for skipping shapes outside a tile. */
  private cacheBox(b: [number, number, number, number], k: number): [number, number, number, number] {
    const west = normLon(b[0] - CUT_CENTER);
    const width = b[2] - b[0];
    const whole = width > 300 || west + width > 180;
    return [whole ? -Math.PI * k : west * RAD * k, -k * mercY(b[3]), whole ? Math.PI * k : (west + width) * RAD * k, -k * mercY(b[1])];
  }

  private showStates() {
    return !!this.states?.mesh && this.layer?.key === "present" && this.view.k > minScale(this.w, this.h) * 2.2;
  }

  /** Where the cache's origin lands on screen for each copy of the world (only one unless zoomed far out). */
  private cacheOrigins(c: BaseCache) {
    const v = this.view;
    const s = v.k / c.k;
    const size = 2 * Math.PI * v.k;
    let x0 = this.w / 2 + v.k * normLon(CUT_CENTER - v.lon) * RAD;
    let y = this.h / 2 + v.k * v.y;
    // at the tiles' own zoom, land on whole device pixels so the tiles are copied pixel for pixel (sharp, no seams)
    if (Math.abs(s - 1) < 1e-3) {
      x0 = Math.round(x0 * this.dpr) / this.dpr;
      y = Math.round(y * this.dpr) / this.dpr;
    }
    const out: [number, number][] = [];
    for (let n = -3; n <= 3; n++) {
      const x = x0 + n * size;
      if (x + size / 2 > 0 && x - size / 2 < this.w) out.push([x, y]);
    }
    return out;
  }

  /** The tile rows and columns covering the screen (plus `ring` tiles around it) for one copy of the world. */
  private tileRange(c: BaseCache, ox: number, oy: number, ring: number) {
    const s = this.view.k / c.k;
    const half = Math.ceil(Math.PI * c.k / 2) * 2; // an even number of pixels, so tile corners land on whole device pixels
    const count = Math.ceil((2 * half) / c.size);
    const col = (x: number) => Math.floor(((x - ox) / s + half) / c.size);
    const row = (y: number) => Math.floor(((y - oy) / s + half) / c.size);
    return {
      half,
      i0: Math.max(0, col(0) - ring),
      i1: Math.min(count - 1, col(this.w) + ring),
      j0: Math.max(0, row(0) - ring),
      j1: Math.min(count - 1, row(this.h) + ring),
    };
  }

  /**
   * Land, borders, claims and state lines come from bitmap tiles drawn once per zoom level, so a frame is just a few
   * image copies: panning and edge scrolling never wait on redrawing hundreds of shapes. A tile that is not ready yet is
   * drawn on the spot, so the map is never shown blank or half drawn; the tiles around the screen are drawn ahead of time.
   */
  private drawTiles(c: BaseCache, ctx = this.bctx) {
    const s = this.view.k / c.k;
    const pad = TILE_PAD;
    let missing = false;
    let shown = 0;
    for (const [ox, oy] of this.cacheOrigins(c)) {
      const { half, i0, i1, j0, j1 } = this.tileRange(c, ox, oy, 0);
      for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++) {
          const tile = this.tile(c, i, j);
          const src = (c.size + 2 * pad) * c.dpr;
          ctx.drawImage(tile, 0, 0, src, src, ox + s * (i * c.size - half - pad), oy + s * (j * c.size - half - pad), s * (c.size + 2 * pad), s * (c.size + 2 * pad));
          shown++;
        }
      const ring = this.tileRange(c, ox, oy, 1);
      for (let j = ring.j0; j <= ring.j1 && !missing; j++)
        for (let i = ring.i0; i <= ring.i1 && !missing; i++) missing = !c.tiles.has(`${i},${j}`);
    }
    c.keep = Math.max(24, shown * 3);
    if (missing && !this.prefetchTimer) this.prefetchTimer = window.setTimeout(this.prefetch, 0);
  }

  /** Draw the tiles just off screen between frames (a few ms at a time), so panning finds them ready. */
  private prefetch = () => {
    this.prefetchTimer = 0;
    const c = this.cache;
    if (!c) return;
    const start = performance.now();
    for (const [ox, oy] of this.cacheOrigins(c)) {
      const { i0, i1, j0, j1 } = this.tileRange(c, ox, oy, 1);
      for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++) {
          if (c.tiles.has(`${i},${j}`)) continue;
          if (performance.now() - start > 6) {
            this.prefetchTimer = window.setTimeout(this.prefetch, 0);
            return;
          }
          this.tile(c, i, j);
        }
    }
  };

  /** One tile, from the cache or drawn now. Least recently used tiles are dropped beyond what the screen needs. */
  private tile(c: BaseCache, i: number, j: number) {
    const key = `${i},${j}`;
    let tile = c.tiles.get(key);
    if (tile) c.tiles.delete(key);
    else tile = this.renderTile(c, i, j);
    c.tiles.set(key, tile);
    while (c.tiles.size > c.keep) {
      const [oldest, canvas] = c.tiles.entries().next().value!;
      c.tiles.delete(oldest);
      this.recycle(canvas);
    }
    return tile;
  }

  /** Keep a few spare tile canvases to reuse rather than making new ones. */
  private recycle(...tiles: HTMLCanvasElement[]) {
    for (const t of tiles) if (this.tilePool.length < 16) this.tilePool.push(t);
  }

  private renderTile(c: BaseCache, i: number, j: number) {
    const pad = TILE_PAD;
    const half = Math.ceil(Math.PI * c.k / 2) * 2;
    const x0 = i * c.size - half - pad;
    const y0 = j * c.size - half - pad;
    const span = c.size + 2 * pad;
    const tile = this.tilePool.pop() ?? document.createElement("canvas");
    const px = Math.ceil(span * c.dpr);
    if (tile.width !== px || tile.height !== px) tile.width = tile.height = px;
    const ctx = tile.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, px, px);
    ctx.setTransform(c.dpr, 0, 0, c.dpr, -x0 * c.dpr, -y0 * c.dpr);
    const hits = (b: [number, number, number, number]) => b[0] < x0 + span && b[2] > x0 && b[1] < y0 + span && b[3] > y0;
    const shapes = c.shapes.filter((sh) => hits(sh.box)).map((sh) => ({ ...sh, p2d: this.cachedPath(c, sh.f) }));

    // pass 1: fill, and stroke in the same colour to seal hairline gaps between neighbouring shapes
    const hatch = this.pattern(COLORS.dispute, 0.35);
    ctx.lineJoin = "round";
    ctx.lineWidth = 1.2;
    for (const { f, p2d, fill } of shapes) {
      ctx.fillStyle = fill;
      ctx.fill(p2d);
      ctx.strokeStyle = fill;
      ctx.stroke(p2d);
      if (f.props.d && hatch) {
        ctx.fillStyle = hatch;
        ctx.fill(p2d);
      }
    }
    // pass 2: borders: solid where the source says they are precise, dashed where approximate
    ctx.lineWidth = 0.7;
    for (const { f } of shapes) {
      if (f.props.m || f.sliced) continue; // filled-in gaps and sliced polar shapes: no outline (it would show the cuts)
      if (f.props.n) {
        ctx.setLineDash(f.props.b >= 2 ? [] : [3, 3]);
        ctx.strokeStyle = COLORS.border;
      } else {
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = COLORS.borderSoft;
      }
      ctx.stroke(this.cachedOutline(c, f));
    }
    ctx.setLineDash([]);

    // claim wedges (Antarctica): tinted and hatched in the claimant's colour, so overlapping claims show through each other
    for (const cl of c.claims) {
      if (!hits(cl.box)) continue;
      const p2d = (cl.p2d ??= this.projected(c, cl.c.geom as GeoPermissibleObjects));
      ctx.fillStyle = hexToRgba(cl.c.color, 0.18);
      ctx.fill(p2d);
      const claimHatch = this.pattern(cl.c.color, 0.3);
      if (claimHatch) {
        ctx.fillStyle = claimHatch;
        ctx.fill(p2d);
      }
      ctx.setLineDash([5, 3]);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = hexToRgba(cl.c.color, 0.9);
      ctx.stroke(p2d);
    }
    ctx.setLineDash([]);

    // US state lines on the present-day map once zoomed in: shared borders only, clipped to the US coastline
    const states = c.layer?.key === "present" ? this.statePaths(c) : null;
    if (states) {
      ctx.save();
      ctx.clip(states.clip);
      ctx.strokeStyle = COLORS.stateLine;
      ctx.lineWidth = 0.7;
      ctx.stroke(states.mesh);
      ctx.restore();
    }

    // big lakes last, as water with a shoreline, the same on every era
    for (const lk of c.lakes) {
      if (!hits(lk.box)) continue;
      const p2d = (lk.p2d ??= this.projected(c, lk.l.geom as GeoPermissibleObjects));
      ctx.fillStyle = COLORS.ocean;
      ctx.fill(p2d);
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = COLORS.border;
      ctx.stroke(p2d);
    }
    return tile;
  }

  /** The highlighted country's outline, drawn live on top of the tiles. */
  private drawHighlight(c: BaseCache) {
    const f = this.highlight ? this.layer?.byName.get(this.highlight) : undefined;
    if (!f) return;
    const ctx = this.bctx;
    const s = this.view.k / c.k;
    const p2d = this.cachedOutline(c, f);
    for (const [ox, oy] of this.cacheOrigins(c)) {
      ctx.save();
      ctx.setTransform(this.dpr * s, 0, 0, this.dpr * s, this.dpr * ox, this.dpr * oy);
      ctx.strokeStyle = "#2A1A12";
      ctx.lineWidth = 2.2 / s;
      ctx.stroke(p2d);
      ctx.restore();
    }
  }

  // ---------- era changes: the border sweep (see sweep.ts) ----------

  /** Sets up the sweep from `prev` to `next` for the current view, or returns null to show `next` straight away. */
  private startSweep(prev: Layer, prevCache: BaseCache | null, next: Layer): Sweep | null {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return null;
    // the old era as it was on screen, from its tiles (drawn again if they were dropped meanwhile)
    const oldCache = prevCache?.layer === prev ? prevCache : this.buildCache(prev);
    const old = this.snapshot(oldCache);
    if (oldCache !== prevCache) this.recycle(...oldCache.tiles.values());
    const cs = Math.max(2, Math.sqrt((this.w * this.h) / SWEEP_CELLS));
    const gw = Math.ceil(this.w / cs);
    const gh = Math.ceil(this.h / cs);
    const A = this.ownerGrid(prev, cs, gw, gh);
    const B = this.ownerGrid(next, cs, gw, gh);
    const plan = planSweep(A.grid, B.grid, A.owners.map(ownerOf), B.owners.map(ownerOf), gw, gh);
    const fromHighlight = (this.highlight && prev.byName.get(this.highlight)) || null;
    return {
      start: performance.now(),
      view: { ...this.view },
      plan,
      cs,
      old,
      from: prev,
      ownersA: A.owners,
      ownersB: B.owners,
      fromHighlight,
      labels: null,
      steady: this.steady,
    };
  }

  /** Where the map has moved since a sweep was worked out: [scale, dx, dy] taking its pixels to today's view's. */
  private sweepShift(s: Sweep): [number, number, number] {
    const v = this.view;
    const k = v.k / s.view.k;
    const dx = (this.w / 2) * (1 - k) + v.k * normLon(s.view.lon - v.lon) * (Math.PI / 180);
    const dy = (this.h / 2) * (1 - k) + v.k * (v.y - s.view.y);
    return [k, dx, dy];
  }

  /** The land, borders and lakes one cache draws, screen-sized, without names. */
  private snapshot(c: BaseCache) {
    const canvas = (this.sweepCanvas ??= document.createElement("canvas"));
    if (canvas.width !== this.base.width || canvas.height !== this.base.height) {
      canvas.width = this.base.width;
      canvas.height = this.base.height;
    }
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const world = this.worldRect();
    ctx.fillStyle = COLORS.ocean;
    ctx.fillRect(world.x, world.y, world.w, world.h);
    this.drawTiles(c, ctx);
    return canvas;
  }

  /** Which shape owns each grid cell on screen (0: sea or lake), and the shape behind each owner number. */
  private ownerGrid(layer: Layer, cs: number, gw: number, gh: number) {
    const grid = new Int32Array(gw * gh);
    const owners: (PolityFeature | null)[] = [null];
    const v = this.view;
    const vb = this.visibleBox();
    const minDeg = (1.2 / v.k) * (180 / Math.PI);
    const cy = this.h / 2 + v.k * v.y;
    const copy = (2 * Math.PI * v.k) / cs;
    const fill = (geom: MultiPolygon, id: number) => {
      for (const poly of geom.coordinates) {
        const rings = poly.map((r) => projectRing(r, v.lon, v.k, this.w / 2, cy, cs));
        const x0 = Math.min(...rings.map((r) => r.minX));
        const x1 = Math.max(...rings.map((r) => r.maxX));
        // once for each copy of the world it shows in
        for (let m = -3; m <= 3; m++)
          if (x1 + m * copy >= 0 && x0 + m * copy <= gw) fillRings(grid, gw, gh, rings.map((r) => r.pts), id, m * copy);
      }
    };
    for (const f of layer.features) {
      if (f.props.x || f.bbox[2] - f.bbox[0] + (f.bbox[3] - f.bbox[1]) <= minDeg || !this.isVisible(f.bbox, vb)) continue;
      fill(f.geom, owners.length);
      owners.push(f);
    }
    // big lakes are water in every era
    for (const l of this.lakes) if (this.isVisible(l.bbox, vb)) fill(l.geom, 0);
    return { grid, owners };
  }

  /** One frame of a sweep: the new era, the old one wherever the moving border hasn't reached yet, and the border itself. */
  private drawSweep(s: Sweep, cache: BaseCache, projs: ReturnType<typeof projectionFor>[]) {
    const ctx = this.bctx;
    const t = Math.min(1, (performance.now() - s.start) / SWEEP_MS);
    const e = s.steady ? t : t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    this.drawTiles(cache);
    const area = new Path2D();
    const front = sweepFrame(s.plan, e, s.cs, area);
    // the old era, the moving border and the names are in the pixels of the view the sweep was worked out for, moved
    // to where that land is now if the reader has panned or zoomed since (land that came into view shows the new era)
    const [k, dx, dy] = this.sweepShift(s);
    ctx.save();
    ctx.transform(k, 0, 0, k, dx, dy);
    ctx.clip(area);
    ctx.drawImage(s.old, 0, 0, this.w, this.h);
    ctx.restore();
    // the moving border, drawn like the borders on the tiles
    ctx.lineWidth = 0.7;
    ctx.lineJoin = "round";
    for (const style of [1, 2, 3]) {
      const lines = front.filter((l) => l.style === style);
      if (!lines.length) continue;
      ctx.beginPath();
      for (const { pts } of lines) {
        ctx.moveTo(k * pts[0] + dx, k * pts[1] + dy);
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(k * pts[i] + dx, k * pts[i + 1] + dy);
      }
      ctx.setLineDash(style === 3 ? [] : style === 2 ? [3, 3] : [2, 4]);
      ctx.strokeStyle = style === 1 ? COLORS.borderSoft : COLORS.border;
      ctx.stroke();
    }
    ctx.setLineDash([]);
    if (e < 0.5) this.strokeHighlight(s.fromHighlight, projs);
    else this.drawHighlight(cache);
    this.drawLines();
    if (this.labels) {
      this.drawSweepLabels(s, cache, e, [k, dx, dy]);
      for (const proj of projs) this.drawClaimLabels(ctx, proj);
    }
    // on to the next frame; after the last one the map draws normally again, and looks the same
    if (t >= 1) this.sweep = null;
    this.markBase();
  }

  /** The old era's highlighted country during the first half of a sweep, drawn like drawHighlight. */
  private strokeHighlight(f: PolityFeature | null, projs: ReturnType<typeof projectionFor>[]) {
    if (!f) return;
    const ctx = this.bctx;
    ctx.beginPath();
    for (const proj of projs) geoPath(proj, ctx)(f.geom as GeoPermissibleObjects);
    ctx.strokeStyle = "#2A1A12";
    ctx.lineWidth = 2.2;
    ctx.stroke();
  }

  /** Names during a sweep: each follows the middle of its country, and a renamed country switches name halfway. */
  private drawSweepLabels(s: Sweep, cache: BaseCache, e: number, [k, dx, dy]: [number, number, number]) {
    const L = (s.labels ??= this.sweepLabels(s, cache));
    const sums = shownSums(s.plan, e, L.wanted, L.copyOf, COPIES);
    const NB = s.plan.carries.length;
    const items: LabelItem[] = e < 0.5 ? [...L.staticOld] : [...L.staticNew];
    for (const tr of L.tracks) {
      const o = (tr.code * COPIES + tr.copy) * 6;
      const oo = tr.from ? (tr.from * COPIES + tr.copy) * 6 : o;
      const n = sums[o + 2];
      const nOld = sums[oo + 2];
      let it: LabelItem | undefined;
      let ref = 0; // a name that comes or goes with its country: shown only while the country is big enough to name
      let count = n;
      if (tr.from) [it, ref, count] = e < 0.5 ? [tr.old, tr.n0, nOld] : [tr.neu, tr.n1, n]; // one name, changing hands
      else if (tr.code > NB) [it, ref] = [tr.old, tr.n0]; // an old country nothing carries on, shrinking away
      else if (!s.plan.carries[tr.code]) [it, ref] = [e < 0.5 ? undefined : tr.neu, tr.n1]; // a new country: named from halfway
      else it = e < 0.5 ? tr.old : tr.neu; // a country carrying on, renamed halfway
      if (!it || !count) continue;
      if (ref) {
        const sizePx = (it.sizePx ?? 0) * Math.sqrt(count / ref);
        if (sizePx < 28 || it.tw > sizePx * 1.6) continue;
      }
      // The name starts where it sat on the old map, relative to the middle of everything its country shows, and ends
      // where it sits on the new map, relative to the middle of the land the country keeps; in between it blends from one
      // to the other, so a shrinking country's name glides toward what it keeps.
      const nk = sums[o + 5];
      const all = nOld ? [(sums[oo] / nOld + 0.5) * s.cs, (sums[oo + 1] / nOld + 0.5) * s.cs] : null;
      const kept = nk ? [(sums[o + 3] / nk + 0.5) * s.cs, (sums[o + 4] / nk + 0.5) * s.cs] : null;
      const p0 = all && tr.old && tr.c0 ? [all[0] + tr.old.p[0] - tr.c0[0], all[1] + tr.old.p[1] - tr.c0[1]] : null;
      const p1 = kept && tr.neu && tr.c1 ? [kept[0] + tr.neu.p[0] - tr.c1[0], kept[1] + tr.neu.p[1] - tr.c1[1]] : null;
      const p = p0 && p1 ? [p0[0] + (p1[0] - p0[0]) * e, p0[1] + (p1[1] - p0[1]) * e] : (p0 ?? p1);
      if (p) items.push({ ...it, p: [p[0], p[1]] });
    }
    // placed in the pixels of the sweep's view, so moved with the map
    const moved = k === 1 && !dx && !dy ? items : items.map((it): LabelItem => ({ ...it, p: [k * it.p[0] + dx, k * it.p[1] + dy] }));
    this.paintLabels(this.bctx, moved);
  }

  /** Pairs the names on the old and new maps with what they follow, and finds where that is at the start and the end. */
  private sweepLabels(s: Sweep, cache: BaseCache): SweepLabels {
    const { plan } = s;
    // in the view the sweep was worked out for, like its grid
    const v = s.view;
    const NB = plan.carries.length;
    const vb = this.visibleBox(v);
    const minDeg = (1.2 / v.k) * (180 / Math.PI);
    const oldFeats = s.from.features.filter(
      (f) => !f.props.x && f.bbox[2] - f.bbox[0] + (f.bbox[3] - f.bbox[1]) > minDeg && this.isVisible(f.bbox, vb),
    );
    const newFeats = this.labelFeats(cache, v);
    const states = this.showStates() ? this.states : null;
    const idA = new Map(s.ownersA.map((f, i) => [f, i]));
    const idB = new Map(s.ownersB.map((f, i) => [f, i]));
    const size = 2 * Math.PI * v.k;
    const shifts = this.copyShifts(v);
    const projs = shifts.map((shift) => projectionFor(v, this.w, this.h, shift));
    const byKey = new Map<number, SweepLabel>();
    const track = (code: number, copy: number) => {
      let tr = byKey.get(code * COPIES + copy);
      if (!tr) byKey.set(code * COPIES + copy, (tr = { code, copy, n0: 0, n1: 0 }));
      return tr;
    };
    const staticOld: LabelItem[] = [];
    const staticNew: LabelItem[] = [];
    projs.forEach((proj, k) => {
      const copy = Math.round(shifts[k] / size) + COPY0;
      for (const it of this.planLabels(proj, oldFeats, null)) {
        const i = it.f ? idA.get(it.f) : undefined;
        if (!i) staticOld.push(it);
        else track(plan.carriedBy[i] || NB + i, copy).old = it;
      }
      for (const it of this.planLabels(proj, newFeats, states)) {
        const j = it.f ? idB.get(it.f) : undefined;
        if (!j) staticNew.push(it);
        else track(j, copy).neu = it;
      }
    });
    const wanted = new Uint8Array(NB + plan.carriedBy.length);
    for (const tr of byKey.values()) wanted[tr.code] = 1;
    const copyOf = new Uint8Array(plan.gw);
    for (let x = 0; x < plan.gw; x++)
      copyOf[x] = Math.max(0, Math.min(COPIES - 1, Math.round(((x + 0.5) * s.cs - this.w / 2) / size) + COPY0));
    const at0 = shownSums(plan, 0, wanted, copyOf, COPIES);
    const at1 = shownSums(plan, 1, wanted, copyOf, COPIES);
    const mid = (sums: Float64Array, o: number): [number, number] => [
      (sums[o] / sums[o + 2] + 0.5) * s.cs,
      (sums[o + 1] / sums[o + 2] + 0.5) * s.cs,
    ];
    for (const tr of byKey.values()) {
      const o = (tr.code * COPIES + tr.copy) * 6;
      if ((tr.n0 = at0[o + 2])) tr.c0 = mid(at0, o);
      if ((tr.n1 = at1[o + 2])) tr.c1 = mid(at1, o);
    }
    // an old country nothing carries on and a new one with the same name (Egypt changing hands) share one name
    const fresh = new Map<string, SweepLabel>();
    for (const tr of byKey.values()) if (tr.neu && tr.code < NB && !plan.carries[tr.code]) fresh.set(`${tr.copy}|${tr.neu.text}`, tr);
    for (const [key, tr] of byKey) {
      const f = tr.old && tr.code > NB ? fresh.get(`${tr.copy}|${tr.old.text}`) : undefined;
      if (!f || f.old) continue;
      Object.assign(f, { from: tr.code, old: tr.old, c0: tr.c0, n0: tr.n0 });
      byKey.delete(key);
    }
    return { tracks: [...byKey.values()], wanted, copyOf, staticOld, staticNew };
  }

  private projected(c: BaseCache, g: GeoPermissibleObjects) {
    const p2d = new Path2D();
    geoPath(c.proj, p2d as unknown as CanvasRenderingContext2D)(g);
    return p2d;
  }

  /** A shape's outline in the cache's units, made the first time it is needed at this zoom. */
  private cachedPath(c: BaseCache, f: PolityFeature) {
    let p2d = c.paths.get(f);
    if (!p2d) {
      p2d = this.projected(c, f.geom as GeoPermissibleObjects);
      c.paths.set(f, p2d);
    }
    return p2d;
  }

  /** The outline to stroke for a shape: its polygon, or its edges without the 180° cut when it has one. */
  private cachedOutline(c: BaseCache, f: PolityFeature) {
    let p2d = c.outlines.get(f);
    if (!p2d) {
      const lines = seamlessOutline(f.geom);
      p2d = lines ? this.projected(c, lines) : this.cachedPath(c, f);
      c.outlines.set(f, p2d);
    }
    return p2d;
  }

  /** State lines and the US outline that clips them (only zoomed in far enough to show them). */
  private statePaths(c: BaseCache) {
    if (c.states === undefined) {
      const usa = c.layer?.byName.get("United States");
      const mesh = this.states?.mesh;
      c.states = usa && mesh ? { mesh: this.projected(c, mesh as GeoPermissibleObjects), clip: this.cachedPath(c, usa) } : null;
    }
    return c.states;
  }

  /** Equator (dashed) and faint parallels. On this map they are straight across, so they are drawn as plain lines. */
  private drawLines() {
    const ctx = this.bctx;
    const v = this.view;
    const yOf = (lat: number) => this.h / 2 + v.k * v.y - v.k * mercY(lat);
    ctx.beginPath();
    for (const lat of [-60, -30, 30, 60]) {
      ctx.moveTo(0, yOf(lat));
      ctx.lineTo(this.w, yOf(lat));
    }
    ctx.strokeStyle = COLORS.graticule;
    ctx.lineWidth = 1;
    ctx.stroke();
    const eq = yOf(0);
    ctx.beginPath();
    ctx.moveTo(0, eq);
    ctx.lineTo(this.w, eq);
    ctx.setLineDash([6, 5]);
    // the dashes travel with the map as it pans
    ctx.lineDashOffset = -((((this.w / 2 - v.k * v.lon * RAD) % 11) + 11) % 11);
    ctx.strokeStyle = COLORS.equator;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
    if (eq > 12 && eq < this.h - 4) {
      ctx.font = "600 10px system-ui, sans-serif";
      ctx.fillStyle = COLORS.equator;
      ctx.fillText("EQUATOR", 8, eq - 5);
    }
  }

  private drawPin(ctx: CanvasRenderingContext2D, proj: ReturnType<typeof projectionFor>, pin: LonLat) {
    const p = proj(pin);
    if (!p) return;
    ctx.beginPath();
    ctx.arc(p[0], p[1], 7, 0, Math.PI * 2);
    ctx.fillStyle = "#2A1A12";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p[0], p[1], 3, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }

  /** Where the names go for one copy of the world: biggest shapes first, none overlapping or running off screen. */
  private planLabels(proj: ReturnType<typeof projectionFor>, feats: PolityFeature[], states: Layer | null): LabelItem[] {
    const ctx = this.bctx;
    const items: LabelItem[] = [];
    const placed: [number, number, number, number][] = [];
    const fits = (x: number, y: number, w: number, h: number) => {
      for (const r of placed) if (x < r[2] && x + w > r[0] && y < r[3] && y + h > r[1]) return false;
      return true;
    };
    const place = (text: string, p: [number, number], size: number, weight: number, f?: PolityFeature, sizePx?: number) => {
      ctx.font = `${weight} ${size}px system-ui, sans-serif`;
      const tw = ctx.measureText(text).width;
      const box: [number, number, number, number] = [p[0] - tw / 2 - 3, p[1] - size / 2 - 2, p[0] + tw / 2 + 3, p[1] + size / 2 + 2];
      if (box[0] < 0 || box[2] > this.w || box[1] < 0 || box[3] > this.h) return;
      if (!fits(box[0], box[1], box[2] - box[0], box[3] - box[1])) return;
      placed.push(box);
      items.push({ text, p, size, weight, tw, f, sizePx });
    };
    const sorted = feats.filter((f) => f.props.n && f.props.l).sort((a, b) => b.props.a - a.props.a);
    let count = 0;
    for (const f of sorted) {
      if (count > 160) break;
      const [lon, lat] = f.props.l!;
      const pxPerKm = this.view.k / EARTH_RADIUS_KM / Math.cos((lat * Math.PI) / 180);
      const sizePx = Math.sqrt(f.props.a) * pxPerKm;
      if (sizePx < 28) continue;
      const p = proj([lon, lat]);
      if (!p) continue;
      const size = sizePx > 220 ? 13 : 11;
      const text = f.props.n.length > 28 && sizePx < 260 ? f.props.n.slice(0, 26) + "…" : f.props.n;
      ctx.font = `600 ${size}px system-ui, sans-serif`;
      if (ctx.measureText(text).width > sizePx * 1.6) continue;
      place(text, p as [number, number], size, 600, f, sizePx);
      count++;
    }
    if (states) {
      for (const f of states.features) {
        if (f.props.x || !f.props.c || !f.props.l) continue;
        const p = proj(f.props.l);
        if (p) place(f.props.c, p as [number, number], 10, 500);
      }
    }
    return items;
  }

  private paintLabels(ctx: CanvasRenderingContext2D, items: LabelItem[]) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    for (const it of items) {
      ctx.font = `${it.weight} ${it.size}px system-ui, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = COLORS.halo;
      ctx.strokeText(it.text, it.p[0], it.p[1]);
      ctx.fillStyle = COLORS.label;
      ctx.fillText(it.text, it.p[0], it.p[1]);
    }
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  private drawClaimLabels(ctx: CanvasRenderingContext2D, proj: ReturnType<typeof projectionFor>) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 11px system-ui, sans-serif";
    ctx.lineJoin = "round";
    const placed: [number, number, number, number][] = [];
    for (const c of this.claims) {
      const tw = ctx.measureText(c.label).width;
      // overlapping claims share a longitude, so try a few heights and use the first free spot
      let p: [number, number] | null = null;
      for (const lat of [c.at[1], c.at[1] + 4, c.at[1] - 4, c.at[1] + 8]) {
        const q = proj([c.at[0], lat]);
        if (!q || q[0] < 0 || q[0] > this.w || q[1] < 0 || q[1] > this.h) continue;
        const box: [number, number, number, number] = [q[0] - tw / 2 - 4, q[1] - 9, q[0] + tw / 2 + 4, q[1] + 9];
        if (placed.some((r) => box[0] < r[2] && box[2] > r[0] && box[1] < r[3] && box[3] > r[1])) continue;
        placed.push(box);
        p = q as [number, number];
        break;
      }
      if (!p) continue;
      // only label wedges that are wide enough on screen for the text
      const edge = proj([c.at[0] + 8, c.at[1]]);
      if (!edge || Math.abs(edge[0] - p[0]) * 2 < tw * 0.8) continue;
      ctx.lineWidth = 3;
      ctx.strokeStyle = COLORS.halo;
      ctx.strokeText(c.label, p[0], p[1]);
      ctx.fillStyle = c.color;
      ctx.fillText(c.label, p[0], p[1]);
    }
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  private pattern(color: string, alpha: number) {
    const key = `${color}:${alpha}`;
    if (!this.patterns.has(key)) {
      const c = document.createElement("canvas");
      c.width = c.height = 8;
      const p = c.getContext("2d")!;
      p.strokeStyle = hexToRgba(color, alpha + 0.25);
      p.lineWidth = 1.4;
      p.beginPath();
      p.moveTo(0, 8);
      p.lineTo(8, 0);
      p.moveTo(-2, 2);
      p.lineTo(2, -2);
      p.moveTo(6, 10);
      p.lineTo(10, 6);
      p.stroke();
      this.patterns.set(key, this.tctx.createPattern(c, "repeat"));
    }
    return this.patterns.get(key)!;
  }

  private placed(o: Overlay) {
    const key = `${o.id}|${o.era}|${o.name}|${o.lon.toFixed(3)}|${o.lat.toFixed(3)}|${o.rot}`;
    let g = this.placedCache.get(key);
    if (!g) {
      g = o.moved || o.rot ? placeGeometry(o.geom, o.origin, [o.lon, o.lat], o.rot) : o.geom;
      if (this.placedCache.size > 200) this.placedCache.clear();
      this.placedCache.set(key, g);
    }
    return g;
  }

  private drawTop(projs: ReturnType<typeof projectionFor>[]) {
    const ctx = this.tctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    this.paths.clear();
    const world = this.worldRect();
    ctx.save();
    ctx.beginPath();
    ctx.rect(world.x, world.y, world.w, world.h);
    ctx.clip();
    for (const o of this.overlays) {
      const p2d = new Path2D();
      for (const proj of projs) geoPath(proj, p2d as unknown as CanvasRenderingContext2D)(this.placed(o) as GeoPermissibleObjects);
      this.paths.set(o.id, p2d);
      const color = PALETTE[o.color % PALETTE.length];
      const sel = o.id === this.selected;
      ctx.fillStyle = hexToRgba(color, sel ? 0.4 : 0.32);
      ctx.fill(p2d);
      ctx.fillStyle = this.pattern(color, 0.45) ?? "transparent";
      ctx.fill(p2d);
      if (o.sliced) continue;
      const lines = seamlessOutline(o.geom, this.placed(o));
      let edge = p2d;
      if (lines) {
        edge = new Path2D();
        for (const proj of projs) geoPath(proj, edge as unknown as CanvasRenderingContext2D)(lines);
      }
      ctx.lineJoin = "round";
      ctx.lineWidth = sel ? 6 : 4;
      ctx.strokeStyle = "rgba(255, 252, 245, 0.9)";
      ctx.stroke(edge);
      ctx.lineWidth = sel ? 2.8 : 2.2;
      ctx.strokeStyle = color;
      ctx.stroke(edge);
    }
    ctx.restore();
    if (!this.labels) return;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    const taken: [number, number, number][] = []; // x, y, half-width of labels already drawn
    for (const proj of projs) {
      for (const o of this.overlays) {
        const p = proj([o.lon, o.lat]);
        if (!p) continue;
        ctx.font = "700 13px system-ui, sans-serif";
        const text = o.name.length > 30 ? o.name.slice(0, 28) + "…" : o.name;
        const half = ctx.measureText(text).width / 2;
        let y = p[1];
        // nudge down until it no longer overlaps another shape's label
        for (let guard = 0; guard < 6 && taken.some(([tx, ty, th]) => Math.abs(tx - p[0]) < th + half && Math.abs(ty - y) < 16); guard++) y += 17;
        taken.push([p[0], y, half]);
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(255, 250, 240, 0.95)";
        ctx.strokeText(text, p[0], y);
        ctx.fillStyle = "#24160F";
        ctx.fillText(text, p[0], y);
      }
    }
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  // ---------- hit testing ----------

  private local(e: PointerEvent | MouseEvent | WheelEvent) {
    const r = this.top.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private hitOverlay(x: number, y: number): Overlay | null {
    const ctx = this.tctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (let i = this.overlays.length - 1; i >= 0; i--) {
      const o = this.overlays[i];
      const p = this.paths.get(o.id);
      if (p && ctx.isPointInPath(p, x * this.dpr, y * this.dpr)) return o;
    }
    return null;
  }

  /** Fingers are less precise than a mouse: also count a tap that lands just outside a shape. */
  private hitOverlayNear(x: number, y: number, radius: number): Overlay | null {
    const direct = this.hitOverlay(x, y);
    if (direct) return direct;
    for (const r of [radius / 2, radius])
      for (let a = 0; a < 8; a++) {
        const hit = this.hitOverlay(x + r * Math.cos((a * Math.PI) / 4), y + r * Math.sin((a * Math.PI) / 4));
        if (hit) return hit;
      }
    return null;
  }

  /** The band the map covers on screen: full width (the world repeats sideways), 2π·k tall. Taller than the screen unless zoomed far out. */
  private worldRect() {
    const size = 2 * Math.PI * this.view.k;
    const top = this.h / 2 + this.view.k * this.view.y - size / 2;
    return { x: 0, y: top, w: this.w, h: size };
  }

  lonLatAt(x: number, y: number): LonLat | null {
    const proj = projectionFor(this.view, this.w, this.h);
    const ll = proj.invert?.([x, y]);
    if (!ll || !Number.isFinite(ll[0])) return null;
    return [normLon(ll[0]), ll[1]];
  }

  featureAt(lon: number, lat: number): PolityFeature | null {
    return this.layer ? featureAtIn(this.layer, lon, lat) : null;
  }

  // ---------- events ----------

  private onPointerDown = (e: PointerEvent) => {
    if (e.button === 2) return;
    this.hoverAt = null;
    this.top.setPointerCapture(e.pointerId);
    const { x, y } = this.local(e);
    this.pointers.set(e.pointerId, { x, y });
    cancelAnimationFrame(this.flight);
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      if (this.gesture?.kind === "drag") this.finishDrag();
      this.gesture = { kind: "pinch", dist: Math.hypot(a.x - b.x, a.y - b.y), midX: (a.x + b.x) / 2, midY: (a.y + b.y) / 2 };
      return;
    }
    const hit = e.pointerType === "mouse" ? this.hitOverlay(x, y) : this.hitOverlayNear(x, y, 16);
    if (hit) {
      // bring to front
      this.overlays = [...this.overlays.filter((o) => o.id !== hit.id), hit];
      this.selected = hit.id;
      this.cb.onSelect(hit.id);
      const proj = projectionFor(this.view, this.w, this.h);
      const a = proj([hit.lon, hit.lat]) ?? [x, y];
      this.gesture = { kind: "drag", id: hit.id, startX: x, startY: y, anchorPx: [a[0], a[1]], moved: false };
      this.top.style.cursor = "grabbing";
      this.markTop();
    } else {
      this.gesture = { kind: "pan", startX: x, startY: y, lastX: x, lastY: y, moved: false, t: performance.now() };
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    const { x, y } = this.local(e);
    if (!this.pointers.has(e.pointerId)) {
      if (e.pointerType === "mouse") {
        this.top.style.cursor = this.hitOverlay(x, y) ? "grab" : "default";
        // hover edge scrolling (mouse only: touch screens can't hover)
        const atEdge = this.atEdge(x, y);
        this.hoverAt = atEdge ? { x, y, since: this.hoverAt?.since || performance.now() } : null;
        if (atEdge) this.edgeScroll();
      }
      return;
    }
    this.pointers.set(e.pointerId, { x, y });
    const g = this.gesture;
    if (!g) return;
    if (g.kind === "pinch" && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      let v = panBy(this.view, midX - g.midX, midY - g.midY, this.w, this.h);
      v = zoomAt(v, dist / Math.max(1, g.dist), midX, midY, this.w, this.h);
      this.view = v;
      this.gesture = { kind: "pinch", dist, midX, midY };
      this.viewChanged();
    } else if (g.kind === "pan") {
      if (!g.moved && Math.hypot(x - g.startX, y - g.startY) > 4) g.moved = true;
      if (g.moved) {
        this.view = panBy(this.view, x - g.lastX, y - g.lastY, this.w, this.h);
        g.lastX = x;
        g.lastY = y;
        this.viewChanged();
      }
    } else if (g.kind === "drag") {
      if (!g.moved && Math.hypot(x - g.startX, y - g.startY) > 3) g.moved = true;
      if (!g.moved) return;
      this.pointerAt = { x, y };
      this.dragTo(x, y);
      this.edgeScroll();
    }
  };

  /** Put the dragged shape under the pointer (screen position → lon/lat in the current view). */
  private dragTo(x: number, y: number) {
    const g = this.gesture;
    if (g?.kind !== "drag") return;
    const ll = this.lonLatAt(g.anchorPx[0] + (x - g.startX), g.anchorPx[1] + (y - g.startY));
    if (!ll) return;
    const o = this.overlays.find((v) => v.id === g.id);
    if (!o) return;
    o.lon = ll[0];
    o.lat = Math.max(-80, Math.min(80, ll[1]));
    o.moved = true;
    this.markTop();
    const now = performance.now();
    if (now - this.lastMoveEmit > 120) {
      this.lastMoveEmit = now;
      this.cb.onOverlayMove(o.id, o.lon, o.lat, false);
    }
  }

  /** Speed (px per frame) for a pointer `d` px from an edge: 0 outside the edge band, faster the closer it gets. */
  private edgeSpeed(d: number) {
    const band = Math.max(36, Math.min(72, Math.min(this.w, this.h) * 0.08));
    return d >= band ? 0 : 3 + ((band - Math.max(0, d)) / band) ** 1.5 * 15;
  }

  private atEdge(x: number, y: number) {
    return this.edgeSpeed(x) > 0 || this.edgeSpeed(this.w - x) > 0 || this.edgeSpeed(y) > 0 || this.edgeSpeed(this.h - y) > 0;
  }

  /**
   * Scroll the map while the pointer sits near an edge: when dragging a shape (it travels with the map, so it can go
   * anywhere in one drag), or when the mouse simply rests there (after a short pause, gentler, so passing through the
   * edge on the way to a button doesn't move the map).
   */
  private edgeScroll() {
    if (this.edgeRaf) return;
    const HOVER_DELAY = 300;
    const tick = () => {
      this.edgeRaf = 0;
      const g = this.gesture;
      const dragging = g?.kind === "drag" && g.moved && this.pointerAt;
      const p = dragging ? this.pointerAt : !g ? this.hoverAt : null;
      if (!p || !this.atEdge(p.x, p.y)) return;
      if (!dragging && performance.now() - (this.hoverAt?.since ?? 0) < HOVER_DELAY) {
        this.edgeRaf = requestAnimationFrame(tick); // still waiting out the pause
        return;
      }
      const k = dragging ? 1 : 0.6;
      const dx = (this.edgeSpeed(p.x) - this.edgeSpeed(this.w - p.x)) * k;
      const dy = (this.edgeSpeed(p.y) - this.edgeSpeed(this.h - p.y)) * k;
      const before = this.view;
      this.view = panBy(this.view, dx, dy, this.w, this.h);
      const stuck = this.view.lon === before.lon && this.view.y === before.y; // reached the top or bottom of the map
      if (!stuck) {
        this.viewChanged();
        if (dragging) this.dragTo(p.x, p.y);
      }
      if (!stuck || dx) this.edgeRaf = requestAnimationFrame(tick);
    };
    this.edgeRaf = requestAnimationFrame(tick);
  }

  private onPointerLeave = () => {
    this.hoverAt = null;
  };

  private finishDrag() {
    const g = this.gesture;
    if (g?.kind !== "drag") return;
    const o = this.overlays.find((v) => v.id === g.id);
    if (o && g.moved) this.cb.onOverlayMove(o.id, o.lon, o.lat, true);
  }

  private onPointerUp = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    cancelAnimationFrame(this.edgeRaf);
    this.edgeRaf = 0;
    this.pointerAt = null;
    const g = this.gesture;
    if (g?.kind === "drag") {
      this.finishDrag();
      this.top.style.cursor = "grab";
    } else if (g?.kind === "pan" && !g.moved && e.type === "pointerup") {
      const { x, y } = this.local(e);
      const world = this.worldRect();
      // a click on the bars above or below the world does nothing
      const ll = y >= world.y && y <= world.y + world.h ? this.lonLatAt(x, y) : null;
      if (ll) {
        this.selected = null;
        this.cb.onSelect(null);
        this.cb.onMapClick(ll, this.featureAt(ll[0], ll[1]));
      }
    }
    if (this.pointers.size === 0) this.gesture = null;
    else if (g?.kind === "pinch") {
      const [p] = [...this.pointers.values()];
      this.gesture = { kind: "pan", startX: p.x, startY: p.y, lastX: p.x, lastY: p.y, moved: true, t: performance.now() };
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const { x, y } = this.local(e);
    const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    const factor = Math.exp(-Math.max(-300, Math.min(300, delta)) * (e.ctrlKey ? 0.01 : 0.0018));
    this.view = zoomAt(this.view, factor, x, y, this.w, this.h);
    this.viewChanged();
  };

  private onDblClick = (e: MouseEvent) => {
    const { x, y } = this.local(e);
    if (this.hitOverlay(x, y)) return;
    this.setView(zoomAt(this.view, 2, x, y, this.w, this.h), true);
  };

  private onContextMenu = (e: MouseEvent) => {
    const { x, y } = this.local(e);
    const hit = this.hitOverlay(x, y);
    if (hit) {
      e.preventDefault();
      this.cb.onRemove(hit.id);
    }
  };
}
