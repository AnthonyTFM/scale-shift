"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { localDateKey } from "@/lib/daily";
import { playerId } from "@/lib/player";
import { home } from "@/content/home";
import type { DayBoard } from "@/lib/leaderboard-types";

/** The hero's right-hand card: today's top five, and your own spot if you've played. */
export function HeroLeaderboard() {
  const [board, setBoard] = useState<DayBoard | null | undefined>(undefined);
  const t = home.hub;

  useEffect(() => {
    const id = playerId();
    fetch(`/api/leaderboard?scope=day&date=${localDateKey()}&limit=5${id ? `&player=${id}` : ""}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then(setBoard);
  }, []);

  const meBelow = board?.me && !board.rows.some((r) => r.me) ? board.me : null;
  return (
    <div className="rounded-card bg-panel/70 p-5 text-panel-text shadow-float ring-1 ring-white/15 backdrop-blur-md md:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl text-white">🏆 {t.boardTitle}</h2>
        {board?.total ? <p className="text-xs text-panel-muted">{t.boardPlayers(board.total)}</p> : null}
      </div>
      {board === undefined ? (
        <ul aria-hidden="true" className="mt-4 space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="h-9 animate-pulse rounded-lg bg-white/10" />
          ))}
        </ul>
      ) : board?.rows.length ? (
        <ol className="mt-4 space-y-1.5">
          {board.rows.map((r) => (
            <li
              key={r.rank + r.name}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 ${r.me ? "bg-accent text-panel" : "bg-white/5"}`}
            >
              <span className={`w-6 text-center font-bold ${r.rank <= 3 && !r.me ? "text-accent" : ""}`}>{r.rank}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">
                {r.name}
                {r.me ? <span className="font-normal"> (you)</span> : null}
              </span>
              <span className="font-mono text-sm">{r.score}/5</span>
            </li>
          ))}
          {meBelow ? (
            <li className="flex items-center gap-3 rounded-lg bg-accent px-3 py-2 text-panel">
              <span className="w-6 text-center font-bold">{meBelow.rank}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">
                {meBelow.name} <span className="font-normal">(you)</span>
              </span>
              <span className="font-mono text-sm">{meBelow.score}/5</span>
            </li>
          ) : null}
        </ol>
      ) : (
        <p className="mt-4 rounded-lg bg-white/5 px-3 py-6 text-center text-panel-muted">{t.boardEmpty}</p>
      )}
      <Link href="/leaderboard" className="mt-4 inline-block text-sm font-semibold text-accent hover:underline">
        {t.boardCta} →
      </Link>
    </div>
  );
}
