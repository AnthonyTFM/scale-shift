"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MedalIcon } from "@/components/site/Icons";
import { dayNumber, LAUNCH, localDateKey, loadSave, QUESTIONS_PER_DAY, shiftDate, type DayRecord } from "@/lib/daily";
import { dailyCopy } from "@/content/daily";
import { LeaderboardJoin } from "./LeaderboardJoin";
import { POSTED_EVENT } from "./useJoin";
import type { AllTimeBoard, DayBoard, WeekBoard } from "@/lib/leaderboard-types";
import { loadPlayer, playerId } from "@/lib/player";

type Tab = "day" | "week" | "all";
const TABS = [
  ["day", "Daily"],
  ["week", "This week"],
  ["all", "All time"],
] as const satisfies readonly (readonly [Tab, string])[];
type Loaded = { key: string; data: DayBoard | WeekBoard | AllTimeBoard | null; failed: boolean };

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
const shortDate = (key: string) => new Date(`${key}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const prettyDate = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

export function LeaderboardView() {
  const [tab, setTab] = useState<Tab>("day");
  const [today, setToday] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  // today's round from this browser: who played it, and their answers if they did (to post it from here)
  const [me, setMe] = useState<{ name: string | null; playedToday: boolean; round?: DayRecord }>({ name: null, playedToday: false });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const t = localDateKey();
    queueMicrotask(() => {
      setToday(t);
      setDate(t);
      const round = loadSave().days[t];
      setMe({ name: loadPlayer()?.name ?? null, playedToday: typeof round?.s === "number", round });
    });
    // a score posted from this page: load the board again so it shows
    const posted = () => setReload((n) => n + 1);
    window.addEventListener(POSTED_EVENT, posted);
    return () => window.removeEventListener(POSTED_EVENT, posted);
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
  }, [key, tab, reload]);

  const current = loaded?.key === key ? loaded : null;
  // played today in this browser, but the score isn't on today's board: offer to post it
  const todayBoard = tab === "day" && date === today && current?.data && !current.failed ? (current.data as DayBoard) : null;
  const notPosted =
    !!todayBoard && me.playedToday && !!me.round?.c.length && !todayBoard.rows.some((r) => r.me) && !todayBoard.me;
  // once offered, the join stays on the page: posting reloads the board, and the pop-up's "You're #N" step must not vanish
  const [offered, setOffered] = useState(false);
  if (notPosted && !offered) setOffered(true);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Leaderboard"
        onKeyDown={(e) => {
          // arrow keys move between tabs, as screen-reader users expect from a tab list
          if (e.altKey || e.ctrlKey || e.metaKey) return; // leave browser shortcuts such as Alt+← alone
          const ids = TABS.map(([id]) => id);
          const i = ids.indexOf(tab);
          const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: ids.length - 1 }[e.key];
          if (next === undefined) return;
          e.preventDefault();
          const id = ids[(next + ids.length) % ids.length];
          setTab(id);
          e.currentTarget.querySelector<HTMLElement>(`[data-tab="${id}"]`)?.focus();
        }}
        className="inline-grid grid-cols-3 rounded-2xl border-2 border-line bg-white p-1 text-sm font-semibold"
      >
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            data-tab={id}
            id={`lb-tab-${id}`}
            aria-controls="lb-panel"
            aria-selected={tab === id}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            className="min-h-11 rounded-xl px-3 py-2 font-bold aria-selected:bg-primary aria-selected:text-white sm:px-5"
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
            className="btn btn-white size-12 p-0 text-xl disabled:opacity-30"
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
            className="btn btn-white size-12 p-0 text-xl disabled:opacity-30"
          >
            ›
          </button>
        </div>
      ) : null}

      {offered && today && me.round ? (
        <LeaderboardJoin
          date={today}
          choices={me.round.c}
          score={me.round.s ?? 0}
          hint={dailyCopy.boardNudge(me.round.s ?? 0, QUESTIONS_PER_DAY)}
        />
      ) : null}

      {tab === "day" && date === today && !me.playedToday ? (
        <Link href="/daily" className="btn btn-gold mt-4 w-full justify-between px-4 py-3 text-left leading-snug">
          <span>You haven&apos;t played today yet. Get on the board!</span>
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}

      <div
        id="lb-panel"
        role="tabpanel"
        aria-labelledby={`lb-tab-${tab}`}
        className="card mt-4 overflow-hidden"
        aria-live="polite"
        aria-busy={!current}
      >
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
          <tr key={`${i}-${r.name}`} className={r.me ? "bg-gold-soft font-bold" : undefined}>
            <td className="px-3 py-2.5 text-ink sm:px-4">
              {rankCell(r.rank)}
            </td>
            <td className="max-w-0 px-2 py-2.5 text-ink">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate">{r.name}</span>
                {r.me ? <span className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-[10px] uppercase leading-none text-white">You</span> : null}
              </span>
            </td>
            <td className="px-3 py-2.5 text-right font-display tabular-nums text-ink sm:px-4">{r.score}/5</td>
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
            <tr key={`${i}-${r.name}`} className={r.me ? "bg-gold-soft font-bold" : undefined}>
              <td className="px-3 py-2.5 text-ink sm:px-4">{rankCell(r.rank)}</td>
              <td className="max-w-0 px-2 py-2.5 text-ink">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate">{r.name}</span>
                  {r.me ? <span className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-[10px] uppercase leading-none text-white">You</span> : null}
                </span>
              </td>
              <td className="px-2 py-2.5 text-right font-display tabular-nums text-ink">{r.points}</td>
              <td className="hidden px-2 py-2.5 text-right font-display tabular-nums text-ink sm:table-cell">{r.days}</td>
              <td className="px-3 py-2.5 text-right font-display tabular-nums text-ink sm:px-4">{r.average.toFixed(1)}</td>
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
