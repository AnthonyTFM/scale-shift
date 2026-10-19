// Canvas map engine: draws the era basemap + draggable real-size overlays, handles pan/zoom/drag.
// Framework-free on purpose so dragging stays at 60fps; React talks to it through a few setters and callbacks.
import { geoPath, type GeoPermissibleObjects } from "d3-geo";
import type { MultiPolygon } from "geojson";
import { featureAtIn, type Layer, type PolityFeature, type PolityProps } from "@/lib/data";
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

export const PALETTE = ["#E8366B", "#2F6FDE", "#E89A00", "#12976F", "#8A4FFF", "#E2561F", "#0A97A8", "#8C5A2B"];

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

/** Warm political-map pastels. The data assigns each owner an index so neighbours never match. */
export const POLITICAL = ["#F6C28B", "#F29E8E", "#F5D671", "#B6D98A", "#8DD0B8", "#C4ACE5", "#F2A6C6", "#E2B88E"];

const COLORS = {
  ocean: "#9FCBE0",
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

// Parallels as dense point lists: a 2-point line would be drawn as a great circle and bend across the map.
const PARALLELS: Record<number, [number, number][]> = Object.fromEntries(
  [-60, -30, 30, 60].map((lat) => [lat, Array.from({ length: 181 }, (_, i) => [-180 + i * 2, lat] as [number, number])]),
);

function hashIndex(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % POLITICAL.length;
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
  private highlight: string | null = null;
  private pin: LonLat | null = null;

  private overlays: Overlay[] = [];
  private selected: string | null = null;
  private placedCache = new Map<string, MultiPolygon>();
  private paths = new Map<string, Path2D>();
  private patterns = new Map<string, CanvasPattern | null>();

  private baseDirty = true;
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
  /** edge scrolling: while a shape is dragged near the screen edge, the map scrolls under it */
  private edgeRaf = 0;
  private pointerAt: { x: number; y: number } | null = null;

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
    this.top.addEventListener("pointercancel", this.onPointerUp);
    this.top.addEventListener("wheel", this.onWheel, { passive: false });
    this.top.addEventListener("dblclick", this.onDblClick);
    this.top.addEventListener("contextmenu", this.onContextMenu);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this.edgeRaf);
    cancelAnimationFrame(this.flight);
    this.ro.disconnect();
    this.top.removeEventListener("pointerdown", this.onPointerDown);
    this.top.removeEventListener("pointermove", this.onPointerMove);
    this.top.removeEventListener("pointerup", this.onPointerUp);
    this.top.removeEventListener("pointercancel", this.onPointerUp);
    this.top.removeEventListener("wheel", this.onWheel);
    this.top.removeEventListener("dblclick", this.onDblClick);
    this.top.removeEventListener("contextmenu", this.onContextMenu);
    this.base.remove();
    this.top.remove();
  }

  // ---------- public setters ----------

  setLayer(layer: Layer | null) {
    this.layer = layer;
    this.markBase();
  }
  setStates(states: Layer | null) {
    this.states = states;
    this.markBase();
  }
  setClaims(list: ClaimShape[]) {
    this.claims = list;
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
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [this.base, this.top]) {
      c.width = Math.round(this.w * this.dpr);
      c.height = Math.round(this.h * this.dpr);
    }
    this.view = clampView(this.view, this.w, this.h);
    this.viewChanged();
  }

  private drawNow() {
    const proj = projectionFor(this.view, this.w, this.h);
    if (this.baseDirty) {
      this.drawBase(proj);
      this.baseDirty = false;
    }
    if (this.topDirty) {
      this.drawTop(proj);
      this.topDirty = false;
    }
  }

  /** Visible lon/lat window, used to skip off-screen shapes. */
  private visibleBox() {
    const halfLon = (this.w / 2 / this.view.k) * (180 / Math.PI);
    const top = latFromMercY(this.view.y + this.h / 2 / this.view.k);
    const bottom = latFromMercY(this.view.y - this.h / 2 / this.view.k);
    return { lon: this.view.lon, halfLon, top, bottom };
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

  private drawBase(proj: ReturnType<typeof projectionFor>) {
    const ctx = this.bctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = COLORS.ocean;
    ctx.fillRect(0, 0, this.w, this.h);
    const path = geoPath(proj, ctx);
    const vb = this.visibleBox();

    // skip shapes smaller than ~1px on screen
    const minDeg = (1.2 / this.view.k) * (180 / Math.PI);
    const feats =
      this.layer?.features.filter(
        (f) => !f.props.x && f.bbox[2] - f.bbox[0] + (f.bbox[3] - f.bbox[1]) > minDeg && this.isVisible(f.bbox, vb),
      ) ?? [];
    // Each era is drawn only from its own shapes (no separate coastline layer), so coasts and borders always line up.
    const shapes = feats.map((f) => {
      const p2d = new Path2D();
      geoPath(proj, p2d as unknown as CanvasRenderingContext2D)(f.geom as GeoPermissibleObjects);
      const fill = f.props.n ? POLITICAL[f.props.k ?? hashIndex(f.props.s || f.props.n)] : COLORS.land;
      return { f, p2d, fill };
    });
    // pass 1: fill, and stroke in the same colour to seal hairline gaps between neighbouring shapes
    ctx.lineJoin = "round";
    ctx.lineWidth = 1.2;
    const hatch = this.pattern(COLORS.dispute, 0.35);
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
    for (const { f, p2d } of shapes) {
      if (f.props.m) continue; // land filled in where the source has a gap: no outline
      if (f.props.n) {
        ctx.setLineDash(f.props.b >= 2 ? [] : [3, 3]);
        ctx.strokeStyle = COLORS.border;
      } else {
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = COLORS.borderSoft;
      }
      ctx.stroke(p2d);
    }
    ctx.setLineDash([]);

    // claim wedges (Antarctica): tinted and hatched in the claimant's colour, so overlapping claims show through each other
    for (const c of this.claims) {
      const p2d = new Path2D();
      geoPath(proj, p2d as unknown as CanvasRenderingContext2D)(c.geom as GeoPermissibleObjects);
      ctx.fillStyle = hexToRgba(c.color, 0.18);
      ctx.fill(p2d);
      const hatch = this.pattern(c.color, 0.3);
      if (hatch) {
        ctx.fillStyle = hatch;
        ctx.fill(p2d);
      }
      ctx.setLineDash([5, 3]);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = hexToRgba(c.color, 0.9);
      ctx.stroke(p2d);
    }
    ctx.setLineDash([]);

    // US state lines on the present-day map once zoomed in: shared borders only, clipped to the US coastline
    const showStates = this.states?.mesh && this.layer?.key === "present" && this.view.k > minScale(this.w, this.h) * 2.2;
    const usa = this.layer?.byName.get("United States");
    if (showStates && this.states?.mesh && usa) {
      ctx.save();
      const clip = new Path2D();
      geoPath(proj, clip as unknown as CanvasRenderingContext2D)(usa.geom as GeoPermissibleObjects);
      ctx.clip(clip);
      ctx.beginPath();
      path(this.states.mesh);
      ctx.strokeStyle = COLORS.stateLine;
      ctx.lineWidth = 0.7;
      ctx.stroke();
      ctx.restore();
    }

    if (this.highlight && this.layer) {
      const f = this.layer.byName.get(this.highlight);
      if (f) {
        ctx.beginPath();
        path(f.geom as GeoPermissibleObjects);
        ctx.strokeStyle = "#2A1A12";
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }
    }

    // equator (dashed, like the reference) + faint graticule
    ctx.beginPath();
    for (let lat = -60; lat <= 60; lat += 30) {
      if (lat === 0) continue;
      path({ type: "LineString", coordinates: PARALLELS[lat] });
    }
    ctx.strokeStyle = COLORS.graticule;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    path({ type: "LineString", coordinates: [[-180, 0], [-90, 0], [0, 0], [90, 0], [180, 0]] });
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = COLORS.equator;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    const eq = proj([this.view.lon, 0]);
    if (eq && eq[1] > 12 && eq[1] < this.h - 4) {
      ctx.font = "600 10px system-ui, sans-serif";
      ctx.fillStyle = COLORS.equator;
      ctx.fillText("EQUATOR", 8, eq[1] - 5);
    }

    if (this.labels) {
      this.drawLabels(ctx, proj, feats, showStates ? this.states : null);
      this.drawClaimLabels(ctx, proj);
    }

    if (this.pin) {
      const p = proj(this.pin);
      if (p) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], 7, 0, Math.PI * 2);
        ctx.fillStyle = "#2A1A12";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p[0], p[1], 3, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
      }
    }
  }

  private drawLabels(
    ctx: CanvasRenderingContext2D,
    proj: ReturnType<typeof projectionFor>,
    feats: PolityFeature[],
    states: Layer | null,
  ) {
    const placed: [number, number, number, number][] = [];
    const fits = (x: number, y: number, w: number, h: number) => {
      for (const r of placed) if (x < r[2] && x + w > r[0] && y < r[3] && y + h > r[1]) return false;
      return true;
    };
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    const draw = (text: string, p: [number, number], size: number, weight: number) => {
      ctx.font = `${weight} ${size}px system-ui, sans-serif`;
      const tw = ctx.measureText(text).width;
      const box: [number, number, number, number] = [p[0] - tw / 2 - 3, p[1] - size / 2 - 2, p[0] + tw / 2 + 3, p[1] + size / 2 + 2];
      if (box[0] < 0 || box[2] > this.w || box[1] < 0 || box[3] > this.h) return;
      if (!fits(box[0], box[1], box[2] - box[0], box[3] - box[1])) return;
      placed.push(box);
      ctx.lineWidth = 3;
      ctx.strokeStyle = COLORS.halo;
      ctx.strokeText(text, p[0], p[1]);
      ctx.fillStyle = COLORS.label;
      ctx.fillText(text, p[0], p[1]);
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
      draw(text, p as [number, number], size, 600);
      count++;
    }
    if (states) {
      for (const f of states.features) {
        if (f.props.x || !f.props.c || !f.props.l) continue;
        const p = proj(f.props.l);
        if (p) draw(f.props.c, p as [number, number], 10, 500);
      }
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

  private drawTop(proj: ReturnType<typeof projectionFor>) {
    const ctx = this.tctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    this.paths.clear();
    for (const o of this.overlays) {
      const p2d = new Path2D();
      geoPath(proj, p2d as unknown as CanvasRenderingContext2D)(this.placed(o) as GeoPermissibleObjects);
      this.paths.set(o.id, p2d);
      const color = PALETTE[o.color % PALETTE.length];
      const sel = o.id === this.selected;
      ctx.fillStyle = hexToRgba(color, sel ? 0.4 : 0.32);
      ctx.fill(p2d);
      ctx.fillStyle = this.pattern(color, 0.45) ?? "transparent";
      ctx.fill(p2d);
      ctx.lineJoin = "round";
      ctx.lineWidth = sel ? 6 : 4;
      ctx.strokeStyle = "rgba(255, 252, 245, 0.9)";
      ctx.stroke(p2d);
      ctx.lineWidth = sel ? 2.8 : 2.2;
      ctx.strokeStyle = color;
      ctx.stroke(p2d);
    }
    if (!this.labels) return;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    const taken: [number, number, number][] = []; // x, y, half-width of labels already drawn
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
    const hit = this.hitOverlay(x, y);
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

  /** While a shape is dragged near the edge of the screen, keep scrolling the map so it can travel anywhere in one drag. */
  private edgeScroll() {
    if (this.edgeRaf) return;
    const tick = () => {
      this.edgeRaf = 0;
      const g = this.gesture;
      const p = this.pointerAt;
      if (g?.kind !== "drag" || !g.moved || !p) return;
      const dx = this.edgeSpeed(p.x) - this.edgeSpeed(this.w - p.x);
      const dy = this.edgeSpeed(p.y) - this.edgeSpeed(this.h - p.y);
      if (!dx && !dy) return;
      const before = this.view;
      this.view = panBy(this.view, dx, dy, this.w, this.h);
      if (this.view.lon === before.lon && this.view.y === before.y) return; // reached the top or bottom of the map
      this.viewChanged();
      this.dragTo(p.x, p.y);
      this.edgeRaf = requestAnimationFrame(tick);
    };
    this.edgeRaf = requestAnimationFrame(tick);
  }

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
      const ll = this.lonLatAt(x, y);
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
