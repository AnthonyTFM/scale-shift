"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dataVersion from "@/data/data-version.json";
import { site } from "@/content/site";
import { track } from "@/lib/analytics";
import {
  buildQuestions,
  dayNumber,
  mergeDays,
  explain,
  nameInSentence,
  sizeParts,
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
import { readChallenge, type Challenge } from "@/lib/challenge";
import { playerId, rememberPlayer } from "@/lib/player";
import { signInOn } from "@/lib/sign-in";
import { PlayedElsewhere } from "./PlayedElsewhere";
import { play, setSound, soundOn } from "@/lib/sound";
import { buzz, confetti } from "@/lib/celebrate";
import { mainBox, mainPart, type Outline, type ShapeFile } from "@/lib/outline";
import { resultImage } from "@/lib/result-image";
import { challengeMessage } from "@/lib/challenge-friend";
import { useShareBox } from "@/components/site/ShareBox";
import type { DayBoard } from "@/lib/leaderboard-types";
import { dailyCopy } from "@/content/daily";
import { FlameIcon, MarkIcon, SpeakerIcon, TargetIcon, TickIcon, TrophyIcon } from "@/components/site/Icons";
import { useAccount } from "./SignInProvider";

const reveal = dailyCopy.reveal;
const R = dailyCopy.results;
const reducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
// where a new round lines up: just under the sticky site header
const ROUND_TOP = 88;
// square tiles, a little flatter on short laptop screens so both shapes fit on the first screen (the drawing stays centred
// at its own proportions)
const TILE = "aspect-square [@media(min-width:768px)_and_(max-height:820px)]:aspect-[5/4]";


type Round = {
  /** date key for the daily round, null for practice */
  date: string | null;
  questions: Question[];
  shapes: Record<string, ShapeFile>;
};

// the two shapes on the game tiles: bright fills (they are drawings, not text)
const COLORS = ["#FF5B4A", "#2F6BFF"];
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

/** Signed-in players: take today's result from their account (played on another device) and show it here. */
function syncAccount(setGame: React.Dispatch<React.SetStateAction<Game | null>>) {
  fetch(`/api/leaderboard/me?today=${localDateKey()}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { player?: { id: string; name: string | null } | null; days?: Record<string, { c: number[]; s: number }> } | null) => {
      if (d?.player?.name) rememberPlayer({ id: d.player.id, name: d.player.name });
      if (!d?.days || !Object.keys(d.days).length) return;
      const save = mergeDays(d.days);
      setGame((g) => (g ? official(g, save) : g));
    })
    .catch(() => {});
}

/** Load today's round (or a fresh practice round) and any saved progress for today. */
async function prepare(practice: boolean): Promise<Game> {
  const today = localDateKey();
  const round = await loadRound(practice ? `practice-${Date.now()}` : today, practice ? null : today);
  const save = loadSave();
  const choices = practice ? [] : (save.days[today]?.c ?? []);
  return { round, today, save, choices, step: Math.min(choices.length, round.questions.length) };
}

/** Show the leaderboard's result for this round in place of whatever this browser had (they're the first try). */
function official(g: Game, save: DailySave): Game {
  const rec = g.round.date ? save.days[g.round.date] : undefined;
  if (!rec || typeof rec.s !== "number") return { ...g, save };
  return { ...g, save, choices: rec.c, step: g.round.questions.length };
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
  // set when the player moves on, so the next question (or the results) takes focus; not on first load
  const advanced = useRef(false);
  // the top of the game (progress bar), where a new round starts
  const gameTop = useRef<HTMLDivElement>(null);
  const restarted = useRef(false);

  useEffect(() => {
    if (!advanced.current) return;
    // "Next" has gone, so focus would fall back to the page: move it to the new heading instead, which screen readers
    // announce and from which Tab reaches the answers; and bring the card back into view if it scrolled off the top
    const heading = document.getElementById("daily-q") ?? document.getElementById("daily-done");
    const card = heading?.closest("section");
    // a new round is still loading: keep waiting for its first question
    if (!heading || !card) return;
    advanced.current = false;
    const behavior = reducedMotion() ? "auto" : "smooth";
    if (restarted.current && gameTop.current) {
      // a new round: line up the progress bar under the header (the page changed height while it loaded)
      restarted.current = false;
      scrollTo({ top: Math.max(0, gameTop.current.getBoundingClientRect().top + scrollY - ROUND_TOP), behavior });
    } else {
      const top = card.getBoundingClientRect().top;
      if (top < 72) scrollTo({ top: top + scrollY - 80, behavior });
    }
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }, [game?.step]);

  useEffect(() => {
    const c = readChallenge(location.hash);
    if (c) queueMicrotask(() => setChallenge(c));
    prepare(false)
      .then(setGame)
      .catch(() => setFailed(true));
    // another tab answered: show its progress here too, so tabs never disagree (or let today be played twice)
    const sync = () => setGame((g) => (g ? catchUp(g) : g));
    // signed in: bring in this player's results from the leaderboard, so every device shows the same (first) score
    if (signInOn) syncAccount(setGame);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const start = (practice: boolean) => {
    // a new round starts at the top of the game, not down where the results' buttons were
    if (gameTop.current) {
      const y = gameTop.current.getBoundingClientRect().top + scrollY - ROUND_TOP;
      scrollTo({ top: Math.max(0, y), behavior: reducedMotion() ? "auto" : "smooth" });
    }
    advanced.current = true;
    restarted.current = true;
    setFailed(false);
    setGame(null);
    if (practice) track("daily_practice_start");
    prepare(practice)
      .then(setGame)
      .catch(() => setFailed(true));
  };

  if (failed) {
    return (
      <div role="alert" className="rounded-[22px] border-2 border-line bg-white p-6 text-center">
        <p className="font-semibold">We couldn&apos;t load the challenge.</p>
        <button type="button" onClick={() => start(false)} className="btn btn-primary mt-3 h-12">
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
    const last = next.length >= round.questions.length;
    const perfect = last && scoreOf(round, next) === round.questions.length;
    play(q.answer !== choice ? "wrong" : perfect ? "perfect" : "right");
    // a tick for every answer, a double buzz when wrong, and a party on a perfect round
    buzz(q.answer !== choice ? [30, 50, 30] : 12);
    if (perfect) {
      buzz([20, 40, 20, 40, 80]);
      setTimeout(confetti, 1050);
    }
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
    <div ref={gameTop} className="flex flex-col">
      {challenge && todayNo && !finished ? (
        <p className="mb-3 flex items-start gap-2 rounded-2xl border-2 border-gold bg-gold-soft p-3 text-sm font-semibold text-ink">
          <TargetIcon className="size-5" />
          {challenge.day === todayNo
            ? `${challenge.name} scored ${challenge.score}/5 on today's challenge. Can you beat it?`
            : `${challenge.name} sent you Daily #${challenge.day}, but this is today's. Play it and send your score back.`}
        </p>
      ) : null}
      {signInOn ? <OnSignIn run={() => syncAccount(setGame)} /> : null}
      {/* on phones above the game, where it still fits; on wider screens below it, so both tiles stay on a laptop's first screen */}
      {signInOn && !finished && round.date ? (
        <div className="md:order-last md:mt-4">
          <PlayedElsewhere />
        </div>
      ) : null}
      {!finished && round.date ? <StreakPill save={save} today={today} /> : null}
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
          perfect={choices.length === round.questions.length && scoreOf(round, choices) === round.questions.length}
          practice={!round.date}
          onPick={answer}
          onNext={() => {
            advanced.current = true;
            setGame({ ...game, step: step + 1 });
          }}
        />
      )}
    </div>
  );
}

