"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { dayNumber, loadSave, localDateKey, stats } from "@/lib/daily";
import { home } from "@/content/home";
import type { DayBoard } from "@/lib/leaderboard-types";

type State = { day: number; done: boolean; score?: number; streak: number; board: DayBoard | null };

/** Homepage card for today's challenge: your status, your streak and today's top three. */
export function DailyTeaser() {
  const [s, setS] = useState<State | null>(null);

  useEffect(() => {
    const today = localDateKey();
    const save = loadSave();
    const rec = save.days[today];
    const base = { day: dayNumber(today), done: typeof rec?.s === "number", score: rec?.s, streak: stats(save, today).streak };
    fetch(`/api/leaderboard?scope=day&date=${today}&limit=3`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((board: DayBoard | null) => setS({ ...base, board }));
  }, []);

  return (
    <div className="rounded-card bg-white p-5 text-ink shadow-float">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-link">Daily challenge{s ? ` #${s.day}` : ""}</p>
        {s?.streak ? <p className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">🔥 {s.streak}-day streak</p> : null}
      </div>
      <p className="mt-1 font-display text-2xl leading-tight">{home.teaser.title}</p>
      <p className="mt-1 text-sm text-ink-soft">
        {s?.done ? home.teaser.done(s.score ?? 0) : home.teaser.lead}
      </p>
      <Link
        href="/daily"
        className="mt-4 flex h-12 items-center justify-center rounded-lg bg-accent font-bold text-panel hover:bg-accent-strong"
      >
        {s?.done ? home.teaser.doneCta : home.teaser.cta}
      </Link>
      <div className="mt-4 border-t border-line pt-3">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Today&apos;s top players</p>
          <Link href="/leaderboard" className="text-xs font-semibold text-link hover:underline">
            Full leaderboard →
          </Link>
        </div>
        {s === null ? (
          <div className="mt-2 h-16 animate-pulse rounded bg-paper" />
        ) : s.board?.rows.length ? (
          <ol className="mt-2 space-y-1 text-sm">
            {s.board.rows.map((r) => (
              <li key={r.rank + r.name} className="flex items-center gap-2">
                <span className="w-5 text-right font-bold text-muted">{r.rank}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span>
                <span className="font-mono">{r.score}/5</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-muted">No scores yet today. Be the first on the board.</p>
        )}
      </div>
    </div>
  );
}
