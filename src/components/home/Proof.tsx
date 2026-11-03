"use client";

import { useEffect, useRef, useState } from "react";
import { POOL_V as V } from "@/lib/pool-version";
import { mainPart, withMapDrawing, type Outline, type ShapeFile } from "@/lib/outline";
import type { PoolEntry } from "@/lib/daily";

// the daily game's shape colours (fills only, never text)
const COLORS = ["#FF5B4A", "#2F6BFF"];
const W = 200;
const H = 110;
// shapes stand a little above the ground line, so a small island at the bottom never looks cut off by it
const GROUND = H - 6;

export const getJson = <T,>(url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(url);
    return r.json() as Promise<T>;
  });

/** Both shapes' drawings (a web map's and the real one), ready for the picture. */
export const loadPair = (options: [PoolEntry, PoolEntry]) =>
  Promise.all(options.map((o) => getJson<ShapeFile>(`/data/daily/shapes/${o.id}.json${V}`).then((f) => withMapDrawing(f, o)))) as Promise<
    [ShapeFile, ShapeFile]
  >;

/**
 * The proof, in one picture: both shapes stand side by side as a normal map draws them, then each shrinks (or grows) to its
 * real size, the way the daily game reveals an answer, leaving a pale tint of the map's drawing behind. All four drawings
 * share one scale (they're in the same units), so the change in size is exactly the map's error. It plays once, when the
 * card comes into view; a tap plays it again. With reduced motion it simply shows the real sizes over the map's tint.
 */
export function Proof({ shapes, label, mapLabel, realLabel, replay }: { shapes?: [ShapeFile, ShapeFile]; label: string; mapLabel: string; realLabel: string; replay: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [real, setReal] = useState(false);
  // jump back to the map's drawing without animating, so a replay can run again
  const [rewind, setRewind] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!shapes || !el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => setReal(true));
      return () => cancelAnimationFrame(id);
    }
    let timer = 0;
    const seen = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        seen.disconnect();
        // a moment at map size first, so the eye takes in the "before"
        timer = window.setTimeout(() => setReal(true), 1000);
      },
      { threshold: 0.6 },
    );
    seen.observe(el);
    return () => {
      seen.disconnect();
      clearTimeout(timer);
    };
  }, [shapes]);

  const again = () => {
    setRewind(true);
    setReal(false);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setRewind(false);
        setReal(true);
      }),
    );
  };

  const parts = shapes?.map((f) => ({ map: mainPart(f.merc), real: mainPart(f.ea) }));
  const span = (b: Outline["b"]) => [b[2] - b[0], b[3] - b[1]];
  // one scale that fits the biggest of the four drawings in its half of the picture
  const k = parts
    ? Math.min(
        ...parts.flatMap((p) =>
          [p.map.b, p.real.b].map((b) => {
            const [w, h] = span(b);
            return Math.min((W / 2 - 12) / Math.max(w, 1e-9), (H - 12) / Math.max(h, 1e-9));
          }),
        ),
      )
    : 1;
  const shown = real && !rewind;
  // the label turns to "Real size" as the shapes land (the shrink takes about 3 seconds), not when it starts
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    if (!shown) return queueMicrotask(() => setLanded(false));
    const id = window.setTimeout(() => setLanded(true), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 3200);
    return () => clearTimeout(id);
  }, [shown]);
  return (
    <div ref={ref}>
      {/* the whole picture is one button: a tap plays it again */}
      <button
        type="button"
        onClick={again}
        disabled={!shapes}
        aria-label={shapes ? `${replay}: ${label}` : label}
        className="block w-full cursor-pointer rounded-xl bg-white p-2 text-left ring-1 ring-line disabled:cursor-default"
      >
        <span className="flex items-center justify-between gap-1 text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted">
          <span className={landed ? "text-ink" : undefined}>{landed ? realLabel : mapLabel}</span>
          {shapes ? <span className="font-bold normal-case tracking-normal text-link">{replay}</span> : null}
        </span>
        <svg viewBox={`0 0 ${W} ${H}`} className={`proof-slow mt-1 block w-full ${rewind ? "[&_*]:!transition-none" : ""}`} aria-hidden="true">
          <line x1="4" x2={W - 4} y1={H - 1} y2={H - 1} className="stroke-line" />
          {parts?.map((p, i) => {
            const cx = (W / 2) * i + W / 4;
            const place = (b: Outline["b"]) => `translate(${cx} ${GROUND}) scale(${k}) translate(${-(b[0] + b[2]) / 2} ${-b[3]})`;
            const [mw, mh] = span(p.map.b);
            const [rw, rh] = span(p.real.b);
            const grow = Math.sqrt((rw * rh) / Math.max(mw * mh, 1e-9)) || 1;
            const tiny = Math.max(rw, rh) * k < 8;
            const path = (d: string, b: Outline["b"], extra: React.SVGProps<SVGPathElement>) => (
              <path d={d} transform={place(b)} vectorEffect="non-scaling-stroke" fillRule="evenodd" strokeLinejoin="round" {...extra} />
            );
            return (
              <g key={i}>
                {/* the map's drawing springs to the real size, standing on the ground line */}
                <g className="reveal-map" style={{ transformOrigin: `${cx}px ${GROUND}px`, transform: shown ? `scale(${grow})` : "scale(1)", opacity: shown ? 0 : 1 }}>
                  {path(p.map.d, p.map.b, { fill: COLORS[i], fillOpacity: 0.88, stroke: COLORS[i], strokeWidth: 1 })}
                </g>
                {/* then stays behind as a pale tint, with the real shape in full colour */}
                <g style={{ opacity: shown ? 1 : 0, transition: shown ? "opacity 0.2s ease" : "none" }}>
                  {path(p.map.d, p.map.b, { fill: COLORS[i], fillOpacity: 0.18, stroke: COLORS[i], strokeOpacity: 0.55, strokeWidth: 1.2 })}
                </g>
                <g className="reveal-true" style={{ opacity: shown ? 1 : 0 }}>
                  {path(p.real.d, p.real.b, { fill: COLORS[i], fillOpacity: 0.88, stroke: COLORS[i], strokeWidth: 1 })}
                  {tiny ? <circle cx={cx} cy={GROUND - (rh * k) / 2} r={7} fill="none" stroke={COLORS[i]} strokeWidth={1.2} /> : null}
                </g>
              </g>
            );
          })}
        </svg>
      </button>
    </div>
  );
}

