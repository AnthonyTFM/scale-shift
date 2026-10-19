"use client";

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { geoGraticule10, geoMercator, geoPath, type GeoPath, type GeoProjection } from "d3-geo";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import type { YearData } from "@/lib/data";
import { centreOf, clampLat, coversPole, mercatorInflation, relocate, wrapLon } from "@/lib/geo";
import { formatKm2, formatMi2, formatPopulation, yearLabel } from "@/lib/format";
import type { Entity, Overlay, Shape } from "@/lib/types";

export interface ResolvedOverlay {
  overlay: Overlay;
  entity: Entity | undefined;
  shape: Shape | null;
  area: number | undefined;
  /** follows the timeline but has no map in the selected year */
  missing: boolean;
}

interface Props {
  today: YearData | null;
  background: YearData | null;
  showBorders: boolean;
  sliderYear: number;
  overlays: ResolvedOverlay[];
  selectedUid: string | null;
  entityById: Map<string, Entity>;
  years: number[];
  onSelect: (uid: string | null) => void;
  onMove: (uid: string, pos: [number, number]) => void;
  onRotate: (uid: string, delta: number) => void;
  onRemove: (uid: string) => void;
  onPickTerritory: (id: string, year: number) => void;
  onDragEnd: (uid: string) => void;
  /** fit the view to the overlays once they first appear */
  fitOnLoad: boolean;
}

type Hover =
  | { kind: "overlay"; uid: string; x: number; y: number }
  | { kind: "territory"; id: string; x: number; y: number }
  | null;

const PIGMENTS = 8;
const pigment = (i: number) => `var(--pigment-${((i % PIGMENTS) + PIGMENTS) % PIGMENTS})`;

/* ---------- static layers (memoised: they only change on resize or new data) ---------- */

// Path strings are cached per generator so the land and borders layers share the work.
const pathCache = new WeakMap<GeoPath, WeakMap<Shape, string>>();
function dOf(path: GeoPath, shape: Shape): string {
  let m = pathCache.get(path);
  if (!m) {
    m = new WeakMap();
    pathCache.set(path, m);
  }
  let d = m.get(shape);
  if (d === undefined) {
    d = path(shape) ?? "";
    m.set(shape, d);
  }
  return d;
}

const CHUNK = 24;
function chunks<T>(list: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += CHUNK) out.push(list.slice(i, i + CHUNK));
  return out;
}

// Small components so a concurrent render can pause between them and keep the page responsive.
const LandChunk = memo(function LandChunk({ shapes, path }: { shapes: Shape[]; path: GeoPath }) {
  const d = useMemo(() => shapes.map((s) => dOf(path, s)).join(""), [shapes, path]);
  return <path d={d} fill="var(--land)" stroke="var(--land-edge)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />;
});

const LandLayer = memo(function LandLayer({ data, path }: { data: YearData | null; path: GeoPath }) {
  const parts = useMemo(() => (data ? chunks(data.territories) : []), [data]);
  return (
    <g>
      {parts.map((p, i) => (
        <LandChunk key={i} shapes={p} path={path} />
      ))}
    </g>
  );
});

interface TerritoryHandlers {
  onEnter: (id: string, e: React.PointerEvent) => void;
  onLeave: () => void;
  onPick: (id: string) => void;
}

const TerritoryChunk = memo(function TerritoryChunk({ shapes, path, onEnter, onLeave, onPick }: { shapes: Shape[]; path: GeoPath } & TerritoryHandlers) {
  return (
    <>
      {shapes.map((s) => {
        const id = String(s.id);
        const d = dOf(path, s);
        if (!d) return null;
        return (
          <path
            key={id}
            d={d}
            className="territory"
            data-territory={id}
            fill="rgba(255,255,255,0)"
            stroke="var(--border-line)"
            strokeWidth={0.7}
            vectorEffect="non-scaling-stroke"
            onPointerEnter={(e) => onEnter(id, e)}
            onPointerMove={(e) => onEnter(id, e)}
            onPointerLeave={onLeave}
            onClick={() => onPick(id)}
          />
        );
      })}
    </>
  );
});

