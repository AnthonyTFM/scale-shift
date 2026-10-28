"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { site } from "@/content/site";
import { endlessCopy as t } from "@/content/endless";
import { track } from "@/lib/analytics";
import { loadPlayer } from "@/lib/player";
import type { EndlessPlace } from "@/lib/leaderboard-types";
import { loadSave, localDateKey, nameInSentence, sizeParts, type PoolEntry, type Question } from "@/lib/daily";
import { avoidOf, endlessQuestion, LEVELS, levelOf, loadEndless, loadSeen, newSeed, rememberSeen, streakOf, writeEndless, type EndlessSave } from "@/lib/endless";
import type { ShapeFile } from "@/lib/outline";
import { play } from "@/lib/sound";
import { buzz, confetti } from "@/lib/celebrate";
import { useShareBox } from "@/components/site/ShareBox";
import { FlameIcon, flameTier, MapIcon, MarkIcon, TrophyIcon } from "@/components/site/Icons";
import { loadPool, loadShapes, mapHref, QuestionCard, reducedMotion, ROUND_TOP, Skeleton } from "@/components/daily/Matchup";
import { EndlessJoin } from "./EndlessJoin";

const R = t.results;

/**
 * A run in play. `questions` holds every round built so far (the current one, and the next one while its shapes load);
 * `used` the shapes they use, so later rounds never repeat one. `step` is the round on screen (0-based).
 */
type Run = {
  pool: PoolEntry[];
  seed: string;
  questions: Question[];
  used: Set<string>;
  /** shapes this player saw in their last runs, which this run steers clear of (signed into the token) */
  avoid: Set<string>;
  shapes: Record<string, ShapeFile>;
  choices: number[];
  step: number;
  /** the best streak before this run, for "New best!" */
  bestBefore: number;
  over: boolean;
  /** the results screen is showing */
  done: boolean;
  /** the run is saved in this browser (false with storage blocked: then there's no other tab to keep in step with) */
  saved: boolean;
  /** the server's token for this run, needed to post it on the Best streaks board (none if the server couldn't be reached) */
  token?: string;
};

// a run that ended this recently shows its results again on a reload, or when sign-in comes back from Google (the join
// pop-up waits as long: see JoinDialog's FLOW_MAX_AGE)
const RECENT = 30 * 60_000;

/** A new run from the server, which can then go on the Best streaks board; or, if it can't be reached, one made here. */
async function newRun(date: string): Promise<{ seed: string; token?: string }> {
  const abort = new AbortController();
  const id = setTimeout(() => abort.abort(), 4000);
  try {
    const res = await fetch("/api/endless/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // the shapes seen in the last runs, so this one can steer clear of them
      body: JSON.stringify({ date, seen: loadSeen() }),
      signal: abort.signal,
    });
    const d = res.ok ? ((await res.json()) as { seed?: unknown; token?: unknown }) : null;
    if (typeof d?.seed === "string" && typeof d.token === "string") return { seed: d.seed, token: d.token };
  } catch {
    /* offline or slow: play anyway */
  } finally {
    clearTimeout(id);
  }
  return { seed: newSeed(date) };
}

/** Builds rounds up to `count` (they only depend on the seed, so this is the same run every time). */
function upTo(run: Run, count: number) {
  while (run.questions.length < count) run.questions.push(endlessQuestion(run.pool, run.seed, run.questions.length + 1, run.used, run.avoid));
  return run.questions[count - 1];
}

/**
 * The shapes in the next ten rounds, never to be used as a yardstick (it would give those rounds away). A run's rounds
 * are the same whenever they're built, so building them early changes nothing.
 */
function comingUp(run: Run) {
  upTo(run, run.step + 11);
  return run.questions.slice(run.step + 1, run.step + 11).flatMap((x) => x.options.map((o) => o.id));
}

