"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { dayNumber, LAUNCH, localDateKey, loadSave, shiftDate } from "@/lib/daily";
import type { AllTimeBoard, DayBoard, WeekBoard } from "@/lib/leaderboard-types";
import { loadPlayer, playerId } from "@/lib/player";

type Tab = "day" | "week" | "all";
type Loaded = { key: string; data: DayBoard | WeekBoard | AllTimeBoard | null; failed: boolean };

const medal = (rank: number) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null);
const shortDate = (key: string) => new Date(`${key}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const prettyDate = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

export function LeaderboardView() {
  const [tab, setTab] = useState<Tab>("day");
  const [today, setToday] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [me, setMe] = useState<{ name: string | null; playedToday: boolean }>({ name: null, playedToday: false });

  useEffect(() => {
    const t = localDateKey();
    queueMicrotask(() => {
      setToday(t);
      setDate(t);
      setMe({ name: loadPlayer()?.name ?? null, playedToday: typeof loadSave().days[t]?.s === "number" });
    });
  }, []);

  const key = tab === "all" ? "all" : tab === "week" ? (today ? `week:${today}` : "") : (date ?? "");
  useEffect(() => {
    if (!key) return;
    let alive = true;
    const id = playerId();
    const url =
      tab === "all"
        ? `/api/leaderboard?scope=all&limit=100`
        : tab === "week"
          ? `/api/leaderboard?scope=week&date=${key.slice(5)}&limit=100`
          : `/api/leaderboard?scope=day&date=${key}&limit=100`;
    fetch(`${url}${id ? `&player=${id}` : ""}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => alive && setLoaded({ key, data, failed: false }))
      .catch(() => alive && setLoaded({ key, data: null, failed: true }));
    return () => {
      alive = false;
    };
  }, [key, tab]);

  const current = loaded?.key === key ? loaded : null;

  return (
    <div>
      <div role="tablist" aria-label="Leaderboard" className="inline-grid grid-cols-3 rounded-xl bg-white p-1 text-sm font-semibold ring-1 ring-line">
        {(
          [
            ["day", "Daily"],
            ["week", "This week"],
            ["all", "All time"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className="rounded-lg px-3 py-2 aria-selected:bg-panel aria-selected:text-panel-text sm:px-5"
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "day" && date && today ? (
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDate(shiftDate(date, -1))}
            disabled={date <= LAUNCH}
            aria-label="Previous day"
            className="grid size-10 place-items-center rounded-lg bg-white ring-1 ring-line hover:bg-paper disabled:opacity-30"
          >
            ‹
          </button>
          <p className="min-w-0 flex-1 text-center sm:flex-none sm:px-3">
            <span className="block font-bold text-ink">
              Daily #{dayNumber(date)}
              {date === today ? " · Today" : ""}
            </span>
            <span className="block text-xs text-muted">{prettyDate(date)}</span>
          </p>
          <button
            type="button"
            onClick={() => setDate(shiftDate(date, 1))}
            disabled={date >= today}
            aria-label="Next day"
            className="grid size-10 place-items-center rounded-lg bg-white ring-1 ring-line hover:bg-paper disabled:opacity-30"
          >
            ›
          </button>
        </div>
      ) : null}

      {tab === "day" && date === today && !me.playedToday ? (
        <Link href="/daily" className="mt-4 flex items-center justify-between rounded-xl bg-accent p-4 font-bold text-panel hover:bg-accent-strong">
          <span>You haven&apos;t played today yet. Get on the board!</span>
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-card border border-line bg-white" aria-live="polite" aria-busy={!current}>
        {!current ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-paper" />
            ))}
          </div>
        ) : current.failed ? (
          <p role="alert" className="p-6 text-center text-ink-soft">
            The leaderboard couldn&apos;t load. Please try again in a minute.
          </p>
        ) : tab === "day" ? (
          <DayTable board={current.data as DayBoard} />
        ) : tab === "week" ? (
          <AllTable
            board={current.data as WeekBoard}
            caption={`This week: ${shortDate((current.data as WeekBoard).start)} to ${shortDate((current.data as WeekBoard).end)}`}
            note="Resets every Monday. Each day you play this week adds to your points."
            empty="No scores yet this week. Play today's challenge to take the lead."
          />
        ) : (
          <AllTable board={current.data as AllTimeBoard} />
        )}
      </div>
      {me.name ? (
        <p className="mt-3 text-sm text-muted">
          You&apos;re playing as <strong className="text-ink">{me.name}</strong>. Change your nickname on the results screen after a daily round.
        </p>
      ) : null}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="p-6 text-center text-ink-soft">{text}</p>;
}