const TerritoryLayer = memo(function TerritoryLayer({ data, path, onEnter, onLeave, onPick }: { data: YearData; path: GeoPath } & TerritoryHandlers) {
  const parts = useMemo(() => chunks(data.territories), [data]);
  return (
    <g>
      {parts.map((p, i) => (
        <TerritoryChunk key={i} shapes={p} path={path} onEnter={onEnter} onLeave={onLeave} onPick={onPick} />
      ))}
    </g>
  );
});

const OverlayShape = memo(function OverlayShape({
  r,
  path,
  selected,
  onPointerDown,
  onEnter,
  onLeave,
  onContext,
  onKey,
  label,
}: {
  r: ResolvedOverlay;
  path: GeoPath;
  selected: boolean;
  onPointerDown: (uid: string, e: React.PointerEvent<SVGPathElement>) => void;
  onEnter: (uid: string, e: React.PointerEvent) => void;
  onLeave: () => void;
  onContext: (uid: string, e: React.MouseEvent) => void;
  onKey: (uid: string, e: React.KeyboardEvent) => void;
  label: string;
}) {
  const { overlay, shape } = r;
  const d = useMemo(() => {
    if (!shape) return "";
    if (!overlay.pos && !overlay.rot) return path(shape) ?? "";
    const home = centreOf(shape);
    return path(relocate(shape, home, overlay.pos ?? home, overlay.rot)) ?? "";
  }, [shape, overlay.pos, overlay.rot, path]);
  if (!d) return null;
  const color = pigment(overlay.color);
  return (
    <path
      d={d}
      data-overlay={overlay.uid}
      className="overlay-shape"
      fill={color}
      fillOpacity={r.missing ? 0.2 : selected ? 0.62 : 0.5}
      stroke={selected ? "#fff" : color}
      strokeWidth={selected ? 2.4 : 1.6}
      strokeDasharray={r.missing ? "5 4" : undefined}
      vectorEffect="non-scaling-stroke"
      tabIndex={0}
      role="button"
      aria-label={label}
      aria-pressed={selected}
      onPointerDown={(e) => onPointerDown(overlay.uid, e)}
      onPointerEnter={(e) => onEnter(overlay.uid, e)}
      onPointerMove={(e) => onEnter(overlay.uid, e)}
      onPointerLeave={onLeave}
      onContextMenu={(e) => onContext(overlay.uid, e)}
      onKeyDown={(e) => onKey(overlay.uid, e)}
    />
  );
});

/* ---------- canvas ---------- */

