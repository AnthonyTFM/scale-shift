"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { dayNumber, loadSave, localDateKey, mergeDays, stats } from "@/lib/daily";
import { playerId, rememberPlayer } from "@/lib/player";
import { signInOn } from "@/lib/sign-in";
import { home } from "@/content/home";
import type { DayBoard } from "@/lib/leaderboard-types";

type State = { day: number; done: boolean; score?: number; streak: number; board: DayBoard | null };

/** The homepage's featured card for today's challenge: the pitch, your status and streak, today's top three, and an example round. */
export function DailyTeaser({ example }: { example: ReactNode }) {
  const [s, setS] = useState<State | null>(null);
  const t = home.teaser;

  useEffect(() => {
    const today = localDateKey();
    const mine = () => {
      const save = loadSave();
      const rec = save.days[today];
      return { day: dayNumber(today), done: typeof rec?.s === "number", score: rec?.s, streak: stats(save, today).streak };
    };
    const board = () =>
      fetch(`/api/leaderboard?scope=day&date=${today}&limit=3${playerId() ? `&player=${playerId()}` : ""}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
        .then((b: DayBoard | null) => setS({ ...mine(), board: b }));
    board();
    // signed in: show the account's official score (its first try), and mark "(you)" on the board
    if (signInOn)
      fetch(`/api/leaderboard/me?today=${today}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { player?: { id: string; name: string | null } | null; days?: Record<string, { c: number[]; s: number }> } | null) => {
          if (!d?.player) return;
          if (d.player.name) rememberPlayer({ id: d.player.id, name: d.player.name });
          if (d.days) mergeDays(d.days);
          board();
        })
        .catch(() => {});
    // finished in another tab: show the score here without a reload
    const sync = () => setS((prev) => (prev ? { ...prev, ...mine() } : prev));
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  return (
    <div className="grid items-center gap-6 rounded-card bg-white p-5 text-ink shadow-float ring-2 ring-accent/70 md:grid-cols-[1fr_1.1fr] md:p-7">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-panel">{t.badge}</p>
          <p className="text-xs font-bold uppercase tracking-wide text-link">Daily challenge{s ? ` #${s.day}` : ""}</p>
          {s?.streak ? <p className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">🔥 {s.streak}-day streak</p> : null}
        </div>
        <h2 className="mt-3 font-display text-3xl leading-tight md:text-4xl">{t.title}</h2>
        <p className="mt-2 text-ink-soft">{s?.done ? t.done(s.score ?? 0) : t.lead}</p>
        <ul className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-ink-soft">
          {t.steps.map((step) => (
            <li key={step} className="rounded-full bg-paper px-2.5 py-1 ring-1 ring-line">
              {step}
            </li>
          ))}
        </ul>
        <Link
          href="/daily"
          className="mt-5 flex h-12 items-center justify-center rounded-lg bg-accent px-6 font-bold text-panel shadow-sm hover:bg-accent-strong sm:inline-flex"
        >
          {s?.done ? t.doneCta : t.cta}
        </Link>
        <div className="mt-5 border-t border-line pt-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t.topPlayers}</p>
            <Link href="/leaderboard" className="text-xs font-semibold text-link hover:underline">
              {t.fullBoard}
            </Link>
          </div>
          {s === null ? (
            <div className="mt-2 h-5 animate-pulse rounded bg-paper" />
          ) : s.board?.rows.length ? (
            <ol className="mt-2 space-y-1 text-sm">
              {s.board.rows.map((r) => (
                <li key={r.rank + r.name} className="flex items-center gap-2">
                  <span className="w-5 text-right font-bold text-muted">{r.rank}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{r.name}{r.me ? <span className="font-normal text-muted"> (you)</span> : null}</span>
                  <span className="font-mono">{r.score}/5</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-1 text-sm text-muted">{t.noScores}</p>
          )}
        </div>
      </div>
      {example}
    </div>
  );
}