/** The run in progress in this browser (after a reload), the results of one that just ended, or a new one. */
async function prepare(fresh: boolean): Promise<Run> {
  const save = loadEndless();
  const last = fresh ? null : save.run;
  const old = last && !last.over ? last : null;
  const ended = last?.over && last.e && Date.now() - last.e < RECENT ? last : null;
  const [pool, started] = await Promise.all([loadPool(), old || ended ? null : newRun(localDateKey())]);
  const kept = old ?? ended;
  const seed = kept?.seed ?? started!.seed;
  // the best is saved after every right answer, so a resumed run takes the best from before it started
  const bestBefore = kept ? (kept.b ?? save.best) : save.best;
  const token = kept ? kept.t : started!.token;
  const run: Run = { pool, seed, questions: [], used: new Set(), avoid: avoidOf(token), shapes: {}, choices: kept?.c ?? [], step: 0, bestBefore, over: false, done: false, saved: false, token };
  if (ended) {
    // straight to its results (they need no drawings); answers that don't fit start a new run instead
    upTo(run, ended.c.length);
    if (streakOf(run.questions, ended.c) !== ended.c.length - 1) return prepare(true);
    return { ...run, step: ended.c.length - 1, over: true, done: true, saved: true };
  }
  if (old) {
    upTo(run, old.c.length + 1);
    // saved answers that don't fit this run (one missed but not marked over): start a new one instead
    if (streakOf(run.questions, old.c) < old.c.length) return prepare(true);
    run.step = old.c.length;
  } else {
    writeEndless({ ...save, runs: save.runs + 1, run: { seed, c: [], b: bestBefore, ...(token ? { t: token } : {}) } });
    track("endless_start", { ranked: !!token });
  }
  run.saved = loadEndless().run?.seed === seed;
  const q = run.questions[run.step] ?? upTo(run, run.step + 1);
  run.shapes = await loadShapes([q]);
  return run;
}

