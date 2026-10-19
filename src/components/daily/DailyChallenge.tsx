"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dataVersion from "@/data/data-version.json";
import { site } from "@/content/site";
import { track } from "@/lib/analytics";
import {
  buildQuestions,
  dayNumber,
  explain,
  loadSave,
  localDateKey,
  stats,
  writeSave,
  type DailySave,
  type PoolEntry,
  type Question,
} from "@/lib/daily";
import { dailyContext } from "@/content/daily-context";
import { LeaderboardJoin } from "./LeaderboardJoin";
import { formatBoth } from "@/lib/format";
import { mapUrl } from "@/lib/share";
import { challengeHash, readChallenge, type Challenge } from "@/lib/challenge";
import { loadPlayer } from "@/lib/player";

type Outline = { d: string; b: [number, number, number, number] };
type ShapeFile = { merc: Outline; ea: Outline };

type Round = {
  /** date key for the daily round, null for practice */
  date: string | null;
  questions: Question[];
  shapes: Record<string, ShapeFile>;
};

const COLORS = ["#E8366B", "#2F6FDE"];
const V = `?v=${dataVersion.v}`;

let poolPromise: Promise<PoolEntry[]> | null = null;
const loadPool = () =>
  (poolPromise ??= fetch(`/data/daily/index.json${V}`).then((r) => {
    if (!r.ok) throw new Error("pool");
    return r.json();
  }));

async function loadRound(seed: string, date: string | null): Promise<Round> {
  const pool = await loadPool();
  const questions = buildQuestions(pool, seed);
  const ids = [...new Set(questions.flatMap((q) => q.options.map((o) => o.id)))];
  const files = await Promise.all(
    ids.map((id) =>
      fetch(`/data/daily/shapes/${id}.json${V}`).then((r) => {
        if (!r.ok) throw new Error(id);
        return r.json() as Promise<ShapeFile>;
      }),
    ),
  );
  return { date, questions, shapes: Object.fromEntries(ids.map((id, i) => [id, files[i]])) };
}

const scoreOf = (round: Round, choices: number[]) => choices.filter((c, i) => round.questions[i]?.answer === c).length;

type Game = { round: Round; today: string; save: DailySave; choices: number[]; step: number };

/** Load today's round (or a fresh practice round) and any saved progress for today. */
async function prepare(practice: boolean): Promise<Game> {
  const today = localDateKey();
  const round = await loadRound(practice ? `practice-${Date.now()}` : today, practice ? null : today);
  const save = loadSave();
  const choices = practice ? [] : (save.days[today]?.c ?? []);
  return { round, today, save, choices, step: Math.min(choices.length, round.questions.length) };
}

/**
 * Today's progress lives in this browser's storage, shared by all its tabs. If another tab has answered more of today's
 * questions, take its answers (the first answer to each question counts, as on the leaderboard). Practice rounds are
 * per tab and left alone.
 */
function catchUp(g: Game): Game {
  if (!g.round.date) return g;
  const save = loadSave();
  const saved = save.days[g.round.date]?.c ?? [];
  if (saved.length <= g.choices.length) return g;
  return { ...g, save, choices: saved, step: Math.min(saved.length, g.round.questions.length) };
}

