"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dataVersion from "@/data/data-version.json";
import { buildQuestions, dayNumber, explain, LAUNCH, loadSave, localDateKey, shiftDate, type PoolEntry, type Question } from "@/lib/daily";

type Outline = { d: string; b: [number, number, number, number] };
type ShapeFile = { merc: Outline; ea: Outline };
type Shown = { day: number; q: Question; shapes: [ShapeFile, ShapeFile]; playedToday: boolean };

const V = `?v=${dataVersion.v}`;
// the daily game's shape colours (fills only, never text)
const COLORS = ["#FF5B4A", "#2F6BFF"];
const W = 200;
const H = 104;

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
async function loadYesterday(): Promise<Shown | null> {
  const today = localDateKey();
  const date = shiftDate(today, -1);
  if (date < LAUNCH) return null;
  const pool = await getJson<PoolEntry[]>(`/data/daily/index.json${V}`);
  const qs = buildQuestions(pool, date);
  const fooled = (q: Question) => q.options[1 - q.answer].m / q.options[q.answer].m;
  const q = [...qs].sort((x, y) => fooled(y) - fooled(x))[0];
  if (!q) return null;
  const shapes = (await Promise.all(q.options.map((o) => getJson<ShapeFile>(`/data/daily/shapes/${o.id}.json${V}`)))) as [ShapeFile, ShapeFile];
  return { day: dayNumber(date), q, shapes, playedToday: typeof loadSave().days[today]?.s === "number" };
}

const size = (o: Outline) => [o.b[2] - o.b[0], o.b[3] - o.b[1]] as const;

/** Both shapes side by side at one shared scale, standing on a common baseline. */
function Pair({ outlines, label, win }: { outlines: [Outline, Outline]; label: string; win?: number }) {
  const k = Math.min(...outlines.map((o) => Math.min((W / 2 - 12) / size(o)[0], (H - 8) / size(o)[1])));
  return (
    <figure className="flex flex-col rounded-xl bg-white p-3 ring-1 ring-line">
      <figcaption className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" aria-hidden="true">
        <line x1="4" x2={W - 4} y1={H - 1} y2={H - 1} className="stroke-line" />
        {outlines.map((o, i) => {
          const [x0, , x1, y1] = o.b;
          return (
            <path
              key={i}
              d={o.d}
              transform={`translate(${(W / 2) * i + W / 4} ${H - 2}) scale(${k}) translate(${-(x0 + x1) / 2} ${-y1})`}
              fill={COLORS[i]}
              fillOpacity={win === undefined || win === i ? 0.88 : 0.45}
              stroke={COLORS[i]}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              fillRule="evenodd"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>
    </figure>
  );
}

/** "Yesterday's matchup": the trickiest pair from yesterday's game, as a normal map draws it and at real size. */
export function YesterdayMatchup({ compact = false }: { compact?: boolean }) {
  const [shown, setShown] = useState<Shown | null | undefined>(undefined);
  useEffect(() => {
    loadYesterday()
      .then(setShown)
      .catch(() => setShown(null));
  }, []);
  // nothing to show (first day, or offline): the card steps aside
  if (shown === null) return null;
  if (!shown)
    return <div aria-hidden="true" className={`animate-pulse rounded-card bg-white ring-1 ring-line ${compact ? "h-[300px]" : "h-[340px]"}`} />;
  const { q, shapes } = shown;
  const [a, b] = q.options;
  const [line, why] = explain(q);
  return (
    <section aria-labelledby="yesterday-h" className="rounded-card bg-tile p-4 text-ink ring-1 ring-line sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">Yesterday&apos;s matchup · Daily challenge #{shown.day}</p>
      <h2 id="yesterday-h" className="mt-1 font-display text-2xl leading-tight">
        <span className="text-danger">{a.n}</span> vs <span className="text-primary">{b.n}</span>
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
        <Pair outlines={[shapes[0].merc, shapes[1].merc]} label="On a normal map" />
        <Pair outlines={[shapes[0].ea, shapes[1].ea]} label="Real size" win={q.answer} />
      </div>
      <p className="mt-3 text-sm font-semibold leading-relaxed">{line}</p>
      {!compact && why ? <p className="mt-1 text-sm leading-relaxed text-ink-soft">{why}</p> : null}
      <Link href="/daily" className="mt-2 inline-flex min-h-11 items-center gap-1 font-bold text-link hover:underline">
        {shown.playedToday ? "See today's answers" : "Try today's five"} <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