// ---------- pieces ----------

/**
 * Signing in opens in a window over the page, so the page never reloads: when the player becomes signed in, fetch their
 * account's result for today straight away (no refresh needed), which jumps to their results if they already played.
 */
function OnSignIn({ run }: { run: () => void }) {
  const { isLoaded, isSignedIn } = useAccount();
  const was = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (!isLoaded) return;
    // runs whenever the player becomes signed in: after the sign-in window, or once Clerk confirms a returning player
    // (the page-load check can miss them while their sign-in is still being refreshed); taking the result twice is harmless
    if (isSignedIn && !was.current) run();
    was.current = !!isSignedIn;
  }, [isLoaded, isSignedIn, run]);
  return null;
}

/** Same height as the progress dots plus the first question card, so nothing below jumps when the game appears. */
function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading today's challenge">
      <div aria-hidden="true" className="mb-3 h-3 sm:mb-4" />
      <div className="min-h-[calc(50vw+208px)] rounded-[22px] border-2 border-line bg-white px-4 pb-5 pt-4 shadow-[0_8px_0_0_var(--color-line)] sm:min-h-[540px] sm:p-6 [@media(min-width:768px)_and_(max-height:820px)]:min-h-[476px]">
        <div className="h-5 w-1/2 animate-pulse rounded-full bg-beige" />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className={`${TILE} animate-pulse rounded-2xl bg-tile`} />
          <div className={`${TILE} animate-pulse rounded-2xl bg-tile`} />
        </div>
      </div>
    </div>
  );
}