export function DailyChallenge() {
  const [game, setGame] = useState<Game | null>(null);
  const [failed, setFailed] = useState(false);
  // someone sent a "can you beat me?" link
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  useEffect(() => {
    const c = readChallenge(location.hash);
    if (c) queueMicrotask(() => setChallenge(c));
    prepare(false)
      .then(setGame)
      .catch(() => setFailed(true));
    // another tab answered: show its progress here too, so tabs never disagree (or let today be played twice)
    const sync = () => setGame((g) => (g ? catchUp(g) : g));
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const start = (practice: boolean) => {
    setFailed(false);
    setGame(null);
    if (practice) track("daily_practice_start");
    prepare(practice)
      .then(setGame)
      .catch(() => setFailed(true));
  };

  if (failed) {
    return (
      <div role="alert" className="rounded-card border border-line bg-white p-6 text-center">
        <p className="font-semibold">We couldn&apos;t load the challenge.</p>
        <button type="button" onClick={() => start(false)} className="mt-3 h-11 rounded-lg bg-panel px-5 font-bold text-panel-text">
          Try again
        </button>
      </div>
    );
  }
  if (!game) return <Skeleton />;
  const { round, today, save, choices, step } = game;

  const answer = (choice: number) => {
    if (choices.length > step) return;
    // this question was already answered in another tab: that answer stands
    const caught = catchUp(game);
    if (caught !== game) return setGame(caught);
    const next = [...choices, choice];
    const q = round.questions[step];
    track("daily_answer", { n: step + 1, correct: q.answer === choice, practice: !round.date });
    let updated = save;
    if (round.date) {
      const fresh = loadSave(); // keep anything other tabs saved
      const done = next.length >= round.questions.length;
      updated = { ...fresh, days: { ...fresh.days, [round.date]: { c: next, ...(done ? { s: scoreOf(round, next) } : {}) } } };
      writeSave(updated);
      if (done) track("daily_complete", { score: scoreOf(round, next), day: dayNumber(round.date) });
    }
    setGame({ ...game, choices: next, save: updated });
  };

  const finished = step >= round.questions.length;
  const todayNo = round.date ? dayNumber(round.date) : null;
  return (
    <div>
      {challenge && todayNo && !finished ? (
        <p className="mb-3 rounded-xl bg-amber-100 p-3 text-sm font-semibold text-amber-950 ring-1 ring-amber-300">
          🎯{" "}
          {challenge.day === todayNo
            ? `${challenge.name} scored ${challenge.score}/5 on today's challenge. Can you beat it?`
            : `${challenge.name} sent you Daily #${challenge.day}. Here's today's: play it and send your score back.`}
        </p>
      ) : null}
      <Progress round={round} choices={choices} step={step} />
      {finished ? (
        <Results
          round={round}
          choices={choices}
          save={save}
          today={today}
          challenge={challenge && round.date && challenge.day === dayNumber(round.date) ? challenge : null}
          onPractice={() => start(true)}
          onToday={() => start(false)}
        />
      ) : (
        <QuestionCard
          key={`${round.date ?? "practice"}-${step}`}
          n={step}
          total={round.questions.length}
          q={round.questions[step]}
          shapes={round.shapes}
          picked={choices[step]}
          practice={!round.date}
          onPick={answer}
          onNext={() => setGame({ ...game, step: step + 1 })}
        />
      )}
    </div>
  );
}

// ---------- pieces ----------

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading today's challenge" className="rounded-card border border-line bg-white p-5">
      <div className="h-5 w-1/2 animate-pulse rounded bg-line" />
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="aspect-square animate-pulse rounded-xl bg-paper" />
        <div className="aspect-square animate-pulse rounded-xl bg-paper" />
      </div>
    </div>
  );
}

function Progress({ round, choices, step }: { round: Round; choices: number[]; step: number }) {
  return (
    <ol className="mb-4 flex items-center gap-2" aria-label="Progress">
      {round.questions.map((q, i) => {
        const done = i < choices.length;
        const right = done && choices[i] === q.answer;
        return (
          <li
            key={i}
            aria-label={`Question ${i + 1}: ${done ? (right ? "correct" : "wrong") : i === step ? "current" : "not answered"}`}
            className={`h-2.5 flex-1 rounded-full ${done ? (right ? "bg-formal" : "bg-danger") : i === step ? "bg-accent" : "bg-line"}`}
          />
        );
      })}
    </ol>
  );
}

