"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { POOL_V as V } from "@/lib/pool-version";
import { home } from "@/content/home";
import { mainPart, withMapDrawing, type Outline, type ShapeFile } from "@/lib/outline";
import {
  buildQuestions,
  capitalize,
  dayNumber,
  LAUNCH,
  loadSave,
  localDateKey,
  nameInSentence,
  shiftDate,
  sizeLine,
  type PoolEntry,
  type Question,
} from "@/lib/daily";

/** Yesterday's pick: the question as soon as the puzzle list is in, the drawings once both shape files are. */
type Pick = { date: string; day: number; q: Question; shapes?: [ShapeFile, ShapeFile] };

// the daily game's shape colours (fills only, never text)
const COLORS = ["#FF5B4A", "#2F6BFF"];
const W = 200;
const H = 110;
// shapes stand a little above the ground line, so a small island at the bottom never looks cut off by it
const GROUND = H - 6;

const getJson = <T,>(url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(url);
    return r.json() as Promise<T>;
  });

/**
 * Yesterday's question where the map lied most: the shape a normal map draws bigger is really the smaller one. Picked in
 * the browser: the puzzle changes at each player's own midnight, so only the browser knows which day is "yesterday" (a
 * server guess would show today's answers to players behind UTC).
 */
async function pickYesterday(today: string): Promise<Pick | null> {
  const date = shiftDate(today, -1);
  if (date < LAUNCH) return null;
  const pool = await getJson<PoolEntry[]>(`/data/daily/index.json${V}`);
  const fooled = (q: Question) => q.options[1 - q.answer].m / q.options[q.answer].m;
  const q = [...buildQuestions(pool, date)].sort((x, y) => fooled(y) - fooled(x))[0];
  return q ? { date, day: dayNumber(date), q } : null;
}

const loadShapes = (q: Question) =>
  Promise.all(q.options.map((o) => getJson<ShapeFile>(`/data/daily/shapes/${o.id}.json${V}`).then((f) => withMapDrawing(f, o)))) as Promise<
    [ShapeFile, ShapeFile]
  >;

/**
 * The proof, in one picture: both shapes stand side by side as a normal map draws them, then each shrinks (or grows) to its
 * real size, the way the daily game reveals an answer, leaving a pale tint of the map's drawing behind. All four drawings
 * share one scale (they're in the same units), so the change in size is exactly the map's error. It plays once, when the
 * card comes into view; a tap plays it again. With reduced motion it simply shows the real sizes over the map's tint.
 */
function Proof({ shapes, label, mapLabel, realLabel, replay }: { shapes?: [ShapeFile, ShapeFile]; label: string; mapLabel: string; realLabel: string; replay: string }) {
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
        timer = window.setTimeout(() => setReal(true), 700);
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
  // the label turns to "Real size" as the shapes land (the shrink takes about a second), not when it starts
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    if (!shown) return queueMicrotask(() => setLanded(false));
    const id = window.setTimeout(() => setLanded(true), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1000);
    return () => clearTimeout(id);
  }, [shown]);
  return (
    <div ref={ref}>
      {/* the whole picture is one button: a tap plays it again */}
      <button
        type="button"
        onClick={again}
        disabled={!shapes}
        aria-label={`${label}. ${replay}`}
        className="block w-full cursor-pointer rounded-xl bg-white p-3 text-left ring-1 ring-line disabled:cursor-default"
      >
        <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted">
          <span className={landed ? "text-ink" : undefined}>{landed ? realLabel : mapLabel}</span>
          {shapes ? <span className="font-bold normal-case tracking-normal text-link">{replay}</span> : null}
        </span>
        <svg viewBox={`0 0 ${W} ${H}`} className={`mt-2 block w-full ${rewind ? "[&_*]:!transition-none" : ""}`} aria-hidden="true">
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

const times = (r: number) => (r >= 10 ? r.toFixed(0) : r.toFixed(1));

/**
 * "Yesterday's matchup": the trickiest pair from yesterday's game, as a normal map draws it and at real size. The frame
 * and its text lines are drawn straight away and filled in as the puzzle list and the shapes arrive, so nothing moves.
 */
export function YesterdayMatchup() {
  const [pick, setPick] = useState<Pick | null | undefined>(undefined);
  const [playedToday, setPlayedToday] = useState(false);
  const t = home.yesterday;

  useEffect(() => {
    let loadedFor = "";
    let stale = false;
    const load = () => {
      const today = localDateKey();
      setPlayedToday(typeof loadSave().days[today]?.s === "number");
      // a tab left open past midnight: yesterday has moved on
      if (today === loadedFor) return;
      loadedFor = today;
      setPick(undefined);
      pickYesterday(today)
        .then((p) => {
          if (stale || loadedFor !== today) return;
          setPick(p);
          if (p)
            loadShapes(p.q)
              .then((shapes) => !stale && loadedFor === today && setPick({ ...p, shapes }))
              .catch(() => !stale && setPick(null));
        })
        .catch(() => !stale && setPick(null));
    };
    load();
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", load);
    return () => {
      stale = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", load);
    };
  }, []);

  const q = pick?.q;
  const [a, b] = q?.options ?? [];
  const big = q ? q.options[q.answer] : undefined;
  const small = q ? q.options[1 - q.answer] : undefined;
  const looks = big && small ? small.m / big.m : 0;
  // "Iceland looks 2.7× bigger than Guyana on a normal map." (only when the map really gets it backwards) and "Guyana is 2.1× the size of Iceland."
  const mapNote = big && small && looks > 1.05 ? `${capitalize(nameInSentence(small))} looks ${times(looks)}× bigger than ${nameInSentence(big)} on a normal map.` : "";
  const realNote = big && small ? sizeLine(big, small) : "";

  return (
    <section
      aria-labelledby="yesterday-eyebrow yesterday-h"
      aria-busy={pick === undefined || (!!pick && !pick.shapes)}
      className="rounded-card bg-tile p-4 text-ink ring-1 ring-line sm:p-5"
    >
      <p id="yesterday-eyebrow" className="text-xs font-bold uppercase tracking-wide text-primary">
        {t.eyebrow}
        {pick ? <span className="text-muted"> · #{pick.day}</span> : null}
      </p>
      {/* two lines kept on phones (long empire names wrap), one on wide screens, so the drawings below don't move */}
      <h2 id="yesterday-h" className="mt-1 min-h-[2lh] font-display text-2xl leading-tight lg:min-h-[1lh]">
        {a && b ? (
          <>
            <span className="text-danger">{a.n}</span> vs <span className="text-primary">{b.n}</span>
          </>
        ) : pick === null ? (
          t.unavailable
        ) : (
          <span className="sr-only">{t.loading}</span>
        )}
      </h2>
      <div className="mt-3">
        <Proof
          shapes={pick?.shapes}
          label={a && b ? t.proofSr(a.n, b.n) : t.loading}
          mapLabel={t.mapLabel}
          realLabel={t.realLabel}
          replay={t.replay}
        />
      </div>
      {/* the trick in words: what the map shows, then the truth */}
      <p className="mt-3 min-h-[3lh] text-sm leading-relaxed sm:min-h-[2lh]">
        {pick === null ? t.unavailableLine : null}
        {mapNote ? `${mapNote} ` : null}
        <span className="font-semibold">{realNote}</span>
      </p>
      <Link href="/daily" transitionTypes={["to-daily"]} className="inline-flex min-h-11 items-center gap-1 font-bold text-link hover:underline">
        {playedToday ? t.played : t.play} <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