export function EndlessGame() {
  const [run, setRun] = useState<Run | null>(null);
  const [failed, setFailed] = useState(false);
  // the next round's drawings are still on their way
  const [busy, setBusy] = useState(false);
  // set when the player moves on, so the next question (or the results) takes focus; not on first load
  const advanced = useRef(false);
  const top = useRef<HTMLDivElement>(null);
  // the score bar, pinned under the header: after an answer, the reveal scrolls in below it, not under it
  const hud = useRef<HTMLDivElement>(null);
  const stuckTop = useCallback(() => (hud.current?.getBoundingClientRect().bottom ?? ROUND_TOP) + 8, []);
  // the next round's drawings, fetched while the current one is played
  const nextShapes = useRef<{ key: string; shapes: Promise<Record<string, ShapeFile>> } | null>(null);

  const start = (fresh: boolean) => {
    setFailed(false);
    // the loading card replaces the results (or the error), so nothing can be tapped twice while the run loads
    setRun(null);
    prepare(fresh)
      .then(setRun)
      .catch(() => setFailed(true));
  };

  useEffect(() => {
    prepare(false)
      .then(setRun)
      .catch(() => setFailed(true));
  }, []);

  // the matchup on screen counts as seen, so the next runs steer clear of its two shapes
  const shown = run && !run.done ? run.questions[run.step] : undefined;
  useEffect(() => {
    if (shown) rememberSeen(shown.options.map((o) => o.id));
  }, [shown]);

  // fetch the next round's drawings while this one is on screen (the next matchup doesn't depend on the answer)
  useEffect(() => {
    if (!run || run.done || run.over) return;
    const key = `${run.seed}:${run.step + 1}`;
    if (nextShapes.current?.key === key) return;
    nextShapes.current = { key, shapes: loadShapes([upTo(run, run.step + 2)]).catch(() => ({})) };
  }, [run]);

  useEffect(() => {
    if (!advanced.current) return;
    const heading = document.getElementById("daily-q") ?? document.getElementById("endless-done");
    const card = heading?.closest("section");
    if (!heading || !card) return;
    advanced.current = false;
    // line the game up under the header, then hand focus to the new heading for keyboard and screen-reader users
    // (near the top of the screen on phones held sideways, where the header doesn't stick)
    const y = (top.current ?? card).getBoundingClientRect().top;
    const at = innerHeight <= 500 ? 8 : ROUND_TOP;
    if (y < at - 16 || run?.done) scrollTo({ top: Math.max(0, y + scrollY - at), behavior: reducedMotion() ? "auto" : "smooth" });
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }, [run]);

  if (failed) {
    return (
      <div role="alert" className="rounded-[22px] border-2 border-line bg-white p-6 text-center">
        <p className="font-semibold">{t.failed}</p>
        <button type="button" onClick={() => start(false)} className="btn btn-primary mt-3 h-12">
          {t.retry}
        </button>
      </div>
    );
  }
  if (!run) return <Skeleton label={t.loading} pills />;

  const q = run.questions[run.step];
  const streak = streakOf(run.questions, run.choices);
  const best = Math.max(run.bestBefore, streak);
  const level = levelOf(run.step + 1);

  const answer = (choice: number) => {
    if (run.choices.length > run.step) return;
    const save = loadEndless();
    const saved = save.run;
    if (run.saved && (saved?.seed !== run.seed || saved.c.length !== run.choices.length)) {
      // another tab has moved this run on (or started a new one): its answers stand, so pick up from there
      advanced.current = true;
      return start(false);
    }
    const choices = [...run.choices, choice];
    const right = q.answer === choice;
    play(right ? "right" : "wrong");
    buzz(right ? 12 : [30, 50, 30]);
    track("endless_answer", { n: run.step + 1, correct: right });
    const n = streakOf(run.questions, choices);
    // passing the old best, or reaching a hotter flame: a longer buzz
    if (right && ((run.bestBefore > 0 && n === run.bestBefore + 1) || n === 10 || n === 25)) buzz([20, 40, 60]);
    const updated: EndlessSave = { ...save, best: Math.max(save.best, n), run: { seed: run.seed, b: run.bestBefore, c: choices, ...(run.token ? { t: run.token } : {}), ...(right ? {} : { over: true, e: Date.now() }) } };
    writeEndless(updated);
    if (!right) track("endless_end", { streak: n });
    setRun({ ...run, choices, over: !right });
  };

  const next = async () => {
    if (busy) return;
    advanced.current = true;
    if (run.over) return setRun({ ...run, done: true });
    const following = upTo(run, run.step + 2);
    setBusy(true);
    try {
      const pending = nextShapes.current?.key === `${run.seed}:${run.step + 1}` ? nextShapes.current.shapes : null;
      const shapes = (await pending) ?? {};
      const ok = following.options.every((o) => shapes[o.id]);
      setRun({ ...run, step: run.step + 1, shapes: { ...run.shapes, ...(ok ? shapes : await loadShapes([following])) } });
    } catch {
      // "Try again" resumes this run from the saved answers
      setRun(null);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={top} className="flex flex-col">
      {run.done ? null : <ScoreBar ref={hud} streak={streak} best={best} level={level} newBest={run.bestBefore > 0 && streak > run.bestBefore} />}
      {run.done ? (
        <Results
          run={run}
          streak={streak}
          best={best}
          onAgain={() => {
            advanced.current = true;
            start(true);
          }}
        />
      ) : (
        <QuestionCard
          key={run.step}
          eyebrow={t.round(run.step + 1, t.levels[level])}
          q={q}
          shapes={run.shapes}
          picked={run.choices[run.step]}
          verdict={(right) => (right ? t.right : t.wrong)}
          nextLabel={run.over ? t.seeRun : busy ? t.loadingNext : t.next}
          busy={busy}
          onPick={answer}
          onNext={next}
          stuckTop={stuckTop}
          exclude={comingUp(run)}
        />
      )}
    </div>
  );
}

/**
 * The run at a glance, pinned under the site header while playing, so anyone who looks (or tunes in to a stream) sees
 * the streak, the best and the level straight away: a big streak, the best, five level bars and the rules in one line.
 */
function ScoreBar({ ref, streak, best, level, newBest }: { ref: React.Ref<HTMLDivElement>; streak: number; best: number; level: number; newBest: boolean }) {
  const tier = flameTier(streak);
  return (
    <div
      ref={ref}
      data-score-bar
      className="sticky top-16 z-20 -mx-4 mb-3 border-b border-line bg-paper/95 px-4 pb-2.5 pt-2 backdrop-blur [@media(max-height:500px)]:top-0 sm:mx-0 sm:mb-4 sm:rounded-[22px] sm:border-2 sm:px-4"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-ink">
          {/* a hotter flame at 10 and 25 in a row: it pops in each time it changes */}
          <span key={tier} className={tier ? "pop-in" : undefined}>
            <FlameIcon className="size-7" tier={tier} />
          </span>
          <span className="font-display text-4xl leading-none tabular-nums">{streak}</span>
          <span className="text-sm font-bold text-muted">{t.hudStreak}</span>
          {newBest ? <span className="pop-in ml-1 rounded-full bg-gold px-2 py-0.5 text-xs font-extrabold uppercase tracking-wide text-ink">{t.hudNewBest}</span> : null}
        </p>
        <p className="flex items-center gap-1.5 text-ink">
          <TrophyIcon className="size-6" />
          <span className="text-sm font-bold text-muted">{t.hudBest}</span>
          <span className="font-display text-2xl leading-none tabular-nums">{best}</span>
        </p>
      </div>
      <ol className="mt-2 grid grid-cols-5 gap-1.5 sm:gap-2" aria-hidden="true">
        {LEVELS.map((_, i) => (
          <li key={i} className={`block h-2.5 rounded-full ${i < level ? "bg-green" : i === level ? "pop-in bg-primary" : "bg-beige"}`} />
        ))}
      </ol>
      <p className="sr-only">{t.levelSr(level + 1, LEVELS.length, t.levels[level])}</p>
      {/* said once, the moment the run passes the old best */}
      <p className="sr-only" aria-live="polite">
        {newBest ? t.hudNewBestSr : ""}
      </p>
      {/* on phones held sideways the bar keeps to one row of numbers and the level bars, so the game fits */}
      <p className="mt-1.5 text-center text-xs font-semibold text-ink-soft [@media(max-height:500px)]:hidden">{t.rules}</p>
    </div>
  );
}

/** "🟩🟩🟩🟥" in rows of ten, cut short on long runs so the message stays short. */
function grid(streak: number) {
  const shown = Math.min(streak, 30);
  const cells = [...Array(shown).fill("🟩"), ...(streak > shown ? [] : ["🟥"])];
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 10) rows.push(cells.slice(i, i + 10).join(""));
  if (streak > shown) rows.push(`${R.shareMore(streak - shown)} 🟥`);
  return rows.join("\n");
}

