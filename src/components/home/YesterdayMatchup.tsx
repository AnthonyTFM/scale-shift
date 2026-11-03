"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { POOL_V as V } from "@/lib/pool-version";
import { home } from "@/content/home";
import type { ShapeFile } from "@/lib/outline";
import { getJson, loadPair, Proof } from "./Proof";
import {
  buildQuestions,
  capitalize,
  dayNumber,
  LAUNCH,
  localDateKey,
  nameInSentence,
  shiftDate,
  sizeLine,
  type PoolEntry,
  type Question,
} from "@/lib/daily";

/** Yesterday's pick: the question as soon as the puzzle list is in, the drawings once both shape files are. */
type Pick = { date: string; day: number; q: Question; shapes?: [ShapeFile, ShapeFile] };

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

const loadShapes = (q: Question) => loadPair(q.options);

const times = (r: number) => (r >= 10 ? r.toFixed(0) : r.toFixed(1));

/**
 * "Yesterday's matchup": the trickiest pair from yesterday's game, as a normal map draws it and at real size. The frame
 * and its text lines are drawn straight away and filled in as the puzzle list and the shapes arrive, so nothing moves.
 */
export function YesterdayMatchup() {
  const [pick, setPick] = useState<Pick | null | undefined>(undefined);
  const t = home.yesterday;

  useEffect(() => {
    let loadedFor = "";
    let stale = false;
    const load = () => {
      const today = localDateKey();
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
      className="rounded-card bg-tile p-4 text-ink ring-1 ring-line"
    >
      <p id="yesterday-eyebrow" className="text-xs font-bold uppercase tracking-wide text-primary">
        {t.eyebrow}
        {pick ? <span className="text-muted"> · #{pick.day}</span> : null}
      </p>
      <h2 id="yesterday-h" className="mt-0.5 min-h-[1lh] font-display text-lg leading-tight">
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
      {/* compact: the picture beside the trick in words */}
      <div className="mt-2 flex items-start gap-3">
        <div className="w-[46%] max-w-56 shrink-0">
          {/* a new key each day, so a tab left open past midnight plays the new pair from the map's size */}
          <Proof
            key={pick?.date ?? "none"}
            shapes={pick?.shapes}
            label={a && b ? t.proofSr(a.n, b.n) : pick === null ? t.unavailable : t.loading}
            mapLabel={t.mapLabel}
            realLabel={t.realLabel}
            replay={t.replay}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="min-h-[4lh] text-sm leading-snug">
            {pick === null ? t.unavailableLine : null}
            {mapNote ? `${mapNote} ` : null}
            <span className="font-semibold">{realNote}</span>
          </p>
          <Link href={pick ? `/daily/archive?day=${pick.day}` : "/daily"} className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-link hover:underline">
            {t.play} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
