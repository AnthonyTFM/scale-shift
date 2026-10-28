"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { site } from "@/content/site";
import { track } from "@/lib/analytics";
import { reportPlay, retryPendingPlay } from "@/lib/report-play";
import {
  buildQuestions,
  dayNumber,
  mergeDays,
  nameInSentence,
  sizeParts,
  loadSave,
  localDateKey,
  stats,
  STREAK_MILESTONES,
  writeSave,
  type DailySave,
  type Question,
} from "@/lib/daily";
import { SaveStreak } from "./SaveStreak";
import { loadPool, loadShapes, mapHref, QuestionCard, reducedMotion, ROUND_TOP, Skeleton } from "./Matchup";
import { readChallenge, type Challenge } from "@/lib/challenge";
import { rememberPlayer } from "@/lib/player";
import { signInOn } from "@/lib/sign-in";
import { PlayedElsewhere } from "./PlayedElsewhere";
import { play } from "@/lib/sound";
import { buzz, confetti } from "@/lib/celebrate";
import type { ShapeFile } from "@/lib/outline";
import { resultImage } from "@/lib/result-image";
import { challengeMessage } from "@/lib/challenge-friend";
import { useShareBox } from "@/components/site/ShareBox";
import { dailyCopy } from "@/content/daily";
import { ClockIcon, FlameIcon, MapIcon, MarkIcon, TargetIcon, TickIcon, TrophyIcon } from "@/components/site/Icons";
import { SkyHeader } from "@/components/site/SkyHeader";
import { PlayingMark } from "@/components/site/UpdateCheck";
import { useAccount } from "./SignInProvider";

const reveal = dailyCopy.reveal;
const R = dailyCopy.results;

type Round = {
  /** the puzzle's date key */
  date: string;
  questions: Question[];
  shapes: Record<string, ShapeFile>;
};