function QuestionCard({
  n,
  total,
  q,
  shapes,
  picked,
  practice,
  onPick,
  onNext,
}: {
  n: number;
  total: number;
  q: Question;
  shapes: Record<string, ShapeFile>;
  picked: number | undefined;
  practice: boolean;
  onPick: (i: number) => void;
  onNext: () => void;
}) {
  const answered = picked !== undefined;
  const correct = picked === q.answer;
  const nextRef = useRef<HTMLButtonElement>(null);
  const view = answered ? "ea" : "merc";
  const outlines = q.options.map((o) => shapes[o.id][view]);
  // one shared scale for both tiles, so the two drawings compare fairly
  const span = Math.max(...outlines.map((o) => Math.max(o.b[2] - o.b[0], o.b[3] - o.b[1]))) * 1.12;

  useEffect(() => {
    if (answered) nextRef.current?.focus();
  }, [answered]);

  return (
    <section aria-labelledby="daily-q" className="rounded-card border border-line bg-white p-4 shadow-sm sm:p-6">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">
        {practice ? "Practice · " : ""}Question {n + 1} of {total}
      </p>
      <h2 id="daily-q" className="mt-1 font-display text-2xl text-ink sm:text-3xl">
        {q.prompt}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {answered ? "Now drawn at their true size, side by side." : "Shown the way a normal web map draws them. Tap the one you think is bigger."}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {q.options.map((o, i) => {
          const isAnswer = i === q.answer;
          const ring = !answered
            ? "ring-1 ring-line hover:ring-2 hover:ring-accent"
            : isAnswer
              ? "ring-2 ring-formal"
              : picked === i
                ? "ring-2 ring-danger"
                : "ring-1 ring-line opacity-80";
          return (
            <button
              key={o.id}
              type="button"
              disabled={answered}
              onClick={() => onPick(i)}
              aria-label={answered ? undefined : `${o.n}, ${o.sub}`}
              className={`flex min-w-0 flex-col rounded-xl bg-paper p-2 text-left transition disabled:cursor-default sm:p-3 ${ring}`}
            >
              <Tile outline={outlines[i]} span={span} color={COLORS[i]} />
              <span className="mt-2 block truncate text-sm font-bold text-ink sm:text-base">{o.n}</span>
              <span className="block truncate text-xs text-muted">{o.sub}</span>
              {answered ? (
                <span className="mt-1 block text-xs font-semibold text-ink-soft">
                  {formatBoth(o.a)}
                  {isAnswer ? <span className="ml-1 rounded bg-formal px-1.5 py-0.5 text-[10px] uppercase text-white">Bigger</span> : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <WhoIsWho options={q.options} />

      <div aria-live="polite">
        {answered ? (
          <div className={`mt-4 rounded-xl p-4 ${correct ? "bg-emerald-50 text-emerald-950" : "bg-rose-50 text-rose-950"}`}>
            <p className="font-bold">{correct ? "Correct!" : "Not quite."}</p>
            {explain(q).map((line) => (
              <p key={line} className="mt-1 text-sm leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        ) : null}
      </div>
      {answered ? (
        <button
          ref={nextRef}
          type="button"
          onClick={onNext}
          className="mt-4 h-12 w-full rounded-lg bg-panel font-bold text-panel-text hover:bg-panel-2"
        >
          {n + 1 < total ? "Next question" : "See my results"}
        </button>
      ) : null}
    </section>
  );
}

/** Short "what was it / where is it today" notes for the historical states in a question. */
function WhoIsWho({ options }: { options: Question["options"] }) {
  const notes = options.filter((o) => o.kind === "history" && dailyContext[o.src]);
  if (!notes.length) return null;
  return (
    <div className="mt-3 space-y-2 rounded-xl bg-paper p-3 text-sm">
      {notes.map((o) => {
        const c = dailyContext[o.src];
        return (
          <p key={o.id} className="leading-relaxed text-ink-soft">
            <strong className="text-ink">{o.n}</strong> <span className="text-muted">({o.sub})</span>: {c.what}{" "}
            <span className="font-semibold text-ink">Today: {c.today}.</span>
          </p>
        );
      })}
    </div>
  );
}

function Tile({ outline, span, color }: { outline: Outline; span: number; color: string }) {
  const [x0, y0, x1, y1] = outline.b;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const tiny = Math.max(x1 - x0, y1 - y0) < span * 0.06;
  return (
    <svg viewBox={`${cx - span / 2} ${cy - span / 2} ${span} ${span}`} className="aspect-square w-full rounded-lg bg-[#cfe6f1]" aria-hidden="true">
      <path d={outline.d} fill={color} fillOpacity={0.85} stroke={color} strokeWidth={span / 260} fillRule="evenodd" strokeLinejoin="round" />
      {tiny ? <circle cx={cx} cy={cy} r={span * 0.08} fill="none" stroke={color} strokeWidth={span / 120} /> : null}
    </svg>
  );
}

function mapHref(q: Question) {
  return mapUrl({ era: "present", shapes: q.options.map((o, i) => ({ era: o.era, name: o.src, color: i })) });
}

function Results({
  round,
  choices,
  save,
  today,
  challenge,
  onPractice,
  onToday,
}: {
  round: Round;
  choices: number[];
  save: DailySave;
  today: string;
  challenge: Challenge | null;
  onPractice: () => void;
  onToday: () => void;
}) {
  const score = scoreOf(round, choices);
  const total = round.questions.length;
  const s = stats(save, today);
  const grid = round.questions.map((q, i) => (choices[i] === q.answer ? "🟩" : "🟥")).join("");
  const [copied, setCopied] = useState("");
  const verdict =
    score === total
      ? "Perfect. Mercator can't fool you."
      : score >= total - 1
        ? "Sharp eye. One got past you."
        : score >= 3
          ? "Not bad. The map tricked you twice."
          : "The map fooled you today. New questions tomorrow.";

  const challengeFriend = async () => {
    if (!round.date) return;
    const url = `${location.origin}/daily${challengeHash(dayNumber(round.date), score, loadPlayer()?.name ?? null)}`;
    const text = `I got ${score}/${total} on today's ${site.name} challenge. Think you can beat me?\n${url}`;
    track("daily_challenge_friend", { score });
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied("Challenge link copied! Send it to a friend.");
    } catch {
      setCopied(text);
    }
  };

  const share = async () => {
    const url = `${location.origin}/daily`;
    const text = `${site.name} Daily #${dayNumber(today)} · ${score}/${total}\n${grid}\n${url}`;
    track("daily_share", { score });
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied("Copied! Paste it anywhere.");
    } catch {
      setCopied(text);
    }
  };

  return (
    <section aria-labelledby="daily-done" className="rounded-card border border-line bg-white p-4 shadow-sm sm:p-6">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{round.date ? `Daily #${dayNumber(round.date)}` : "Practice round"}</p>
      <h2 id="daily-done" className="mt-1 font-display text-3xl text-ink">
        You got {score} out of {total}
      </h2>
      <p className="mt-1 text-ink-soft">{verdict}</p>
      {challenge ? (
        <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-sm font-bold text-amber-950">
          {score > challenge.score
            ? `🏆 You beat ${challenge.name} (${challenge.score}/5)! Send them a rematch.`
            : score === challenge.score
              ? `🤝 Tied with ${challenge.name} at ${score}/5.`
              : `${challenge.name} wins this one with ${challenge.score}/5. Get them back tomorrow.`}
        </p>
      ) : null}
      <p className="mt-3 text-2xl tracking-[0.2em]" aria-label={`${score} correct, ${total - score} wrong`}>
        {grid}
      </p>

      {round.date ? (
        <>
          <dl className="mt-5 grid grid-cols-4 gap-2 text-center">
            {[
              ["Streak", s.streak],
              ["Best", s.best],
              ["Played", s.played],
              ["Avg", s.average.toFixed(1)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-paper p-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{k}</dt>
                <dd className="font-display text-2xl text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={share} className="h-12 flex-1 rounded-lg bg-accent font-bold text-panel hover:bg-accent-strong">
              Share my score
            </button>
            <button type="button" onClick={challengeFriend} className="h-12 flex-1 rounded-lg bg-panel font-bold text-panel-text hover:bg-panel-2">
              Challenge a friend
            </button>
            <button type="button" onClick={onPractice} className="h-12 flex-1 rounded-lg border border-line font-bold text-ink hover:bg-paper">
              Play a practice round
            </button>
          </div>
          <p aria-live="polite" className="mt-2 whitespace-pre-line text-sm text-formal">
            {copied}
          </p>
          <LeaderboardJoin date={round.date} choices={choices} />
          <Countdown />
        </>
      ) : (
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={onPractice} className="h-12 flex-1 rounded-lg bg-accent font-bold text-panel hover:bg-accent-strong">
            Another practice round
          </button>
          <button type="button" onClick={onToday} className="h-12 flex-1 rounded-lg border border-line font-bold text-ink hover:bg-paper">
            Back to today&apos;s results
          </button>
        </div>
      )}

      <h3 className="mt-6 font-bold text-ink">The answers</h3>
      <ol className="mt-2 divide-y divide-line">
        {round.questions.map((q, i) => {
          const big = q.options[q.answer];
          const small = q.options[1 - q.answer];
          return (
            <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 text-sm">
              <span aria-hidden="true">{choices[i] === q.answer ? "✅" : "❌"}</span>
              <span className="min-w-0 flex-1 text-ink">
                <strong>{big.n}</strong> <span className="text-muted">({big.sub})</span> is {(big.a / small.a).toFixed(1)}× the size of <strong>{small.n}</strong>{" "}
                <span className="text-muted">({small.sub})</span>
              </span>
              <Link href={mapHref(q)} className="font-semibold text-link hover:underline">
                Drag them on the map →
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Countdown() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      setLeft(Math.max(0, midnight.getTime() - now.getTime()));
    };
    const id = setInterval(tick, 1000);
    queueMicrotask(tick);
    return () => clearInterval(id);
  }, []);
  if (left === null) return null;
  if (left === 0) {
    return (
      <button type="button" onClick={() => location.reload()} className="mt-4 font-semibold text-link hover:underline">
        A new challenge is ready. Load it →
      </button>
    );
  }
  const t = Math.floor(left / 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    <p className="mt-4 text-sm text-muted">
      Next challenge in{" "}
      <span className="font-mono font-semibold text-ink" suppressHydrationWarning>
        {p(Math.floor(t / 3600))}:{p(Math.floor((t % 3600) / 60))}:{p(t % 60)}
      </span>
    </p>
  );
}
