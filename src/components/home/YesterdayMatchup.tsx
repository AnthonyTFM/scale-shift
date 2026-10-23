"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dataVersion from "@/data/data-version.json";
import { home } from "@/content/home";
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
function Pair({ outlines, label, win }: { outlines: [Outline, Outline] | null; label: string; win?: number }) {
  const k = outlines ? Math.min(...outlines.map((o) => Math.min((W / 2 - 12) / size(o)[0], (H - 8) / size(o)[1]))) : 1;
  return (
    <figure className="flex flex-col rounded-xl bg-white p-3 ring-1 ring-line">
      <figcaption className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" aria-hidden="true">
        <line x1="4" x2={W - 4} y1={H - 1} y2={H - 1} className="stroke-line" />
        {outlines?.map((o, i) => {
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

/**
 * "Yesterday's matchup": the trickiest pair from yesterday's game, as a normal map draws it and at real size. The frame is
 * drawn straight away and filled in when the shapes arrive, so nothing below it moves.
 */
export function YesterdayMatchup() {
  const [shown, setShown] = useState<Shown | null | undefined>(undefined);
  const t = home.yesterday;
  useEffect(() => {
    loadYesterday()
      .then(setShown)
      .catch(() => setShown(null));
  }, []);
  // nothing to show (offline, or the shapes failed to load): the card steps aside
  if (shown === null) return null;
  const q = shown?.q;
  const [a, b] = q?.options ?? [];
  return (
    <section aria-labelledby="yesterday-h" aria-busy={!shown} className="rounded-card bg-tile p-4 text-ink ring-1 ring-line sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">{shown ? t.eyebrow(shown.day) : "\u00a0"}</p>
      <h2 id="yesterday-h" className="mt-1 font-display text-2xl leading-tight">
        {a && b ? (
          <>
            <span className="text-danger">{a.n}</span> vs <span className="text-primary">{b.n}</span>
          </>
        ) : (
          <span className="inline-block h-7 w-48 animate-pulse rounded-lg bg-white/70 align-middle" />
        )}
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
        <Pair outlines={shown ? [shown.shapes[0].merc, shown.shapes[1].merc] : null} label={t.mapLabel} />
        <Pair outlines={shown ? [shown.shapes[0].ea, shown.shapes[1].ea] : null} label={t.realLabel} win={q?.answer} />
      </div>
      {/* on phones, two lines kept free while loading, so a two-line answer doesn't push the page down (on wide screens the
          card sits beside the taller game column, so nothing below it moves) */}
      <p className="mt-3 min-h-[2lh] text-sm font-semibold leading-relaxed lg:min-h-0">{q ? explain(q)[0] : ""}</p>
      <Link href="/daily" transitionTypes={["to-daily"]} className="inline-flex min-h-11 items-center gap-1 font-bold text-link hover:underline">
        {shown?.playedToday ? t.played : t.play} <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