async function loadRound(date: string): Promise<Round> {
  const questions = buildQuestions(await loadPool(), date);
  return { date, questions, shapes: await loadShapes(questions) };
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

/** Load today's round and any saved progress for it. */
async function prepare(): Promise<Game> {
  const today = localDateKey();
  const round = await loadRound(today);
  const save = loadSave();
  const choices = save.days[today]?.c ?? [];
  return { round, today, save, choices, step: Math.min(choices.length, round.questions.length) };
}

/** Show the leaderboard's result for this round in place of whatever this browser had (they're the first try). */
function official(g: Game, save: DailySave): Game {
  const rec = save.days[g.round.date];
  if (!rec || typeof rec.s !== "number") return { ...g, save };
  return { ...g, save, choices: rec.c, step: g.round.questions.length };
}

/**
 * Today's progress lives in this browser's storage, shared by all its tabs. If another tab has answered more of today's
 * questions, take its answers (the first answer to each question counts, as on the leaderboard).
 */
function catchUp(g: Game): Game {
  const save = loadSave();
  const saved = save.days[g.round.date]?.c ?? [];
  if (saved.length <= g.choices.length) return g;
  return { ...g, save, choices: saved, step: Math.min(saved.length, g.round.questions.length) };
}

// results: "Better than N%" needs this many plays today, and the chart of how everyone scored this many
const CROWD_MIN = 30;
const SPREAD_MIN = 10;
const BETTER_MIN = 30;
const TOP_MAX = 50;

export function DailyChallenge() {
  const [game, setGame] = useState<Game | null>(null);
  const [failed, setFailed] = useState(false);
  // someone sent a "can you beat me?" link
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  // set when the player moves on, so the next question (or the results) takes focus; not on first load
  const advanced = useRef(false);

  useEffect(() => {
    if (!advanced.current) return;
    // "Next" has gone, so focus would fall back to the page: move it to the new heading instead, which screen readers
    // announce and from which Tab reaches the answers; and bring the card back into view if it scrolled off the top
    const heading = document.getElementById("daily-q") ?? document.getElementById("daily-done");
    const card = heading?.closest("section");
    // a new round is still loading: keep waiting for its first question
    if (!heading || !card) return;
    advanced.current = false;
    // line up the progress bar above the card (not the card itself) just under the header, so it stays in view (near the
    // top of the screen on phones held sideways, where the header doesn't stick)
    const top = (document.getElementById("daily-progress") ?? card).getBoundingClientRect().top;
    const at = innerHeight <= 500 ? 8 : ROUND_TOP;
    if (top < at - 16) scrollTo({ top: top + scrollY - at, behavior: reducedMotion() ? "auto" : "smooth" });
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }, [game?.step]);

  // a play count that failed to send last time
  useEffect(retryPendingPlay, []);

  useEffect(() => {
    const c = readChallenge(location.hash);
    if (c) queueMicrotask(() => setChallenge(c));
    prepare()
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

  const retry = () => {
    setFailed(false);
    prepare()
      .then(setGame)
      .catch(() => setFailed(true));
  };

  if (failed) {
    return (
      <div role="alert" className="rounded-[22px] border-2 border-line bg-white p-6 text-center">
        <p className="font-semibold">We couldn&apos;t load the challenge.</p>
        <button type="button" onClick={retry} className="btn btn-primary mt-3 h-12">
          Try again
        </button>
      </div>
    );
  }
  if (!game) return <Skeleton label="Loading today's five" />;
  const { round, today, save, choices, step } = game;

  const answer = (choice: number) => {
    if (choices.length > step) return;
    // this question was already answered in another tab: that answer stands
    const caught = catchUp(game);
    if (caught !== game) return setGame(caught);
    const next = [...choices, choice];
    const q = round.questions[step];
    track("daily_answer", { n: step + 1, correct: q.answer === choice });
    const last = next.length >= round.questions.length;
    const perfect = last && scoreOf(round, next) === round.questions.length;
    play(q.answer !== choice ? "wrong" : perfect ? "perfect" : "right");
    // a tick for every answer, a double buzz when wrong, and a party on a perfect round
    buzz(q.answer !== choice ? [30, 50, 30] : 12);
    if (perfect) {
      buzz([20, 40, 20, 40, 80]);
      setTimeout(confetti, 1050);
    }
    const fresh = loadSave(); // keep anything other tabs saved
    const updated: DailySave = { ...fresh, days: { ...fresh.days, [round.date]: { c: next, ...(last ? { s: scoreOf(round, next) } : {}) } } };
    writeSave(updated);
    // a streak milestone reached today gets its own party (a perfect round already has one)
    if (last && !perfect && STREAK_MILESTONES.includes(stats(updated, round.date).streak)) {
      buzz([20, 40, 20, 40, 80]);
      setTimeout(confetti, 1050);
    }
    if (last) {
      track("daily_complete", { score: scoreOf(round, next), day: dayNumber(round.date) });
      reportPlay(updated, round.date, scoreOf(round, next));
    }
    setGame({ ...game, choices: next, save: updated });
  };

  const finished = step >= round.questions.length;
  const todayNo = dayNumber(round.date);
  return (
    <div className="flex flex-col">
      {challenge && !finished ? (
        <p className="mb-3 flex items-start gap-2 rounded-2xl border-2 border-gold bg-gold-soft p-3 text-sm font-semibold text-ink">
          <TargetIcon className="size-5" />
          {challenge.day === todayNo
            ? dailyCopy.challengeToday(challenge.name, challenge.score)
            : dailyCopy.challengeOld(challenge.name, challenge.day)}
        </p>
      ) : null}
      <DoneMark finished={finished} />
      {/* answered at least one, not finished: no update reload mid-round */}
      <PlayingMark on={!finished && choices.length > 0} />
      {signInOn ? <OnSignIn run={() => syncAccount(setGame)} /> : null}
      {/* on phones above the game, where it still fits; on wider screens below it, so both tiles stay on a laptop's first screen */}
      {signInOn && !finished ? (
        <div className="md:order-last md:mt-4">
          <PlayedElsewhere />
        </div>
      ) : null}
      {!finished ? <StreakPill save={save} today={today} /> : null}
      {!finished ? <Progress round={round} choices={choices} step={step} /> : null}
      {finished ? (
        <Results
          round={round}
          choices={choices}
          save={save}
          today={today}
          challenge={challenge && challenge.day === todayNo ? challenge : null}
        />
      ) : (
        <QuestionCard
          key={`${round.date}-${step}`}
          eyebrow={reveal.round(step + 1, round.questions.length)}
          q={round.questions[step]}
          shapes={round.shapes}
          picked={choices[step]}
          verdict={(correct) =>
            choices.length === round.questions.length && scoreOf(round, choices) === round.questions.length ? reveal.perfect : correct ? reveal.right : reveal.wrong
          }
          nextLabel={step + 1 < round.questions.length ? reveal.next : reveal.seeResults}
          // never measure against a shape still to come today: it would give that question away
          exclude={round.questions.flatMap((x) => x.options.map((o) => o.id))}
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
 * The root layout's script marks a finished day before paint (the intro goes, see .daily-done); this keeps that mark in
 * step with the game shown: a new day after midnight, or /daily reached by a link without a full page load.
 */
function DoneMark({ finished }: { finished: boolean }) {
  useEffect(() => {
    document.documentElement.classList.toggle("daily-done", finished);
  }, [finished]);
  return null;
}

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

function Progress({ round, choices, step }: { round: Round; choices: number[]; step: number }) {
  return (
    <ol id="daily-progress" className="mb-3 grid grid-cols-5 gap-1.5 sm:mb-4 sm:gap-2" aria-label="Your answers so far">
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
              Round {i + 1}: {done ? (right ? "right" : "wrong") : current ? "now" : "not yet"}
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

function Results({
  round,
  choices,
  save,
  today,
  challenge,
}: {
  round: Round;
  choices: number[];
  save: DailySave;
  today: string;
  challenge: Challenge | null;
}) {
  const score = scoreOf(round, choices);
  const total = round.questions.length;
  const s = stats(save, today);
  const marks = round.questions.map((q, i) => choices[i] === q.answer);
  const grid = marks.map((m) => (m ? "🟩" : "🟥")).join("");
  const [copied, setCopied] = useState("");
  const shareBox = useShareBox();
  const verdict = R.verdict(score, total);
  // everyone's scores today (anonymous counts), for "Better than 62% of players today"
  const [crowd, setCrowd] = useState<{ n: number; scores: number[] } | null>(null);
  // the chart waits for the counts, so it doesn't open on "You" and then jump to "Everyone today"
  const [crowdChecked, setCrowdChecked] = useState(false);
  useEffect(() => {
    fetch(`/api/plays?date=${round.date}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ n: number; scores: number[] }>) : null))
      .then((c) => c && setCrowd(c))
      .catch(() => {})
      .finally(() => setCrowdChecked(true));
  }, [round.date]);

  // today's anonymous counts by score; they can be up to a minute old: if nobody shares your score yet, your own play
  // isn't in them, so add it
  const counts = crowd ? [0, 1, 2, 3, 4, 5].map((k) => crowd.scores[k] ?? 0) : null;
  if (counts && !counts[score]) counts[score] = 1;
  const crowdN = counts ? counts.reduce((a, b) => a + b, 0) : 0;
  // how you did against everyone, for the chart's subtitle: only good news ("Better than 8%" after a rough day would
  // sting, and "Top 70%" isn't a boast)
  const standing = (() => {
    if (!counts || !crowd || crowd.n < CROWD_MIN) return null;
    if (score === total) {
      const top = Math.ceil((100 * counts[total]) / crowdN);
      return top <= TOP_MAX ? R.standingTop(top) : null;
    }
    const pct = Math.floor((100 * counts.slice(0, score).reduce((a, b) => a + b, 0)) / crowdN);
    return pct >= BETTER_MIN ? R.standingBetter(pct) : null;
  })();
  const showCrowd = !!counts && crowdN >= SPREAD_MIN;
  const showMine = s.played >= 2;
  // the one chart: everyone today when enough played, else your own days; a toggle when both are there
  const [chart, setChart] = useState<"crowd" | "mine" | null>(null);
  const shown = !crowdChecked
    ? null
    : chart === "crowd" && showCrowd
      ? "crowd"
      : chart === "mine" && showMine
        ? "mine"
        : showCrowd
          ? "crowd"
          : showMine
            ? "mine"
            : null;

  // how many days you've scored 0, 1 … 5
  const spread = [0, 1, 2, 3, 4, 5].map((n) => Object.values(save.days).filter((d) => d.s === n).length);

  const shareImage = async () => {
    track("daily_share_image", { score });
    const blob = await resultImage({ day: dayNumber(round.date), score, marks, title: R.title(score, total), verdict, streak: s.streak });
    if (!blob) return setCopied(R.pictureFailed);
    const file = new File([blob], `border-drift-daily-${dayNumber(round.date)}.png`, { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] }) && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ files: [file], text: `${R.shareDare(total - score)}\n${location.origin}/daily` });
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

  // one Share for both: the link carries your score, so a friend who opens it sees the score to beat
  const share = () => {
    const { url } = challengeMessage(score, total, round.date);
    const text = `${R.shareHead(site.name, dayNumber(today), score, total, s.streak)}\n${grid}\n${R.shareDare(total - score)}\n${url}`;
    shareBox.share({ kind: "score", url, text }, "results");
  };

  // one bar chart, used for both views: rows from 5 down to 0, your score's row in blue
  const bars = (values: number[], label: (n: number, v: number) => string, sr: (n: number, v: number) => string, you: boolean) => {
    const top = Math.max(1, ...values);
    return (
      <ol className="mt-2 space-y-1">
        {values
          .map((v, n) => (
            <li key={n} className="flex items-center gap-2 text-sm">
              <span className="w-3 text-right font-bold text-ink" aria-hidden="true">
                {n}
              </span>
              <span className="sr-only">{sr(n, v)}</span>
              {/* every row has the same track and the same label slot, so the bars compare fairly */}
              <span aria-hidden="true" className="flex-1">
                <span
                  className={`flex h-6 items-center rounded-md px-2 text-xs font-bold ${
                    !v ? "text-muted" : `min-w-10 justify-end ${n === score ? "bg-primary text-white" : "bg-line text-ink"}`
                  }`}
                  style={v ? { width: `${(v / top) * 100}%` } : undefined}
                >
                  {label(n, v)}
                </span>
              </span>
              <span aria-hidden="true" className="w-8 shrink-0 text-xs font-bold text-primary">
                {you && n === score ? R.crowdYou : null}
              </span>
            </li>
          ))
          .reverse()}
      </ol>
    );
  };
  const pctOf = (c: number) => {
    const exact = (100 * c) / Math.max(1, crowdN);
    // a handful of plays among hundreds still shows: "<1%", not "0%"
    return c && exact < 0.5 ? "<1" : String(Math.round(exact));
  };

  return (
    <section
      aria-labelledby="daily-done"
      className="rounded-[28px] border-2 border-line bg-white p-5 shadow-[0_8px_0_0_var(--color-line)] sm:p-7"
    >
      <SkyHeader>
        {/* the day and when the next five arrive, in one line */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-white/90">Daily #{dayNumber(round.date)}</p>
          <Countdown date={round.date} />
        </div>
        {/* the score beside its title */}
        <div className="mt-2 flex items-center justify-center gap-4">
          <p aria-hidden="true" className="pop-in font-display text-6xl leading-none sm:text-7xl">
            {score}
            <span className="text-gold">/</span>
            {total}
          </p>
          <div className="min-w-0">
            <h2 id="daily-done" className="font-display text-2xl leading-tight sm:text-3xl">
              <span className="sr-only">{R.scoreSr(score, total)} </span>
              {R.title(score, total)}
            </h2>
            <p className="text-sm leading-snug">{verdict}</p>
          </div>
        </div>
      </SkyHeader>
      {/* one tile per question, sitting on the horizon */}
      <ol className="relative -mt-7 flex justify-center gap-2 sm:gap-3">
        {marks.map((right, i) => (
          <li
            key={i}
            className={`grid size-10 place-items-center rounded-xl sm:size-12 ${
              right ? "bg-green text-ink shadow-[0_4px_0_0_var(--color-green-shadow)]" : "bg-red text-white shadow-[0_4px_0_0_var(--color-red-shadow)]"
            }`}
          >
            <TickIcon right={right} className="size-5" />
            <span className="sr-only">{R.markSr(i + 1, right)}</span>
          </li>
        ))}
      </ol>
      {STREAK_MILESTONES.includes(s.streak) && save.days[today]?.s !== undefined ? (
        <p className="pop-in mt-4 flex items-center justify-center gap-2 rounded-2xl border-2 border-gold bg-gold-soft px-3 py-2 text-center font-display text-lg text-ink">
          <FlameIcon className="size-6" /> {R.milestone(s.streak)}
        </p>
      ) : null}
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
      {/* the two things to do next: share (the main one: it's how friends find the game) and endless mode */}
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={share} className="btn btn-primary h-12 min-w-0 flex-1 px-2">
          {R.share}
        </button>
        <Link href="/endless" onClick={() => track("daily_endless_start")} className="btn btn-gold h-12 shrink-0 px-4">
          {R.endlessShort}
          <span className="sr-only"> {R.endlessSr}</span> <span aria-hidden="true">→</span>
        </Link>
      </div>
      {/* sharing as a picture, quietly */}
      <p className="mt-2 flex justify-center text-sm">
        <button type="button" onClick={shareImage} className="min-h-11 font-semibold text-primary hover:underline">
          {R.picture}
        </button>
      </p>
      <p aria-live="polite" className="whitespace-pre-line text-center text-sm font-semibold text-green-text">
        {copied}
      </p>
      {shareBox.box}

      <SaveStreak date={round.date} choices={choices} />

      {/* your numbers in one strip */}
      <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
        {[
          [R.streak, <span key="v" className="inline-flex items-center gap-1">{s.streak}<FlameIcon className="size-5" /></span>, R.best(s.best)],
          [R.played, String(s.played), R.playedSub(s.played)],
          [R.allTime, `${Math.round((s.average / total) * 100)}%`, R.allTimeSub],
        ].map(([k, v, sub]) => (
          <div key={String(k)} className="flex flex-col rounded-2xl bg-paper px-2 py-2 ring-1 ring-line">
            <dt className="order-1 whitespace-nowrap text-[11px] font-bold uppercase tracking-normal text-muted">{k}</dt>
            <dd className="order-2 font-display text-xl leading-tight text-ink">{v}</dd>
            <dd className="order-3 text-xs text-muted">{sub}</dd>
          </div>
        ))}
      </dl>

      {/* one chart: everyone today, or your own days; a toggle when both are there */}
      {shown ? (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-lg text-ink">{shown === "crowd" ? R.crowdTitle : R.scoresTitle}</h3>
            {showCrowd && showMine ? (
              <div role="group" aria-label={R.chartToggle} className="inline-flex rounded-xl border-2 border-line bg-white p-0.5 text-xs font-bold">
                {(["crowd", "mine"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={shown === k}
                    onClick={() => setChart(k)}
                    className="min-h-11 rounded-lg px-3 aria-pressed:bg-primary aria-pressed:text-white"
                  >
                    {k === "crowd" ? R.chartEveryone : R.chartYou}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <p className="text-sm text-muted">
            {shown === "crowd" ? R.crowdSub(crowdN) : R.scoresSub(s.average.toFixed(1))}
            {shown === "crowd" && standing ? <strong className="font-semibold text-ink"> · {standing}</strong> : null}
          </p>
          {shown === "crowd" && counts
            ? bars(counts, (_, c) => `${pctOf(c)}%`, (n, c) => R.crowdRow(n, pctOf(c), n === score), true)
            : bars(spread, (_, d) => String(d), (n, d) => R.scoreRow(n, d, n === score), false)}
        </div>
      ) : null}

      {/* the answers, one tap away */}
      <details className="group mt-5 rounded-2xl border-2 border-line">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-display text-lg text-ink [&::-webkit-details-marker]:hidden">
          {R.answersToggle(total)}
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 text-primary transition group-open:rotate-90">
            <path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <ol className="divide-y divide-line border-t border-line px-4">
          {round.questions.map((q, i) => {
            const big = q.options[q.answer];
            const small = q.options[1 - q.answer];
            const line = sizeParts(big, small);
            const href = mapHref(q);
            return (
              <li key={i} className="flex items-start gap-3 py-2.5 text-sm">
                <MarkIcon right={choices[i] === q.answer} className="mt-0.5 size-5" />
                <span className="min-w-0 flex-1 text-ink">
                  <strong>{line.big}</strong> <span className="text-muted">({big.sub})</span> {line.link} <strong>{line.small}</strong>{" "}
                  <span className="text-muted">({small.sub})</span>
                </span>
                {/* not for a region yet: the map can't draw those */}
                {href ? (
                  <Link
                    href={href}
                    aria-label={`Compare the sizes of ${nameInSentence(big)} and ${nameInSentence(small)} on the map`}
                    title={R.dragOnMap}
                    className="-my-2 grid size-11 shrink-0 place-items-center rounded-lg text-primary hover:bg-primary-soft"
                  >
                    <MapIcon className="size-6" />
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ol>
      </details>
    </section>
  );
}

/**
 * Time left on this round's day (`date`, the player's local day): counted to the midnight that ends that day, not to the
 * next midnight from now, so a tab left open past midnight says the new five are ready instead of counting a fresh day.
 */
function Countdown({ date }: { date: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const [y, m, d] = date.split("-").map(Number);
    const end = new Date(y, m - 1, d + 1).getTime();
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    const id = setInterval(tick, 1000);
    queueMicrotask(tick);
    return () => clearInterval(id);
  }, [date]);
  if (left === null) return null;
  if (left === 0) {
    return (
      <button type="button" onClick={() => location.reload()} className="inline-flex min-h-11 items-center text-xs font-semibold text-white hover:underline">
        {dailyCopy.nextReadyShort} <span aria-hidden="true">→</span>
      </button>
    );
  }
  const t = Math.floor(left / 1000);
  return (
    <p className="inline-flex items-center gap-1 text-xs font-semibold text-white/85">
      <ClockIcon className="size-3.5" />
      {dailyCopy.nextIn}{" "}
      <span className="tabular-nums text-white" suppressHydrationWarning>
        {dailyCopy.nextTime(Math.floor(t / 3600), Math.floor((t % 3600) / 60))}
      </span>
    </p>
  );
}
