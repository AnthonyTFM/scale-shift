"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { playerId } from "@/lib/player";
import { home } from "@/content/home";
import type { DayRow, EndlessBoard } from "@/lib/leaderboard-types";
import { FlameIcon, TrophyIcon } from "@/components/site/Icons";

const getJson = <T,>(url: string) =>
  fetch(url)
    .then((r) => (r.ok ? (r.json() as Promise<T>) : null))
    .catch(() => null);

/**
 * The leaderboard card under the hero: endless mode's Best streaks. Daily scores are private (the Wordle way), so this is
 * the one public board.
 */
export function HeroLeaderboard() {
  const [total, setTotal] = useState(0);
  const t = home.hub;
  return (
    <div className="rounded-card bg-card p-5 text-ink shadow-float ring-1 ring-line md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-2 font-display text-2xl text-ink sm:text-[1.7rem]">
          <TrophyIcon className="size-8" /> {t.streakTitle}
        </h2>
        {/* beside the title (under it on narrow phones), not above the list, so the list doesn't jump when it arrives */}
        {total ? <p className="whitespace-nowrap text-xs text-muted">{t.streakPlayers(total)}</p> : null}
      </div>
      <StreakBoard onTotal={setTotal} />
    </div>
  );
}

function Skeleton() {
  return (
    <ul aria-hidden="true" className="mt-4 space-y-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <li key={i} className="h-9 animate-pulse rounded-lg bg-beige" />
      ))}
    </ul>
  );
}

/** Endless mode's best streaks of all time: the top five, and your own spot if you've posted one. */
function StreakBoard({ onTotal }: { onTotal: (n: number) => void }) {
  const [board, setBoard] = useState<EndlessBoard | null | undefined>(undefined);
  const t = home.hub;

  useEffect(() => {
    const id = playerId();
    getJson<EndlessBoard>(`/api/endless?scope=all&limit=5${id ? `&player=${id}` : ""}`).then((b) => {
      setBoard(b);
      if (b?.total) onTotal(b.total);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meBelow = board?.me && !board.rows.some((r) => r.me) ? board.me : null;
  const row = (r: DayRow, key: string) => (
    <li key={key} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${r.me ? "bg-gold text-ink" : "bg-paper"}`}>
      <span className={`w-6 text-center font-bold ${r.rank <= 3 && !r.me ? "text-primary" : ""}`}>{r.rank}</span>
      <span className="min-w-0 flex-1 truncate font-semibold">
        {r.name}
        {r.me ? <span className="font-normal"> {t.you}</span> : null}
      </span>
      <span className="inline-flex items-center gap-1 font-mono text-sm">
        <FlameIcon className="size-4" />
        <span aria-hidden="true">{r.score}</span>
        <span className="sr-only">{t.streakSr(r.score)}</span>
      </span>
    </li>
  );
  return (
    <>
      {board === undefined ? (
        <Skeleton />
      ) : board === null ? (
        <p className="mt-4 rounded-lg bg-paper px-3 py-6 text-center text-muted">{t.boardFailed}</p>
      ) : board.rows.length ? (
        <ol className="mt-4 space-y-1.5">
          {board.rows.map((r, i) => row(r, String(i)))}
          {meBelow ? row(meBelow, "me") : null}
        </ol>
      ) : (
        <p className="mt-4 rounded-lg bg-paper px-3 py-6 text-center text-muted">{t.streakEmpty}</p>
      )}
      {board !== undefined && (board?.rows.length ?? 0) < 5 ? (
        <Link
          href="/endless"
          className="mt-1.5 flex items-center gap-3 rounded-lg border-2 border-dashed border-line px-3 py-2 text-muted hover:border-primary hover:text-ink"
        >
          <span aria-hidden="true" className="w-6 text-center font-bold">?</span>
          <span className="min-w-0 flex-1 font-semibold leading-tight">{board?.me ? t.streakBeat(board.me.score) : t.spotWaiting}</span>
          <span className="shrink-0 text-sm font-bold text-primary">{t.spotPlay} →</span>
        </Link>
      ) : null}
      <Link href="/leaderboard#endless" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
        {t.boardCta} →
      </Link>
    </>
  );
}
