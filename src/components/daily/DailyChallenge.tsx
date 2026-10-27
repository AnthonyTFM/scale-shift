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
  writeSave,
  type DailySave,
  type Question,
} from "@/lib/daily";
import { LeaderboardJoin } from "./LeaderboardJoin";
import { POSTED_EVENT, type Posted } from "./useJoin";
import { loadPool, loadShapes, mapHref, QuestionCard, reducedMotion, ROUND_TOP, Skeleton } from "./Matchup";
import { readChallenge, type Challenge } from "@/lib/challenge";
import { playerId, rememberPlayer } from "@/lib/player";
import { signInOn } from "@/lib/sign-in";
import { PlayedElsewhere } from "./PlayedElsewhere";
import { play } from "@/lib/sound";
import { buzz, confetti } from "@/lib/celebrate";
import type { ShapeFile } from "@/lib/outline";
import { resultImage } from "@/lib/result-image";
import { challengeMessage } from "@/lib/challenge-friend";
import { useShareBox } from "@/components/site/ShareBox";
import type { DayBoard } from "@/lib/leaderboard-types";
import { dailyCopy } from "@/content/daily";
import { FlameIcon, MarkIcon, TargetIcon, TickIcon, TrophyIcon } from "@/components/site/Icons";
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

// results: "If you join #2 of 3" means little until this many have joined today, and "Better than N%" needs this many plays
const BOARD_MIN = 20;
const CROWD_MIN = 30;
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
      {signInOn ? <OnSignIn run={() => syncAccount(setGame)} /> : null}
      {/* on phones above the game, where it still fits; on wider screens below it, so both tiles stay on a laptop's first screen */}
      {signInOn && !finished ? (
        <div className="md:order-last md:mt-4">
          <PlayedElsewhere />
        </div>
      ) : null}
      {!finished ? <StreakPill save={save} today={today} /> : null}
      <Progress round={round} choices={choices} step={step} />
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
  // where today's score sits on today's public board: your own row if you're on it, otherwise where you'd land if you
  // joined (and says so, so nobody thinks they're already ranked)
  const [rank, setRank] = useState<{ rank: number; of: number; joined: boolean } | null>(null);
  // the middle card waits for the board, so it doesn't switch from one stat to another as answers arrive
  const [boardChecked, setBoardChecked] = useState(false);
  useEffect(() => {
    const id = playerId();
    // once the score is posted, a slower board fetch must not put "If you join" back
    let joinedNow = false;
    fetch(`/api/leaderboard?scope=day&date=${round.date}&limit=100${id ? `&player=${id}` : ""}`)
      .then((r) => (r.ok ? (r.json() as Promise<DayBoard>) : null))
      .then((b) => {
        if (!b || joinedNow) return;
        const mine = b.rows.find((r) => r.me) ?? b.me;
        setRank(
          mine
            ? { rank: mine.rank, of: b.total, joined: true }
            : { rank: 1 + b.rows.filter((r) => r.score > score).length, of: b.total + 1, joined: false },
        );
      })
      .catch(() => {})
      .finally(() => setBoardChecked(true));
    const posted = (e: Event) => {
      const d = (e as CustomEvent<Posted>).detail;
      if (d.date !== round.date) return;
      joinedNow = true;
      setRank({ rank: d.rank, of: d.total, joined: true });
    };
    window.addEventListener(POSTED_EVENT, posted);
    return () => window.removeEventListener(POSTED_EVENT, posted);
  }, [round.date, score]);

  // everyone's scores today (anonymous counts), for "Better than 62% of players today"
  const [crowd, setCrowd] = useState<{ n: number; scores: number[] } | null>(null);
  useEffect(() => {
    fetch(`/api/plays?date=${round.date}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ n: number; scores: number[] }>) : null))
      .then((c) => c && setCrowd(c))
      .catch(() => {});
  }, [round.date]);

  // the middle card: your place on the board if you've joined, or where you'd land if enough have joined to mean
  // something; otherwise how you did against everyone who played today, or failing that how many days you've played
  const middle = (() => {
    if (rank?.joined) return [R.rank, `#${rank.rank}`, R.rankOf(rank.of)] as const;
    if (!boardChecked) return [R.played, "—", "\u00a0"] as const;
    if (rank && rank.of >= BOARD_MIN) return [R.rankIfJoined, `#${rank.rank}`, R.rankOf(rank.of)] as const;
    if (crowd && crowd.n >= CROWD_MIN) {
      const counts = [0, 1, 2, 3, 4, 5].map((k) => crowd.scores[k] ?? 0);
      // the counts can be up to a minute old: if nobody shares your score yet, your own play isn't in them, so add it
      if (!counts[score]) counts[score] = 1;
      const n = counts.reduce((a, b) => a + b, 0);
      // only good news: "Better than 8%" after a rough day would sting, and "Top 70%" isn't a boast, so those show
      // days played instead
      if (score === total) {
        const top = Math.ceil((100 * counts[total]) / n);
        if (top <= TOP_MAX) return [R.topToday, `${top}%`, R.betterSub] as const;
      } else {
        const pct = Math.floor((100 * counts.slice(0, score).reduce((a, b) => a + b, 0)) / n);
        if (pct >= BETTER_MIN) return [R.betterThan, `${pct}%`, R.betterSub] as const;
      }
    }
    return [R.played, String(s.played), R.playedSub(s.played)] as const;
  })();

  // how many days you've scored 0, 1 … 5
  const spread = [0, 1, 2, 3, 4, 5].map((n) => Object.values(save.days).filter((d) => d.s === n).length);
  const most = Math.max(1, ...spread);

  const challengeFriend = () => {
    shareBox.share(challengeMessage(score, total, round.date), "results");
  };

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

  const share = () => {
    const url = `${location.origin}/daily`;
    const text = `${R.shareHead(site.name, dayNumber(today), score, total, s.streak)}\n${grid}\n${R.shareDare(total - score)}\n${url}`;
    shareBox.share({ kind: "score", url, text }, "results");
  };

  return (
    <section
      aria-labelledby="daily-done"
      className="rounded-[28px] border-2 border-line bg-white p-5 shadow-[0_8px_0_0_var(--color-line)] sm:p-7"
    >
      <div className="text-center">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">Daily #{dayNumber(round.date)}</p>
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
            <span className="sr-only">{R.markSr(i + 1, right)}</span>
          </li>
        ))}
      </ol>
      {/* the next thing to play, right under the score: endless mode, while the next daily is on its way */}
      <Link href="/endless" onClick={() => track("daily_endless_start")} className="btn btn-gold btn-lg mt-6 w-full">
        {R.endless} <span aria-hidden="true">→</span>
      </Link>
      <p className="mt-1.5 text-center text-sm text-muted">{R.endlessLine}</p>

      {/* getting on the leaderboard comes next, after the endless button */}
      <LeaderboardJoin date={round.date} choices={choices} score={score} />
      <dl className="mt-6 grid grid-cols-3 gap-2 text-center sm:gap-3">
        {[
          [R.streak, <span key="v" className="inline-flex items-center gap-1">{s.streak}<FlameIcon className="size-6" /></span>, R.best(s.best)],
          middle,
          [R.allTime, `${Math.round((s.average / total) * 100)}%`, R.allTimeSub],
        ].map(([k, v, sub]) => (
          <div key={String(k)} className="flex flex-col rounded-[20px] border-2 border-line bg-paper px-2 py-3">
            <dt className="order-1 whitespace-nowrap text-[11px] font-bold uppercase tracking-normal text-muted">{k}</dt>
            <dd className="order-2 font-display text-[1.7rem] leading-tight text-ink">{v}</dd>
            <dd className="order-3 text-xs text-muted">{sub}</dd>
          </div>
        ))}
      </dl>
      {/* sharing: one compact row, so the leaderboard stays the main call to action; one solid button, two quiet ones */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        <button type="button" onClick={share} className="btn btn-primary h-12 px-2 text-sm sm:text-base">
          <span className="sm:hidden">{R.shareShort}</span>
          <span className="hidden sm:inline">{R.share}</span>
        </button>
        <button type="button" onClick={shareImage} className="btn btn-white h-12 px-2 text-sm sm:text-base">
          <span className="sm:hidden">{R.pictureShort}</span>
          <span className="hidden sm:inline">{R.picture}</span>
        </button>
        <button type="button" onClick={challengeFriend} aria-label={R.challenge} className="btn btn-white h-12 px-2 text-sm sm:text-base">
          <span className="sm:hidden">{R.challengeShort}</span>
          <span className="hidden sm:inline">{R.challenge}</span>
        </button>
      </div>
      <p aria-live="polite" className="mt-1 whitespace-pre-line text-center text-sm font-semibold text-green-text">
        {copied}
      </p>
      {shareBox.box}
      {/* your own scores so far, from 5 down to 0, today's bar in blue (from the second day: one bar says nothing) */}
      {s.played >= 2 ? (
        <div className="mt-5">
          <h3 className="font-display text-lg text-ink">{R.scoresTitle}</h3>
          <p className="text-sm text-muted">{R.scoresSub(s.average.toFixed(1))}</p>
          <ol className="mt-2 space-y-1">
            {spread
              .map((days, n) => (
                <li key={n} className="flex items-center gap-2 text-sm">
                  <span className="w-3 text-right font-bold text-ink" aria-hidden="true">
                    {n}
                  </span>
                  <span className="sr-only">{R.scoreRow(n, days, n === score)}</span>
                  <span aria-hidden="true" className="flex-1">
                    <span
                      className={`flex h-6 items-center rounded-md px-2 text-xs font-bold ${
                        !days ? "text-muted" : `min-w-7 justify-end ${n === score ? "bg-primary text-white" : "bg-line text-ink"}`
                      }`}
                      style={days ? { width: `${(days / most) * 100}%` } : undefined}
                    >
                      {days}
                    </span>
                  </span>
                </li>
              ))
              .reverse()}
          </ol>
        </div>
      ) : null}

      <h3 className="mt-7 font-display text-xl text-ink">{R.answers}</h3>
      <ol className="mt-2 divide-y divide-line">
        {round.questions.map((q, i) => {
          const big = q.options[q.answer];
          const small = q.options[1 - q.answer];
          const line = sizeParts(big, small);
          const href = mapHref(q);
          return (
            <li key={i} className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 py-2.5 text-sm sm:flex sm:flex-wrap">
              <MarkIcon right={choices[i] === q.answer} className="size-5 translate-y-1" />
              <span className="min-w-0 flex-1 text-ink">
                <strong>{line.big}</strong> <span className="text-muted">({big.sub})</span> {line.link} <strong>{line.small}</strong>{" "}
                <span className="text-muted">({small.sub})</span>
              </span>
              {/* not for a region yet: the map can't draw those */}
              {href ? (
                <Link href={href} aria-label={`Compare the sizes of ${nameInSentence(big)} and ${nameInSentence(small)} on the map`} className="col-start-2 font-semibold text-primary hover:underline">
                  {R.dragOnMap} →
                </Link>
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* when the next daily arrives */}
      <div className="mt-4 border-t border-line pt-4 text-center">
        <Countdown />
      </div>
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
        {dailyCopy.nextReady} <span aria-hidden="true">→</span>
      </button>
    );
  }
  const t = Math.floor(left / 1000);
  return (
    <p className="text-sm text-muted">
      {dailyCopy.nextIn}{" "}
      <span className="font-display tabular-nums font-semibold text-ink" suppressHydrationWarning>
        {dailyCopy.nextTime(Math.floor(t / 3600), Math.floor((t % 3600) / 60))}
      </span>
    </p>
  );
}