export function MapCanvas(props: Props) {
  const {
    today,
    background,
    showBorders,
    sliderYear,
    overlays,
    selectedUid,
    entityById,
    years,
    onSelect,
    onMove,
    onRotate,
    onRemove,
    onPickTerritory,
    onDragEnd,
    fitOnLoad,
  } = props;

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const ztRef = useRef<ZoomTransform>(zoomIdentity);
  const [zt, setZt] = useState<ZoomTransform>(zoomIdentity);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<Hover>(null);
  const fittedRef = useRef(false);
  const viewWidthRef = useRef(0);

  // size
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = size;
  // The world is a w×w square in base coordinates, independent of the viewport height.
  const projection = useMemo<GeoProjection>(
    () =>
      geoMercator()
        .scale(Math.max(w, 1) / (2 * Math.PI))
        .translate([Math.max(w, 1) / 2, Math.max(w, 1) / 2]),
    [w],
  );
  // one decimal place is sub-pixel at any zoom we allow and halves the size of the path strings
  const path = useMemo(() => geoPath(projection).digits(1), [projection]);
  const graticule = useMemo(() => path(geoGraticule10()) ?? "", [path]);

  const minK = w && h ? Math.max(1, h / w) : 1;

  // zoom behaviour
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !w || !h) return;
    let raf = 0;
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([minK, 64])
      .translateExtent([
        [0, 0],
        [w, w],
      ])
      .extent([
        [0, 0],
        [w, h],
      ])
      .filter((event: Event & { button?: number; ctrlKey?: boolean; type: string; target: EventTarget | null }) => {
        const target = event.target as Element | null;
        if (target?.closest?.("[data-overlay]")) return false;
        return (!event.ctrlKey || event.type === "wheel") && !event.button;
      })
      .on("zoom", (ev: { transform: ZoomTransform }) => {
        ztRef.current = ev.transform;
        gRef.current?.setAttribute("transform", ev.transform.toString());
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => setZt(ev.transform));
      });
    zoomRef.current = z;
    const sel = select(svg);
    sel.call(z).on("dblclick.zoom", null);

    if (viewWidthRef.current !== w) {
      // first layout or width change: start on the default view
      viewWidthRef.current = w;
      const k = minK;
      const [x, y] = projection([12, 28]) ?? [w / 2, w / 2];
      sel.call(z.transform, zoomIdentity.translate(w / 2 - k * x, h / 2 - k * y).scale(k));
    } else {
      sel.call(z.transform, ztRef.current);
    }
    return () => {
      cancelAnimationFrame(raf);
      sel.on(".zoom", null);
    };
  }, [w, h, minK, projection]);

  // fit to the overlays on first load (shared links and comparison pages)
  useEffect(() => {
    if (!fitOnLoad || fittedRef.current || !w || !h || !zoomRef.current || !svgRef.current) return;
    const drawn = overlays.filter((o) => o.shape);
    if (!drawn.length || drawn.length < overlays.length) return;
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    for (const o of drawn) {
      const s = o.shape!;
      const home = centreOf(s);
      const moved = o.overlay.pos || o.overlay.rot ? relocate(s, home, o.overlay.pos ?? home, o.overlay.rot) : s;
      const [[a, b], [c, d]] = path.bounds(moved);
      if (c - a > w * 0.9) continue; // shape wraps the antimeridian; skip it for fitting
      x0 = Math.min(x0, a);
      y0 = Math.min(y0, b);
      x1 = Math.max(x1, c);
      y1 = Math.max(y1, d);
    }
    fittedRef.current = true;
    if (!Number.isFinite(x0)) return;
    // leave room for the panel: a left column on desktop, a bottom sheet on phones
    const left = w >= 768 ? 352 : 0;
    const bottom = w >= 768 ? 0 : 150;
    const vw = w - left;
    const vh = h - bottom;
    const pad = 0.8;
    const k = Math.max(minK, Math.min(10, pad * Math.min(vw / (x1 - x0), vh / (y1 - y0))));
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    select(svgRef.current).call(
      zoomRef.current.transform,
      zoomIdentity.translate(left + vw / 2 - k * cx, vh / 2 - k * cy).scale(k),
    );
  }, [fitOnLoad, overlays, path, w, h, minK]);

  const zoomBy = useCallback((factor: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    select(svgRef.current).call(zoomRef.current.scaleBy, factor);
  }, []);

  /* ---------- dragging ---------- */
  const dragRef = useRef<{
    uid: string;
    off: [number, number];
    startX: number;
    startY: number;
    moved: boolean;
    pointerId: number;
  } | null>(null);
  const rafMove = useRef(0);

  const toBase = useCallback((clientX: number, clientY: number): [number, number] => {
    const rect = svgRef.current!.getBoundingClientRect();
    return ztRef.current.invert([clientX - rect.left, clientY - rect.top]);
  }, []);

  const currentCentre = useCallback(
    (uid: string): [number, number] | null => {
      const r = overlays.find((o) => o.overlay.uid === uid);
      if (!r?.shape) return null;
      return r.overlay.pos ?? centreOf(r.shape);
    },
    [overlays],
  );

  /** Applies a move unless it would wrap the shape around a pole. */
  const safeMove = useCallback(
    (uid: string, to: [number, number]) => {
      const r = overlays.find((o) => o.overlay.uid === uid);
      if (!r?.shape) return;
      const home = centreOf(r.shape);
      if (coversPole(relocate(r.shape, home, to, r.overlay.rot))) return;
      onMove(uid, to);
    },
    [overlays, onMove],
  );

  const handlePointerDown = useCallback(
    (uid: string, e: React.PointerEvent<SVGPathElement>) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const c = currentCentre(uid);
      if (!c) return;
      const cp = projection(c);
      if (!cp) return;
      const base = toBase(e.clientX, e.clientY);
      dragRef.current = {
        uid,
        off: [cp[0] - base[0], cp[1] - base[1]],
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
        pointerId: e.pointerId,
      };
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      setHover(null);
      onSelect(uid);
    },
    [currentCentre, projection, toBase, onSelect],
  );

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 3) return;
      d.moved = true;
      const { clientX, clientY } = e;
      cancelAnimationFrame(rafMove.current);
      rafMove.current = requestAnimationFrame(() => {
        const base = toBase(clientX, clientY);
        const ll = projection.invert?.([base[0] + d.off[0], base[1] + d.off[1]]);
        if (ll) safeMove(d.uid, [wrapLon(ll[0]), clampLat(ll[1])]);
      });
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      if (d.moved) onDragEnd(d.uid);
      dragRef.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [projection, toBase, safeMove, onDragEnd]);

  const handleKey = useCallback(
    (uid: string, e: React.KeyboardEvent) => {
      const c = currentCentre(uid);
      const step = (e.shiftKey ? 8 : 2) / Math.sqrt(ztRef.current.k);
      let next: [number, number] | null = null;
      switch (e.key) {
        case "ArrowLeft":
          if (c) next = [c[0] - step, c[1]];
          break;
        case "ArrowRight":
          if (c) next = [c[0] + step, c[1]];
          break;
        case "ArrowUp":
          if (c) next = [c[0], c[1] + step];
          break;
        case "ArrowDown":
          if (c) next = [c[0], c[1] - step];
          break;
        case "[":
          onRotate(uid, -5);
          e.preventDefault();
          return;
        case "]":
          onRotate(uid, 5);
          e.preventDefault();
          return;
        case "Delete":
        case "Backspace":
          onRemove(uid);
          e.preventDefault();
          return;
        case "Enter":
        case " ":
          onSelect(uid);
          e.preventDefault();
          return;
        default:
          return;
      }
      if (next) {
        e.preventDefault();
        onSelect(uid);
        safeMove(uid, [wrapLon(next[0]), clampLat(next[1])]);
      }
    },
    [currentCentre, safeMove, onRotate, onRemove, onSelect],
  );

  const handleContext = useCallback(
    (uid: string, e: React.MouseEvent) => {
      e.preventDefault();
      onRemove(uid);
      setHover(null);
    },
    [onRemove],
  );

  const enterOverlay = useCallback((uid: string, e: React.PointerEvent) => {
    if (e.pointerType === "touch" || dragRef.current) return;
    const rect = wrapRef.current!.getBoundingClientRect();
    setHover({ kind: "overlay", uid, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);
  const enterTerritory = useCallback((id: string, e: React.PointerEvent) => {
    if (e.pointerType === "touch" || dragRef.current) return;
    const rect = wrapRef.current!.getBoundingClientRect();
    setHover({ kind: "territory", id, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);
  const leave = useCallback(() => setHover(null), []);
  const pick = useCallback(
    (id: string) => {
      if (background) onPickTerritory(id, background.year);
      setHover(null);
    },
    [background, onPickTerritory],
  );

  /* ---------- labels (screen space so text stays readable at any zoom) ---------- */
  const labels = useMemo(() => {
    return overlays
      .filter((o) => o.shape && o.entity)
      .map((o) => {
        const c = o.overlay.pos ?? centreOf(o.shape!);
        const p = projection(c);
        if (!p) return null;
        const [x, y] = zt.apply(p);
        const suffix = o.overlay.year !== sliderYear ? `, ${yearLabel(o.overlay.year)}` : "";
        return { uid: o.overlay.uid, x, y, text: `${o.entity!.n}${suffix}` };
      })
      .filter(Boolean) as { uid: string; x: number; y: number; text: string }[];
  }, [overlays, projection, zt, sliderYear]);

  /* ---------- tooltip ---------- */
  let tip: React.ReactNode = null;
  if (hover?.kind === "overlay") {
    const r = overlays.find((o) => o.overlay.uid === hover.uid);
    if (r?.entity && r.shape) {
      const c = r.overlay.pos ?? centreOf(r.shape);
      const inflation = mercatorInflation(c[1]);
      tip = (
        <>
          <p className="font-bold leading-tight">{r.entity.n}</p>
          <p className="text-ink-soft">{r.missing ? `Not mapped in ${yearLabel(sliderYear)}. Showing ${yearLabel(r.overlay.year)}.` : yearLabel(r.overlay.year)}</p>
          {r.area !== undefined && (
            <p className="mt-1">
              {formatKm2(r.area)}
              <span className="text-ink-soft"> ({formatMi2(r.area)})</span>
            </p>
          )}
          {r.entity.p && r.overlay.year === years[years.length - 1] ? <p>Population {formatPopulation(r.entity.p)}</p> : null}
          <p className="mt-1 text-ink-soft">
            {inflation >= 1.1
              ? `At this latitude the map draws it ${inflation.toFixed(1)}× larger than at the equator.`
              : "Near the equator the map shows it close to true size."}
          </p>
          <p className="mt-1 text-ink-soft">Drag to move. Right-click to remove.</p>
        </>
      );
    }
  } else if (hover?.kind === "territory" && background) {
    const e = entityById.get(hover.id);
    if (e) {
      const idx = years.indexOf(background.year);
      const j = e.y.indexOf(idx);
      tip = (
        <>
          <p className="font-bold leading-tight">{e.n}</p>
          <p className="text-ink-soft">{yearLabel(background.year)}</p>
          {j !== -1 && <p className="mt-1">{formatKm2(e.a[j])}</p>}
          <p className="mt-1 text-ink-soft">Click to pick it up</p>
        </>
      );
    }
  }

  const ready = Boolean(today && w);
  // borders redraw at lower priority so dragging the timeline never stutters
  const bg = useDeferredValue(showBorders ? background : null);

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden bg-ocean">
      {w > 0 && (
        <svg
          ref={svgRef}
          width={w}
          height={h}
          className="map-svg block"
          role="group"
          aria-label="World map in Mercator projection. Shapes you add can be dragged, or moved with the arrow keys when focused."
          onClick={(e) => {
            const t = e.target as Element;
            if (!t.closest("[data-overlay]") && !t.closest("[data-territory]")) onSelect(null);
          }}
        >
          <rect width={w} height={h} fill="var(--ocean)" />
          <g ref={gRef} transform={zt.toString()}>
            <path d={graticule} fill="none" stroke="var(--ocean-line)" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
            <LandLayer data={today} path={path} />
            {bg && <TerritoryLayer data={bg} path={path} onEnter={enterTerritory} onLeave={leave} onPick={pick} />}
            {overlays.map((r) => (
              <OverlayShape
                key={r.overlay.uid}
                r={r}
                path={path}
                selected={r.overlay.uid === selectedUid}
                onPointerDown={handlePointerDown}
                onEnter={enterOverlay}
                onLeave={leave}
                onContext={handleContext}
                onKey={handleKey}
                label={`${r.entity?.n ?? r.overlay.id}, ${yearLabel(r.overlay.year)}${r.area ? `, ${formatKm2(r.area)}` : ""}. Arrow keys move it, brackets rotate, Delete removes.`}
              />
            ))}
          </g>
          <g pointerEvents="none" aria-hidden="true">
            {labels.map((l) => (
              <text
                key={l.uid}
                x={l.x}
                y={l.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={13}
                fontWeight={700}
                fill="#fff"
                stroke="rgba(15,46,54,0.85)"
                strokeWidth={3.5}
                paintOrder="stroke"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {l.text}
              </text>
            ))}
          </g>
        </svg>
      )}

      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-paper" role="status">
          <span className="font-display text-2xl opacity-80">Loading map…</span>
        </div>
      )}

      {tip && hover && (
        <div
          className="pointer-events-none absolute z-20 max-w-[260px] rounded-lg bg-paper px-3 py-2 text-sm text-ink shadow-[0_6px_24px_rgba(0,0,0,0.35)]"
          style={{
            left: Math.min(hover.x + 16, Math.max(0, w - 270)),
            top: Math.min(hover.y + 16, Math.max(0, h - 170)),
          }}
          role="tooltip"
        >
          {tip}
        </div>
      )}

      <div className="absolute right-3 top-3 z-10 flex flex-col overflow-hidden rounded-full bg-paper/95 text-ink shadow-md">
        <button type="button" className="icon-btn" aria-label="Zoom in" onClick={() => zoomBy(1.6)}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <button type="button" className="icon-btn" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.6)}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M3 9h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