/**
 * The end of a run, built to send you straight back in: the streak, the next goal (your best, or the next place on the
 * Best streaks board), one big Play again (Enter replays), where this run ranks of all time, and the matchup
 * that ended it, with a "so close" when it was a close call. Nothing else.
 */
function Results({ run, streak, best, onAgain }: { run: Run; streak: number; best: number; onAgain: () => void }) {
  const shareBox = useShareBox();
  const newBest = streak > run.bestBefore && streak > 0;
  const miss = run.questions[streak];
  const [dailyDone, setDailyDone] = useState(false);
  // where this run lands on the Best streaks board, and the next place up (undefined while loading, null if it failed)
  const [place, setPlace] = useState<EndlessPlace | null | undefined>(undefined);

  useEffect(() => {
    queueMicrotask(() => setDailyDone(typeof loadSave().days[localDateKey()]?.s === "number"));
    // counted over the whole board, without the player's own row: this run would replace it (and, signed in, may
    // already be posted)
    if (streak > 0) {
      const me = loadPlayer()?.id;
      fetch(`/api/endless?place=${streak}${me ? `&player=${encodeURIComponent(me)}` : ""}`)
        .then((r) => (r.ok ? (r.json() as Promise<EndlessPlace>) : null))
        .then((p) => setPlace(p && typeof p.rank === "number" ? p : null))
        .catch(() => setPlace(null));
    }
    if (!newBest) return;
    play("perfect");
    buzz([20, 40, 20, 40, 80]);
    const id = setTimeout(confetti, reducedMotion() ? 0 : 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newBest]);

  // a plain Enter plays again, unless something else has focus or a pop-up (or the sign-in window) is open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.repeat || e.defaultPrevented || e.isComposing || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (document.querySelector('dialog[open], [role="dialog"], [aria-modal="true"]') || (el && el !== document.body && el.id !== "endless-done")) return;
      e.preventDefault();
      onAgain();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAgain]);

  const rank = place?.rank ?? null;
  const goal = (() => {
    if (!newBest) return best > 0 ? R.goalBest(best - streak + 1, best) : R.goalFirst;
    // a new best: the next place on the board, once it's in (or just the next number, if the board can't be read)
    if (place === undefined) return null;
    if (!place) return R.goalNext(streak + 1);
    return place.next ? R.goalRank(place.next.score - streak + 1, place.next.score + 1, place.next.place) : R.goalTop;
  })();
  // a close call: the miss was within 15%
  const gap = miss ? Math.max(miss.options[0].a, miss.options[1].a) / Math.min(miss.options[0].a, miss.options[1].a) - 1 : 1;
  const close = gap < 0.15;

  const share = () => {
    const url = `${location.origin}/endless`;
    const text = `${R.shareHead(site.name, streak)}\n${grid(streak)}\n${R.shareDare(streak + 1)}\n${url}`;
    shareBox.share({ kind: "score", url, text }, "endless");
  };

  return (
    <section aria-labelledby="endless-done" className="rounded-[28px] border-2 border-line bg-white p-5 shadow-[0_8px_0_0_var(--color-line)] sm:p-7">
      {newBest ? (
        <p className="flex justify-center">
          <span className="pop-in inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 text-sm font-extrabold uppercase tracking-wider text-ink shadow-[0_3px_0_0_var(--color-gold-shadow)]">
            <TrophyIcon className="size-5" />
            {R.newBest}
          </span>
        </p>
      ) : null}
      {/* the streak beside its title */}
      <div className={`${newBest ? "mt-3" : ""} flex items-center justify-center gap-4`}>
        <p aria-hidden="true" className="pop-in flex items-center gap-1 font-display text-7xl leading-none text-ink">
          {streak > 0 ? <FlameIcon className="size-12" tier={flameTier(streak)} /> : null}
          {streak}
        </p>
        <div className="min-w-0">
          <h2 id="endless-done" tabIndex={-1} className="font-display text-2xl leading-tight text-ink outline-none sm:text-3xl">
            <span className="sr-only">{R.scoreSr(streak, newBest)} </span>
            {R.title(streak)}
          </h2>
          <p className="text-sm text-muted">{R.inARow(streak)}</p>
        </div>
      </div>
      {/* the next goal, always within reach */}
      <p aria-live="polite" className="mt-3 min-h-7 text-center font-display text-lg leading-snug text-ink">
        {goal}
      </p>

      {/* straight back in */}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onAgain} className="btn btn-gold btn-lg min-w-0 flex-1">
          {R.playAgain} <span aria-hidden="true">→</span>
        </button>
        {streak > 0 ? (
          <button type="button" onClick={share} aria-label={R.share} className="btn btn-white btn-lg shrink-0 px-4">
            <ShareIcon className="size-6" />
          </button>
        ) : null}
      </div>
      <p className="mt-1.5 hidden text-center text-xs text-muted pointer-fine:block">{R.enterHint}</p>
      {shareBox.box}

      {/* where this run ranks of all time; signed in, it's posted straight away */}
      {streak > 0 ? (
        run.token ? (
          <EndlessJoin seed={run.seed} token={run.token} choices={run.choices} streak={streak} wouldRank={rank} />
        ) : rank ? (
          <p className="mt-4 flex items-center justify-center gap-2 text-center font-semibold text-ink">
            <TrophyIcon className="size-6" /> {R.wouldRank(rank)}
          </p>
        ) : null
      ) : null}

      {/* the one that ended it: a close call says so */}
      {miss ? (
        <div className="mt-5 rounded-2xl bg-paper px-4 py-1 ring-1 ring-line">
          <p className="pt-2.5 text-xs font-bold uppercase tracking-wide text-muted">{close ? R.soClose(Math.max(1, Math.round(gap * 100))) : R.missTitle}</p>
          <Answer q={miss} right={false} />
        </div>
      ) : null}

      <p className="mt-4 text-center text-sm">
        <Link href="/daily" className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline">
          {dailyDone ? R.dailyDone : R.dailyPlay} <span aria-hidden="true">&nbsp;→</span>
        </Link>
      </p>
    </section>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V3M7.5 7.5 12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

/** "Brazil is 12% bigger than Australia", with a link to compare the two on the map. */
function Answer({ q, right }: { q: Question; right: boolean }) {
  const big = q.options[q.answer];
  const small = q.options[1 - q.answer];
  const line = sizeParts(big, small);
  const href = mapHref(q);
  return (
    <div className="flex items-start gap-3 py-2.5 text-sm">
      <MarkIcon right={right} className="mt-0.5 size-5" />
      <span className="min-w-0 flex-1 text-ink">
        <strong>{line.big}</strong> <span className="text-muted">({big.sub})</span> {line.link} <strong>{line.small}</strong>{" "}
        <span className="text-muted">({small.sub})</span>
      </span>
      {/* not for a region yet: the map can't draw those */}
      {href ? (
        <Link
          href={href}
          aria-label={R.dragOnMapSr(nameInSentence(big), nameInSentence(small))}
          title={R.dragOnMap}
          className="-my-2 grid size-11 shrink-0 place-items-center rounded-lg text-primary hover:bg-primary-soft"
        >
          <MapIcon className="size-6" />
        </Link>
      ) : null}
    </div>
  );
}
