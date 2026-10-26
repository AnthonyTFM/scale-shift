"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadSave, localDateKey } from "@/lib/daily";
import { challengeMessage } from "@/lib/challenge-friend";
import { useShareBox } from "@/components/site/ShareBox";
import { playerId } from "@/lib/player";
import { home } from "@/content/home";
import type { AllTimeBoard, DayBoard, DayRow, EndlessBoard } from "@/lib/leaderboard-types";
import { FlameIcon, TrophyIcon } from "@/components/site/Icons";

type Tab = "daily" | "endless";
// the tab a visitor last looked at, so endless players land on their board
const TAB_KEY = "atlas-home-board";

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

/** The leaderboard card under the hero: the daily challenge's board or endless mode's best streaks, one tab each. */
export function HeroLeaderboard() {
  // unknown until this browser's last tab has been read, so only the board it shows gets loaded
  const [tab, setTab] = useState<Tab | null>(null);
  // boards stay loaded once seen, so switching back is instant
  const [seen, setSeen] = useState<Tab[]>([]);
  const [totals, setTotals] = useState<Partial<Record<Tab, number>>>({});
  const t = home.hub;
  useEffect(() => {
    let saved: Tab = "daily";
    try {
      if (localStorage.getItem(TAB_KEY) === "endless") saved = "endless";
    } catch {
      /* storage blocked: start on the daily */
    }
    queueMicrotask(() => {
      setTab(saved);
      setSeen([saved]);
    });
  }, []);
  const pick = (next: Tab) => {
    setTab(next);
    setSeen((s) => (s.includes(next) ? s : [...s, next]));
    try {
      localStorage.setItem(TAB_KEY, next);
    } catch {
      /* storage blocked */
    }
  };
  const tabs: [Tab, string][] = [
    ["daily", t.boardTabs.daily],
    ["endless", t.boardTabs.endless],
  ];
  return (
    <div className="rounded-card bg-card p-5 text-ink shadow-float ring-1 ring-line md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        {/* hidden (but holding its space) until the saved tab is known, so the title doesn't change in front of you */}
        <h2 className={`flex items-center gap-2 font-display text-2xl text-ink sm:text-[1.7rem] ${tab ? "" : "invisible"}`}>
          <TrophyIcon className="size-8" /> {tab === "endless" ? t.streakTitle : t.boardTitle}
        </h2>
        {/* beside the title (under it on narrow phones), not above the list, so the list doesn't jump when it arrives */}
        {tab && totals[tab] ? (
          <p className="whitespace-nowrap text-xs text-muted">{tab === "endless" ? t.streakPlayers(totals[tab]) : t.boardPlayers(totals[tab])}</p>
        ) : null}
      </div>
      <div
        role="tablist"
        aria-label={t.boardTabsLabel}
        onKeyDown={(e) => {
          // arrow keys move between the two tabs, as screen-reader users expect from a tab list
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key) || e.altKey || e.ctrlKey || e.metaKey) return;
          e.preventDefault();
          const next = tab === "endless" ? "daily" : "endless";
          pick(e.key === "Home" ? "daily" : e.key === "End" ? "endless" : next);
          e.currentTarget.querySelector<HTMLElement>(`[data-tab="${e.key === "Home" ? "daily" : e.key === "End" ? "endless" : next}"]`)?.focus();
        }}
        className="mt-3 grid grid-cols-2 rounded-2xl border-2 border-line bg-white p-1 text-sm font-bold"
      >
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            data-tab={id}
            id={`home-board-tab-${id}`}
            aria-controls={`home-board-panel-${id}`}
            aria-selected={tab === id}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => pick(id)}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 aria-selected:bg-primary aria-selected:text-white"
          >
            {id === "endless" ? <FlameIcon className="size-4" /> : null}
            {label}
          </button>
        ))}
      </div>
      {tab === null ? <Skeleton /> : null}
      {tabs.map(([id]) => (
        <div key={id} id={`home-board-panel-${id}`} role="tabpanel" aria-labelledby={`home-board-tab-${id}`} hidden={tab !== id}>
          {seen.includes(id) ? (
            id === "daily" ? (
              <DailyBoard onTotal={(n) => setTotals((x) => ({ ...x, daily: n }))} />
            ) : (
              <StreakBoard onTotal={(n) => setTotals((x) => ({ ...x, endless: n }))} />
            )
          ) : null}
        </div>
      ))}
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

/** Today's daily top five, and your own spot if you've played. */
function DailyBoard({ onTotal }: { onTotal: (n: number) => void }) {
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
      if (b?.total) onTotal(b.total);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meBelow = board?.me && !board.rows.some((r) => r.me) ? board.me : null;
  return (
    <>
      {board === undefined ? (
        <Skeleton />
      ) : board === null ? (
        <p className="mt-4 rounded-lg bg-paper px-3 py-6 text-center text-muted">{t.boardFailed}</p>
      ) : board.rows.length ? (
        <ol className="mt-4 space-y-1.5">
          {board.rows.map((r, i) => (
            <li
              key={i}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 ${r.me ? "bg-gold text-ink" : "bg-paper"}`}
            >
              <span className={`w-6 text-center font-bold ${r.rank <= 3 && !r.me ? "text-primary" : ""}`}>{r.rank}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">
                {r.name}
                {r.me ? <span className="font-normal"> {t.you}</span> : null}
              </span>
              <span className="font-mono text-sm">{r.score}/5</span>
            </li>
          ))}
          {meBelow ? (
            <li className="flex items-center gap-3 rounded-lg bg-gold px-3 py-2 text-ink">
              <span className="w-6 text-center font-bold">{meBelow.rank}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">
                {meBelow.name} <span className="font-normal">{t.you}</span>
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
            {fallback.rows.map((r, i) => (
              <li key={i} className="flex items-center gap-3 rounded-lg bg-paper px-3 py-2">
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
            <span aria-hidden="true" className="w-6 text-center font-bold">?</span>
            <span className="min-w-0 flex-1 truncate font-semibold">{t.spotWaiting}</span>
            <span className="text-sm font-bold text-primary">{t.spotPlay} →</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => share(challengeMessage(myScore), "home-board")}
            className="mt-1.5 flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-line px-3 py-2 text-left text-muted hover:border-primary hover:text-ink"
          >
            <span aria-hidden="true" className="w-6 text-center font-bold">+</span>
            <span className="min-w-0 flex-1 truncate font-semibold">{t.beatMe}</span>
            <span aria-hidden="true" className="text-sm font-bold text-primary">
              →
            </span>
          </button>
        )
      ) : null}
      {box}
      <Link href="/leaderboard" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
        {t.boardCta} →
      </Link>
    </>
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
