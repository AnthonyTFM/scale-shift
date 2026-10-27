"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MedalIcon } from "@/components/site/Icons";
import { endlessCopy } from "@/content/endless";
import { leaderboardCopy as L } from "@/content/leaderboard";
import type { EndlessBoard } from "@/lib/leaderboard-types";
import { playerId } from "@/lib/player";

const E = endlessCopy.board;

/** A drawn medal for the top three (the rank is read out to screen readers), the plain number below that. */
const rankCell = (rank: number) =>
  rank <= 3 ? (
    <>
      <MedalIcon place={rank as 1 | 2 | 3} className="-my-0.5 size-6" />
      <span className="sr-only">{rank}</span>
    </>
  ) : (
    rank
  );

/**
 * The leaderboard: endless mode's Best streaks of all time. Daily scores are private (no public daily board, the way
 * Wordle does it), so this is the one public ranking.
 */
export function LeaderboardView() {
  const [board, setBoard] = useState<EndlessBoard | null | undefined>(undefined);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    const id = playerId();
    fetch(`/api/endless?scope=all&limit=100${id ? `&player=${id}` : ""}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: EndlessBoard) => alive && setBoard(data))
      .catch(() => alive && setBoard(null));
    return () => {
      alive = false;
    };
  }, [reload]);

  return (
    <div>
      <div id="lb-panel" tabIndex={-1} className="card overflow-hidden outline-none" aria-live="polite" aria-busy={board === undefined}>
        {board === undefined ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-paper" />
            ))}
          </div>
        ) : board === null ? (
          // the panel is already a polite live region, so this needs no alert role of its own
          <div className="p-6 text-center text-ink-soft">
            <p>{L.failed}</p>
            <button
              type="button"
              onClick={() => {
                // the button gives way to the loading rows: keep keyboard focus in the panel rather than the page top
                document.getElementById("lb-panel")?.focus({ preventScroll: true });
                setBoard(undefined);
                setReload((n) => n + 1);
              }}
              className="btn btn-white mt-3 h-11 px-5 text-sm"
            >
              {L.retry}
            </button>
          </div>
        ) : (
          <StreakTable board={board} />
        )}
      </div>
      <Link href="/endless" className="btn btn-gold mt-4 w-full justify-between px-4 py-3 text-left leading-snug">
        <span>{E.play}</span>
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="p-6 text-center text-ink-soft">{text}</p>;
}

function StreakTable({ board }: { board: EndlessBoard }) {
  if (!board.rows.length)
    return (
      <>
        <p className="px-4 pt-3 text-xs font-semibold text-muted">{E.allCaption}</p>
        <Empty text={E.emptyAll} />
      </>
    );
  const meOutside = board.me && !board.rows.some((r) => r.me);
  return (
    <table className="w-full table-fixed text-left text-sm">
      <caption className="px-4 pt-3 text-left text-xs font-semibold text-muted">{E.allCaption}</caption>
      <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-muted">
        <tr>
          <th scope="col" className="w-12 px-3 py-2.5 sm:w-16 sm:px-4">
            Rank
          </th>
          <th scope="col" className="px-2 py-2.5">
            Player
          </th>
          <th scope="col" className="w-20 px-3 py-2.5 text-right sm:w-24 sm:px-4">
            {E.streak}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {[...board.rows, ...(meOutside && board.me ? [board.me] : [])].map((r, i) => (
          <tr key={`${i}-${r.name}`} className={r.me ? "bg-gold-soft font-bold" : undefined}>
            <td className="px-3 py-2.5 text-ink sm:px-4">
              {rankCell(r.rank)}
            </td>
            <td className="max-w-0 px-2 py-2.5 text-ink">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="min-w-0 [overflow-wrap:anywhere]">{r.name}</span>
                {r.me ? <span className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-[10px] uppercase leading-none text-white">You</span> : null}
              </span>
            </td>
            <td className="px-3 py-2.5 text-right font-display tabular-nums text-ink sm:px-4">{r.score}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={3} className="border-t border-line px-4 py-2 text-xs text-muted">
            {board.total} {board.total === 1 ? "player" : "players"}. {E.note}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
