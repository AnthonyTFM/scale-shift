"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadSave, localDateKey } from "@/lib/daily";
import { challengeMessage } from "@/lib/challenge-friend";
import { useShareBox } from "@/components/site/ShareBox";
import { playerId } from "@/lib/player";
import { home } from "@/content/home";
import type { AllTimeBoard, DayBoard } from "@/lib/leaderboard-types";
import { TrophyIcon } from "@/components/site/Icons";

/** Shown when today has no scores yet: yesterday's top three, or the all-time top three. */
type Fallback = { kind: "yesterday" | "all"; rows: { rank: number; name: string; score: string }[] };

const getJson = <T,>(url: string) =>
  fetch(url)
    .then((r) => (r.ok ? (r.json() as Promise<T>) : null))
    .catch(() => null);

async function fallbackBoard(): Promise<Fallback | null> {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = await getJson<DayBoard>(`/api/leaderboard?scope=day&date=${localDateKey(d)}&limit=3`);
  if (y?.rows.length) return { kind: "yesterday", rows: y.rows.map((r) => ({ rank: r.rank, name: r.name, score: `${r.score}/5` })) };
  const all = await getJson<AllTimeBoard>("/api/leaderboard?scope=all&limit=3");
  if (all?.rows.length) return { kind: "all", rows: all.rows.map((r) => ({ rank: r.rank, name: r.name, score: home.hub.boardPoints(r.points) })) };
  return null;
}

/** The hero's right-hand card: today's top five, and your own spot if you've played. */
export function HeroLeaderboard() {
  const [board, setBoard] = useState<DayBoard | null | undefined>(undefined);
  const [myScore, setMyScore] = useState<number | null>(null);
  const [fallback, setFallback] = useState<Fallback | null>(null);
  const { share, box } = useShareBox();
  const t = home.hub;

  useEffect(() => {
    const id = playerId();
    getJson<DayBoard>(`/api/leaderboard?scope=day&date=${localDateKey()}&limit=5${id ? `&player=${id}` : ""}`).then(async (b) => {
      const mine = loadSave().days[localDateKey()]?.s;
      setMyScore(typeof mine === "number" ? mine : null);
      // nobody has played yet today: show who did best yesterday (or ever) rather than an empty box
      if (b && !b.rows.length) setFallback(await fallbackBoard());
      setBoard(b);
    });
  }, []);

  const meBelow = board?.me && !board.rows.some((r) => r.me) ? board.me : null;
  return (
    <div className="rounded-card bg-card p-5 text-ink shadow-float ring-1 ring-line md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-2 font-display text-2xl text-ink sm:text-[1.7rem]"><TrophyIcon className="size-8" /> {t.boardTitle}</h2>
        {board?.total ? <p className="whitespace-nowrap text-xs text-muted">{t.boardPlayers(board.total)}</p> : null}
      </div>
      {board === undefined ? (
        <ul aria-hidden="true" className="mt-4 space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="h-9 animate-pulse rounded-lg bg-beige" />
          ))}
        </ul>
      ) : board?.rows.length ? (
        <ol className="mt-4 space-y-1.5">
          {board.rows.map((r) => (
            <li
              key={r.rank + r.name}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 ${r.me ? "bg-gold text-ink" : "bg-paper"}`}
            >
              <span className={`w-6 text-center font-bold ${r.rank <= 3 && !r.me ? "text-primary" : ""}`}>{r.rank}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">
                {r.name}
                {r.me ? <span className="font-normal"> (you)</span> : null}
              </span>
              <span className="font-mono text-sm">{r.score}/5</span>
            </li>
          ))}
          {meBelow ? (
            <li className="flex items-center gap-3 rounded-lg bg-gold px-3 py-2 text-ink">
              <span className="w-6 text-center font-bold">{meBelow.rank}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">
                {meBelow.name} <span className="font-normal">(you)</span>
              </span>
              <span className="font-mono text-sm">{meBelow.score}/5</span>
            </li>
          ) : null}
        </ol>
      ) : fallback ? (
        <div className="mt-3">
          <p className="text-sm font-semibold text-ink">{t.boardEmptyShort}</p>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted">{fallback.kind === "yesterday" ? t.boardYesterday : t.boardAllTime}</p>
          <ol className="mt-1.5 space-y-1.5" aria-label={fallback.kind === "yesterday" ? t.boardYesterday : t.boardAllTime}>
            {fallback.rows.map((r) => (
              <li key={r.rank + r.name} className="flex items-center gap-3 rounded-lg bg-paper px-3 py-2">
                <span className="w-6 text-center font-bold text-primary">{r.rank}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span>
                <span className="font-mono text-sm">{r.score}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-paper px-3 py-6 text-center text-muted">{t.boardEmpty}</p>
      )}
      {/* a short board gets an invitation instead of empty space: play, or pull a friend in */}
      {board !== undefined && (board?.rows.length ?? 0) < 5 ? (
        myScore === null ? (
          <Link
            href="/daily"
            transitionTypes={["to-daily"]}
            className="mt-1.5 flex items-center gap-3 rounded-lg border-2 border-dashed border-line px-3 py-2 text-muted hover:border-primary hover:text-ink"
          >
            <span className="w-6 text-center font-bold">?</span>
            <span className="min-w-0 flex-1 truncate font-semibold">{t.spotWaiting}</span>
            <span className="text-sm font-bold text-primary">{t.spotPlay} →</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => share(challengeMessage(myScore), "home-board")}
            className="mt-1.5 flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-line px-3 py-2 text-left text-muted hover:border-primary hover:text-ink"
          >
            <span className="w-6 text-center font-bold">+</span>
            <span className="min-w-0 flex-1 truncate font-semibold">{t.beatMe}</span>
            <span aria-hidden="true" className="text-sm font-bold text-primary">
              →
            </span>
          </button>
        )
      ) : null}
      {box}
      <Link href="/leaderboard" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
        {t.boardCta} →
      </Link>
    </div>
  );
}