function DayTable({ board }: { board: DayBoard }) {
  if (!board.rows.length) return <Empty text="No scores yet for this day." />;
  const meOutside = board.me && !board.rows.some((r) => r.me);
  return (
    <table className="w-full table-fixed text-left text-sm">
      <caption className="sr-only">Scores for {board.date}</caption>
      <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-muted">
        <tr>
          <th scope="col" className="w-12 px-3 py-2.5 sm:w-16 sm:px-4">
            Rank
          </th>
          <th scope="col" className="px-2 py-2.5">
            Player
          </th>
          <th scope="col" className="w-20 px-3 py-2.5 text-right sm:w-24 sm:px-4">
            Score
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {[...board.rows, ...(meOutside && board.me ? [board.me] : [])].map((r, i) => (
          <tr key={`${i}-${r.name}`} className={r.me ? "bg-amber-100 font-bold" : undefined}>
            <td className="px-3 py-2.5 text-ink sm:px-4">
              {medal(r.rank) ?? r.rank}
              <span className="sr-only">{medal(r.rank) ? ` (rank ${r.rank})` : ""}</span>
            </td>
            <td className="max-w-0 px-2 py-2.5 text-ink">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate">{r.name}</span>
                {r.me ? <span className="shrink-0 rounded bg-panel px-1.5 py-0.5 text-[10px] uppercase leading-none text-white">You</span> : null}
              </span>
            </td>
            <td className="px-3 py-2.5 text-right font-mono text-ink sm:px-4">{r.score}/5</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={3} className="border-t border-line px-4 py-2 text-xs text-muted">
            {board.total} {board.total === 1 ? "player" : "players"}. Ties share a rank; earlier finishers are listed first.
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

function AllTable({
  board,
  caption = "All-time points",
  note = "One point per correct answer, every day you play.",
  empty = "No scores yet. Play today's challenge to be the first.",
}: {
  board: AllTimeBoard;
  caption?: string;
  note?: string;
  empty?: string;
}) {
  if (!board.rows.length) return <Empty text={empty} />;
  const meOutside = board.me && !board.rows.some((r) => r.me);
  return (
    <>
      <table className="w-full table-fixed text-left text-sm">
        <caption className="px-4 pt-3 text-left text-xs font-semibold text-muted">{caption}</caption>
        <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="w-12 px-3 py-2.5 sm:w-16 sm:px-4">
              Rank
            </th>
            <th scope="col" className="px-2 py-2.5">
              Player
            </th>
            <th scope="col" className="w-[4.5rem] px-2 py-2.5 text-right sm:w-24">
              Points
            </th>
            <th scope="col" className="hidden px-2 py-2.5 text-right sm:table-cell sm:w-20">
              Days
            </th>
            <th scope="col" className="w-16 px-3 py-2.5 text-right sm:w-20 sm:px-4">
              Avg
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {[...board.rows, ...(meOutside && board.me ? [board.me] : [])].map((r, i) => (
            <tr key={`${i}-${r.name}`} className={r.me ? "bg-amber-100 font-bold" : undefined}>
              <td className="px-3 py-2.5 text-ink sm:px-4">{medal(r.rank) ?? r.rank}</td>
              <td className="max-w-0 px-2 py-2.5 text-ink">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate">{r.name}</span>
                  {r.me ? <span className="shrink-0 rounded bg-panel px-1.5 py-0.5 text-[10px] uppercase leading-none text-white">You</span> : null}
                </span>
              </td>
              <td className="px-2 py-2.5 text-right font-mono text-ink">{r.points}</td>
              <td className="hidden px-2 py-2.5 text-right font-mono text-ink sm:table-cell">{r.days}</td>
              <td className="px-3 py-2.5 text-right font-mono text-ink sm:px-4">{r.average.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* outside the table: a footer cell spanning 5 columns would keep a hidden Days column taking room on phones */}
      <p className="border-t border-line px-4 py-2 text-xs text-muted">
        {board.total} {board.total === 1 ? "player" : "players"}. {note}
      </p>
    </>
  );
}
