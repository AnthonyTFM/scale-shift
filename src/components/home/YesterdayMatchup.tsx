"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import dataVersion from "@/data/data-version.json";
import { home } from "@/content/home";
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

type Outline = { d: string; b: [number, number, number, number] };
type ShapeFile = { merc: Outline; ea: Outline };
type Box = [number, number, number, number];
/** Yesterday's pick: the question as soon as the puzzle list is in, the drawings once both shape files are. */
type Pick = { date: string; day: number; q: Question; shapes?: [ShapeFile, ShapeFile] };

const V = `?v=${dataVersion.v}`;
// the daily game's shape colours (fills only, never text)
const COLORS = ["#FF5B4A", "#2F6BFF"];
const W = 200;
const H = 110;

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
  Promise.all(q.options.map((o) => getJson<ShapeFile>(`/data/daily/shapes/${o.id}.json${V}`))) as Promise<[ShapeFile, ShapeFile]>;

/**
 * The part of an outline worth framing: its biggest ring and the rings close to it. Without this, a country with far-off
 * islands (France's overseas departments, the Dutch Caribbean) is framed across half the world and drawn as a speck.
 */
function mainBox(o: Outline): Box {
  const rings = o.d
    .split("M")
    .filter(Boolean)
    .map((part) => {
      const n = part
        .replace(/Z/gi, "")
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      let area = 0;
      let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
      for (let i = 0; i + 1 < n.length; i += 2) {
        const [x, y] = [n[i], n[i + 1]];
        const [nx, ny] = [n[(i + 2) % n.length], n[(i + 3) % n.length]];
        area += x * ny - nx * y;
        [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
      }
      return { area: Math.abs(area) / 2, box: [x0, y0, x1, y1] as Box };
    })
    .filter((r) => Number.isFinite(r.box[0]))
    .sort((a, b) => b.area - a.area);
  if (!rings.length) return o.b;
  let box = rings[0].box;
  const reach = Math.max(box[2] - box[0], box[3] - box[1]) * 1.6;
  for (const r of rings.slice(1)) {
    const next: Box = [Math.min(box[0], r.box[0]), Math.min(box[1], r.box[1]), Math.max(box[2], r.box[2]), Math.max(box[3], r.box[3])];
    if (next[2] - next[0] <= reach && next[3] - next[1] <= reach) box = next;
  }
  return box;
}

/** Both shapes side by side at one shared scale, standing on a common baseline; far-off islands are cut off. */
function Pair({ outlines, label, note }: { outlines?: [Outline, Outline]; label: string; note: string }) {
  const id = useId();
  const boxes = outlines?.map(mainBox);
  const k = boxes ? Math.min(...boxes.map(([x0, y0, x1, y1]) => Math.min((W / 2 - 12) / (x1 - x0), (H - 8) / (y1 - y0)))) : 1;
  return (
    <figure className="flex flex-col rounded-xl bg-white p-3 ring-1 ring-line">
      <figcaption className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label={note || label}>
        <line x1="4" x2={W - 4} y1={H - 1} y2={H - 1} className="stroke-line" />
        {outlines?.map((o, i) => {
          const [x0, y0, x1, y1] = boxes![i];
          const cx = (W / 2) * i + W / 4;
          const tiny = Math.max(x1 - x0, y1 - y0) * k < 8;
          return (
            <g key={i}>
              <clipPath id={`${id}-${i}`}>
                <rect x={(W / 2) * i} y={0} width={W / 2} height={H} />
              </clipPath>
              {/* clipped by a wrapper: a clip on the path itself would be scaled along with it */}
              <g clipPath={`url(#${id}-${i})`}>
                <path
                  d={o.d}
                  transform={`translate(${cx} ${H - 2}) scale(${k}) translate(${-(x0 + x1) / 2} ${-y1})`}
                  fill={COLORS[i]}
                  fillOpacity={0.88}
                  stroke={COLORS[i]}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  fillRule="evenodd"
                  strokeLinejoin="round"
                />
              </g>
              {/* too small to see at this scale: ring it, like the game does */}
              {tiny ? <circle cx={cx} cy={H - 2 - ((y1 - y0) * k) / 2} r={7} fill="none" stroke={COLORS[i]} strokeWidth={1.2} /> : null}
            </g>
          );
        })}
      </svg>
    </figure>
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
  // "Iceland looks 2.7× bigger on a normal map." (only when the map really gets it backwards) and "Guyana is 2.1× the size of Iceland."
  const mapNote = small && looks > 1.05 ? `${capitalize(nameInSentence(small))} looks ${times(looks)}× bigger on a normal map.` : "";
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
      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
        <Pair outlines={pick?.shapes ? [pick.shapes[0].merc, pick.shapes[1].merc] : undefined} label={t.mapLabel} note={mapNote} />
        <Pair outlines={pick?.shapes ? [pick.shapes[0].ea, pick.shapes[1].ea] : undefined} label={t.realLabel} note={realNote} />
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