function Progress({ round, choices, step }: { round: Round; choices: number[]; step: number }) {
  return (
    <ol className="mb-3 grid grid-cols-5 gap-1.5 sm:mb-4 sm:gap-2" aria-label="Progress">
      {round.questions.map((q, i) => {
        const done = i < choices.length;
        const right = done && choices[i] === q.answer;
        const current = !done && i === step;
        return (
          <li key={i}>
            <span
              aria-hidden="true"
              className={`block h-3 rounded-full ${done ? `pop-in ${right ? "bg-green" : "bg-red"}` : current ? "bg-primary" : "bg-beige"}`}
            />
            <span className="sr-only">
              Question {i + 1}: {done ? (right ? "correct" : "wrong") : current ? "current" : "not answered"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** "6-day streak" while playing: days in a row up to yesterday (today counts once it's finished). Hidden with no streak. */
function StreakPill({ save, today }: { save: DailySave; today: string }) {
  const { streak } = stats(save, today);
  if (!streak) return null;
  return (
    <p className="mb-2 flex justify-end">
      <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border-2 border-line bg-white px-3 text-sm font-bold text-ink shadow-[0_3px_0_0_var(--color-line)]">
        <FlameIcon className="size-5" />
        {R.streakPill(streak)}
      </span>
    </p>
  );
}

/** Sound effects on or off (on by default). */
function SoundToggle() {
  // on by default, so the first paint already says "Sound on" for almost everyone
  const [on, setOn] = useState(true);
  useEffect(() => queueMicrotask(() => setOn(soundOn())), []);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        setSound(!on);
        setOn(!on);
      }}
      className="inline-flex h-11 items-center gap-1.5 rounded-full border-2 border-line bg-white px-3 text-xs font-bold text-ink-soft hover:text-ink"
    >
      <SpeakerIcon on={on} /> Sound
    </button>
  );
}

function QuestionCard({
  n,
  total,
  q,
  shapes,
  picked,
  perfect,
  practice,
  onPick,
  onNext,
}: {
  n: number;
  total: number;
  q: Question;
  shapes: Record<string, ShapeFile>;
  picked: number | undefined;
  /** this was the last question and every answer was right */
  perfect: boolean;
  practice: boolean;
  onPick: (i: number) => void;
  onNext: () => void;
}) {
  const answered = picked !== undefined;
  const correct = picked === q.answer;
  const nextRef = useRef<HTMLButtonElement>(null);
  // one shared scale per view for both tiles, so the two drawings compare fairly
  const spanOf = (view: "merc" | "ea") => Math.max(...q.options.map((o) => size(shapes[o.id][view]))) * 1.12;
  const spans = { merc: spanOf("merc"), ea: spanOf("ea") };

  const lines = explain(q);

  useEffect(() => {
    if (!answered) return;
    // keyboard users land on "Next"; preventScroll keeps the page where it is (the reveal is the thing to watch)
    nextRef.current?.focus({ preventScroll: true });
    // once the shapes have settled, bring the explanation and "Next" into view on short screens
    const id = setTimeout(
      () => nextRef.current?.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" }),
      reducedMotion() ? 0 : 1400,
    );
    return () => clearTimeout(id);
  }, [answered]);

  return (
    <section
      aria-labelledby="daily-q"
      className="rounded-[22px] border-2 border-line bg-white px-4 pb-5 pt-4 shadow-[0_8px_0_0_var(--color-line)] sm:p-6"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
          {practice ? `${reveal.practice} · ` : ""}
          {reveal.round(n + 1, total)}
        </p>
        <SoundToggle />
      </div>
      <h2 id="daily-q" className="mt-1 text-center font-display text-[1.7rem] leading-[1.1] text-ink sm:text-4xl">
        {q.prompt}
      </h2>
      <p className="mt-1.5 text-center text-sm text-muted">{answered ? reveal.legend : reveal.ask}</p>

      <div className="relative mt-4 grid grid-cols-2 gap-3 sm:gap-5">
        {q.options.map((o, i) => {
          const isAnswer = i === q.answer;
          const look = !answered
            ? "hover:border-primary"
            : isAnswer
              ? "reveal-win border-green [--press-shadow:var(--color-green-shadow)]"
              : picked === i
                ? "reveal-shake border-red [--press-shadow:var(--color-red-shadow)]"
                : "opacity-70";
          const inflate = o.m / o.a;
          const x = (r: number) => (r >= 10 ? String(Math.round(r)) : r.toFixed(1));
          const mapNote = inflate >= 1.15 ? reveal.mapTooBig(x(inflate)) : inflate <= 0.87 ? reveal.mapTooSmall(x(1 / inflate)) : reveal.mapAboutRight;
          return (
            <button
              key={o.id}
              type="button"
              disabled={answered}
              onClick={() => onPick(i)}
              aria-label={answered ? undefined : `${o.n}, ${o.sub}`}
              className={`press-card relative flex min-w-0 flex-col rounded-[20px] p-2 text-left disabled:cursor-default sm:p-3 ${look}`}
            >
              {answered && (isAnswer || picked === i) ? (
                <span
                  className={`pop-in absolute -top-3.5 right-2 z-10 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white ${isAnswer ? "reveal-late bg-green-text" : "bg-red"}`}
                >
                  {isAnswer ? reveal.bigger : reveal.yourPick}
                </span>
              ) : null}
              <RevealTile map={shapes[o.id].merc} real={shapes[o.id].ea} spans={spans} revealed={answered} color={COLORS[i]} />
              <span className="mt-2 block text-base font-bold leading-tight text-ink [overflow-wrap:anywhere] sm:text-lg">{o.n}</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted">{o.sub}</span>
              {answered ? (
                <>
                  <TrueArea from={o.m} to={o.a} />
                  <span
                    className={`pop-in reveal-late mt-1.5 block w-fit rounded-full px-2.5 py-0.5 text-[11px] font-bold leading-tight text-ink ${inflate >= 1.15 ? "bg-gold-soft" : "bg-beige"}`}
                  >
                    {mapNote}
                  </span>
                </>
              ) : null}
            </button>
          );
        })}
        {/* the gold VS coin between the cards */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[38%] z-10 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-white bg-gold font-display text-sm text-ink shadow-[0_4px_0_0_var(--color-gold-shadow)]"
        >
          {reveal.vs}
        </span>
      </div>

      <WhoIsWho options={q.options} />

      {/* the verdict, read out by screen readers: soft green when you're right, soft red when the map fooled you */}
      <div aria-live="polite">
        {answered ? (
          <div
            className={`pop-in reveal-late mt-5 rounded-[22px] p-4 text-ink ring-1 sm:p-5 ${correct ? "bg-green-soft ring-green/40" : "bg-red-soft ring-red/40"}`}
          >
            <p className="flex items-center gap-2.5 font-display text-2xl leading-tight">
              <span
                aria-hidden="true"
                className={`grid size-8 shrink-0 place-items-center rounded-full text-base text-white ${correct ? "bg-green-text" : "bg-danger"}`}
              >
                <TickIcon right={correct} className="size-4" />
              </span>
              {perfect ? reveal.perfect : correct ? reveal.right : reveal.wrong}
            </p>
            <p className="mt-2 font-semibold leading-snug">{lines[0]}</p>
            {lines.slice(1).map((line) => (
              <p key={line} className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                {line}
              </p>
            ))}
          </div>
        ) : null}
      </div>
      {answered ? (
        <button ref={nextRef} type="button" onClick={onNext} className="btn btn-primary btn-lg mt-4 w-full">
          {n + 1 < total ? reveal.next : reveal.seeResults} <span aria-hidden="true">→</span>
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
    <div className="mt-4 space-y-2 rounded-2xl bg-paper p-3 text-sm ring-1 ring-line">
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

// framed and drawn on the main landmass, so far-off islands don't shrink a country to a speck
const size = (o: Outline) => {
  const [x0, y0, x1, y1] = mainBox(o);
  return Math.max(x1 - x0, y1 - y0);
};

/** One outline centred in a 100 × 100 tile, at the tile's shared scale. */
function Shape({ outline, span, color, ghost }: { outline: Outline; span: number; color: string; ghost?: boolean }) {
  const { d, b: [x0, y0, x1, y1] } = mainPart(outline);
  const k = 100 / span;
  const tiny = size(outline) < span * 0.06;
  return (
    <>
      <path
        d={d}
        transform={`translate(50 50) scale(${k}) translate(${-(x0 + x1) / 2} ${-(y0 + y1) / 2})`}
        fill={ghost ? "none" : color}
        fillOpacity={0.88}
        stroke={color}
        strokeWidth={ghost ? 1.5 : 1}
        strokeDasharray={ghost ? "4 3" : undefined}
        vectorEffect="non-scaling-stroke"
        fillRule="evenodd"
        strokeLinejoin="round"
      />
      {tiny && !ghost ? <circle cx={50} cy={50} r={8} fill="none" stroke={color} strokeWidth={1.2} /> : null}
    </>
  );
}

/**
 * The shrink reveal: before answering, the shape as a normal map draws it. On answering, it grows or shrinks to the size
 * it really is next to the other shape, then the true outline fades in, with a dashed trace of the map's version left behind
 * so the difference stays visible.
 */
function RevealTile({
  map,
  real,
  spans,
  revealed,
  color,
}: {
  map: Outline;
  real: Outline;
  spans: { merc: number; ea: number };
  revealed: boolean;
  color: string;
}) {
  const area = (o: Outline, span: number) => {
    const [x0, y0, x1, y1] = mainBox(o);
    return ((x1 - x0) * (y1 - y0)) / (span * span);
  };
  const grow = Math.sqrt(area(real, spans.ea) / Math.max(area(map, spans.merc), 1e-9)) || 1;
  return (
    <svg viewBox="0 0 100 100" className={`${TILE} w-full rounded-2xl bg-tile`} aria-hidden="true">
      <g className="reveal-map" style={{ transform: revealed ? `scale(${grow})` : "scale(1)", opacity: revealed ? 0 : 1 }}>
        <Shape outline={map} span={spans.merc} color={color} />
      </g>
      <g className="reveal-true" style={{ opacity: revealed ? 0.55 : 0 }}>
        <Shape outline={map} span={spans.merc} color={color} ghost />
      </g>
      <g className="reveal-true" style={{ opacity: revealed ? 1 : 0 }}>
        <Shape outline={real} span={spans.ea} color={color} />
      </g>
    </svg>
  );
}

/** The real area, counting down (or up) from the size the map makes it look, as the shapes change size. */
function TrueArea({ from, to }: { from: number; to: number }) {
  const [v, setV] = useState(from);
  useEffect(() => {
    if (reducedMotion()) {
      const id = requestAnimationFrame(() => setV(to));
      return () => cancelAnimationFrame(id);
    }
    const start = performance.now() + 150;
    let id = 0;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / 1000));
      const ease = 1 - Math.pow(1 - t, 3);
      setV(from + (to - from) * ease);
      if (t < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [from, to]);
  const [km, mi] = formatBoth(v).replace(")", "").split(" (");
  return (
    <span className="mt-1.5 block tabular-nums">
      <span className="block font-display text-base text-ink">{km}</span>
      <span className="block text-xs text-muted">{mi}</span>
    </span>
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
  const marks = round.questions.map((q, i) => choices[i] === q.answer);
  const grid = marks.map((m) => (m ? "🟩" : "🟥")).join("");
  const [copied, setCopied] = useState("");
  const shareBox = useShareBox();
  const verdict = R.verdict(score, total);
  // where today's score sits on today's public board (your own row if you're on it, otherwise where you'd land)
  const [rank, setRank] = useState<{ rank: number; of: number } | null>(null);
  useEffect(() => {
    if (!round.date) return;
    const id = playerId();
    fetch(`/api/leaderboard?scope=day&date=${round.date}&limit=100${id ? `&player=${id}` : ""}`)
      .then((r) => (r.ok ? (r.json() as Promise<DayBoard>) : null))
      .then((b) => {
        if (!b) return;
        const mine = b.rows.find((r) => r.me) ?? b.me;
        setRank(mine ? { rank: mine.rank, of: b.total } : { rank: 1 + b.rows.filter((r) => r.score > score).length, of: b.total + 1 });
      })
      .catch(() => {});
  }, [round.date, score]);

  const challengeFriend = () => {
    if (round.date) shareBox.share(challengeMessage(score, total, round.date), "results");
  };

  const shareImage = async () => {
    if (!round.date) return;
    track("daily_share_image", { score });
    const blob = await resultImage({ day: dayNumber(round.date), score, marks, title: R.title(score, total), verdict, streak: s.streak });
    if (!blob) return setCopied(R.pictureFailed);
    const file = new File([blob], `border-drift-daily-${dayNumber(round.date)}.png`, { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] }) && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ files: [file], text: `${location.origin}/daily` });
        return;
      }
    } catch {
      /* share sheet closed or failed: fall back to a download */
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setCopied(R.pictureSaved);
  };

  const share = () => {
    const url = `${location.origin}/daily`;
    shareBox.share({ kind: "score", url, text: `${site.name} Daily #${dayNumber(today)} · ${score}/${total}\n${grid}\n${url}` }, "results");
  };

  return (
    <section
      aria-labelledby="daily-done"
      className="rounded-[28px] border-2 border-line bg-white p-5 shadow-[0_8px_0_0_var(--color-line)] sm:p-7"
    >
      <div className="text-center">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">{round.date ? `Daily #${dayNumber(round.date)}` : R.practiceRound}</p>
        <p aria-hidden="true" className="pop-in mt-1 font-display text-[5.5rem] leading-none text-ink sm:text-8xl">
          {score}
          <span className="text-primary">/</span>
          {total}
        </p>
        <h2 id="daily-done" className="mt-2 font-display text-3xl leading-tight text-ink">
          <span className="sr-only">{R.scoreSr(score, total)} </span>
          {R.title(score, total)}
        </h2>
        <p className="mt-1 text-muted">{verdict}</p>
      </div>
      {challenge ? (
        <p className="mt-3 flex items-center justify-center gap-2 rounded-2xl border-2 border-gold bg-gold-soft px-3 py-2 text-center text-sm font-bold text-ink">
          {score > challenge.score ? <TrophyIcon className="size-5" /> : <TargetIcon className="size-5" />}
          {score > challenge.score
            ? `You beat ${challenge.name} (${challenge.score}/5)! Send them a rematch.`
            : score === challenge.score
              ? `Tied with ${challenge.name} at ${score}/5.`
              : `${challenge.name} wins this one with ${challenge.score}/5. Get them back tomorrow.`}
        </p>
      ) : null}
      {/* one pressed tile per question */}
      <ol className="mt-5 flex justify-center gap-2 sm:gap-3">
        {marks.map((right, i) => (
          <li
            key={i}
            className={`grid size-12 place-items-center rounded-2xl font-display text-xl sm:size-14 ${
              right ? "bg-green text-ink shadow-[0_5px_0_0_var(--color-green-shadow)]" : "bg-red text-white shadow-[0_5px_0_0_var(--color-red-shadow)]"
            }`}
          >
            <TickIcon right={right} className="size-6" />
            <span className="sr-only">
              Question {i + 1}: {right ? "correct" : "wrong"}
            </span>
          </li>
        ))}
      </ol>

      {round.date ? (
        <>
          {/* getting on the leaderboard is the first thing after the score */}
          <LeaderboardJoin date={round.date} choices={choices} />
          <dl className="mt-6 grid grid-cols-3 gap-2 text-center sm:gap-3">
            {[
              [R.streak, <span key="v" className="inline-flex items-center gap-1">{s.streak}<FlameIcon className="size-6" /></span>, R.best(s.best)],
              [R.rank, rank ? `#${rank.rank}` : "—", rank ? R.rankOf(rank.of) : R.rankNone],
              [R.allTime, `${Math.round((s.average / total) * 100)}%`, R.allTimeSub],
            ].map(([k, v, sub]) => (
              <div key={String(k)} className="flex flex-col rounded-[20px] border-2 border-line bg-paper px-2 py-3">
                <dt className="order-1 whitespace-nowrap text-[11px] font-bold uppercase tracking-normal text-muted">{k}</dt>
                <dd className="order-2 font-display text-[1.7rem] leading-tight text-ink">{v}</dd>
                <dd className="order-3 text-xs text-muted">{sub}</dd>
              </div>
            ))}
          </dl>
          {/* sharing: one compact row, so the leaderboard stays the main call to action */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            <button type="button" onClick={share} className="btn btn-primary h-12 px-2 text-sm sm:text-base">
              <span className="sm:hidden">{R.shareShort}</span>
              <span className="hidden sm:inline">{R.share}</span>
            </button>
            <button type="button" onClick={shareImage} className="btn btn-white h-12 px-2 text-sm sm:text-base">
              <span className="sm:hidden">{R.pictureShort}</span>
              <span className="hidden sm:inline">{R.picture}</span>
            </button>
            <button type="button" onClick={challengeFriend} aria-label={R.challenge} className="btn btn-red h-12 px-2 text-sm sm:text-base">
              <span className="sm:hidden">{R.challengeShort}</span>
              <span className="hidden sm:inline">{R.challenge}</span>
            </button>
          </div>
          <p aria-live="polite" className="mt-1 whitespace-pre-line text-center text-sm font-semibold text-green-text">
            {copied}
          </p>
          {shareBox.box}
        </>
      ) : (
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={onPractice} className="btn btn-primary btn-lg">
            {R.anotherPractice}
          </button>
          <button type="button" onClick={onToday} className="btn btn-white btn-lg">
            {R.backToToday}
          </button>
        </div>
      )}

      <h3 className="mt-7 font-display text-xl text-ink">{R.answers}</h3>
      <ol className="mt-2 divide-y divide-line">
        {round.questions.map((q, i) => {
          const big = q.options[q.answer];
          const small = q.options[1 - q.answer];
          const line = sizeParts(big, small);
          return (
            <li key={i} className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 py-2.5 text-sm sm:flex sm:flex-wrap">
              <MarkIcon right={choices[i] === q.answer} className="size-5 translate-y-1" />
              <span className="min-w-0 flex-1 text-ink">
                <strong>{line.big}</strong> <span className="text-muted">({big.sub})</span> {line.link} <strong>{line.small}</strong>{" "}
                <span className="text-muted">({small.sub})</span>
              </span>
              <Link href={mapHref(q)} aria-label={`Compare the sizes of ${nameInSentence(big)} and ${nameInSentence(small)} on the map`} className="col-start-2 font-semibold text-primary hover:underline">
                {R.dragOnMap} →
              </Link>
            </li>
          );
        })}
      </ol>

      {round.date ? (
        <div className="mt-4 border-t border-line pt-4">
          <button type="button" onClick={onPractice} className="btn btn-gold btn-lg w-full">
            {R.practice} <span aria-hidden="true">→</span>
          </button>
          <div className="mt-2 text-center">
            <Countdown />
          </div>
        </div>
      ) : null}
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
      <button type="button" onClick={() => location.reload()} className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline">
        A new challenge is ready. Load it →
      </button>
    );
  }
  const t = Math.floor(left / 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    <p className="text-sm text-muted">
      Next challenge in{" "}
      <span className="font-display tabular-nums font-semibold text-ink" suppressHydrationWarning>
        {p(Math.floor(t / 3600))}:{p(Math.floor((t % 3600) / 60))}:{p(t % 60)}
      </span>
    </p>
  );
}
