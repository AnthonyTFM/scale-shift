"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { site } from "@/content/site";
import { endlessCopy as t } from "@/content/endless";
import { track } from "@/lib/analytics";
import { loadSave, localDateKey, nameInSentence, sizeParts, type PoolEntry, type Question } from "@/lib/daily";
import { endlessQuestion, LEVELS, levelOf, loadEndless, newSeed, streakOf, writeEndless, type EndlessSave } from "@/lib/endless";
import type { ShapeFile } from "@/lib/outline";
import { play } from "@/lib/sound";
import { buzz, confetti } from "@/lib/celebrate";
import { useShareBox } from "@/components/site/ShareBox";
import { FlameIcon, MarkIcon, TrophyIcon } from "@/components/site/Icons";
import { loadPool, loadShapes, mapHref, QuestionCard, reducedMotion, ROUND_TOP, Skeleton } from "@/components/daily/Matchup";

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
  shapes: Record<string, ShapeFile>;
  choices: number[];
  step: number;
  /** the best streak before this run, for "New best!" */
  bestBefore: number;
  over: boolean;
  /** the results screen is showing */
  done: boolean;
};

/** Builds rounds up to `count` (they only depend on the seed, so this is the same run every time). */
function upTo(run: Run, count: number) {
  while (run.questions.length < count) run.questions.push(endlessQuestion(run.pool, run.seed, run.questions.length + 1, run.used));
  return run.questions[count - 1];
}

/** The run in progress in this browser (after a reload), or a new one. */
async function prepare(fresh: boolean): Promise<Run> {
  const pool = await loadPool();
  const save = loadEndless();
  const old = !fresh && save.run && !save.run.over ? save.run : null;
  const seed = old?.seed ?? newSeed(localDateKey());
  const run: Run = { pool, seed, questions: [], used: new Set(), shapes: {}, choices: old?.c ?? [], step: 0, bestBefore: save.best, over: false, done: false };
  if (old) {
    upTo(run, old.c.length + 1);
    // a run saved mid-reveal of a wrong answer is over: start a new one instead
    if (streakOf(run.questions, old.c) < old.c.length) return prepare(true);
    run.step = old.c.length;
  } else {
    writeEndless({ ...save, runs: save.runs + 1, run: { seed, c: [] } });
    track("endless_start");
  }
  const q = run.questions[run.step] ?? upTo(run, run.step + 1);
  run.shapes = await loadShapes([q]);
  return run;
}

export function EndlessGame() {
  const [run, setRun] = useState<Run | null>(null);
  const [failed, setFailed] = useState(false);
  // set when the player moves on, so the next question (or the results) takes focus; not on first load
  const advanced = useRef(false);
  const top = useRef<HTMLDivElement>(null);
  // the next round's drawings, fetched while the current one is played
  const nextShapes = useRef<{ key: string; shapes: Promise<Record<string, ShapeFile>> } | null>(null);

  const start = (fresh: boolean) => {
    setFailed(false);
    prepare(fresh)
      .then(setRun)
      .catch(() => setFailed(true));
  };

  useEffect(() => {
    prepare(false)
      .then(setRun)
      .catch(() => setFailed(true));
  }, []);

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
    const y = (top.current ?? card).getBoundingClientRect().top;
    if (y < 72 || run?.done) scrollTo({ top: Math.max(0, y + scrollY - ROUND_TOP), behavior: reducedMotion() ? "auto" : "smooth" });
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
  if (!run) return <Skeleton label={t.loading} />;

  const q = run.questions[run.step];
  const streak = streakOf(run.questions, run.choices);
  const best = Math.max(run.bestBefore, streak);
  const level = levelOf(run.step + 1);

  const answer = (choice: number) => {
    if (run.choices.length > run.step) return;
    const choices = [...run.choices, choice];
    const right = q.answer === choice;
    play(right ? "right" : "wrong");
    buzz(right ? 12 : [30, 50, 30]);
    track("endless_answer", { n: run.step + 1, correct: right });
    const save = loadEndless();
    const n = streakOf(run.questions, choices);
    const updated: EndlessSave = { ...save, best: Math.max(save.best, n), run: { seed: run.seed, c: choices, ...(right ? {} : { over: true }) } };
    writeEndless(updated);
    if (!right) track("endless_end", { streak: n });
    setRun({ ...run, choices, over: !right });
  };

  const next = async () => {
    advanced.current = true;
    if (run.over) return setRun({ ...run, done: true });
    const following = upTo(run, run.step + 2);
    try {
      const pending = nextShapes.current?.key === `${run.seed}:${run.step + 1}` ? nextShapes.current.shapes : null;
      const shapes = (await pending) ?? {};
      const ok = following.options.every((o) => shapes[o.id]);
      setRun({ ...run, step: run.step + 1, shapes: { ...run.shapes, ...(ok ? shapes : await loadShapes([following])) } });
    } catch {
      setFailed(true);
    }
  };

  return (
    <div ref={top} className="flex flex-col">
      {run.done ? null : (
        <>
          <div className="mb-2 flex items-center justify-between gap-2">
            <Pill>
              <FlameIcon className="size-5" />
              {t.streak(streak)}
            </Pill>
            <Pill>
              <TrophyIcon className="size-5" />
              {t.best(best)}
            </Pill>
          </div>
          <Levels level={level} />
        </>
      )}
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
          nextLabel={run.over ? t.seeRun : t.next}
          onPick={answer}
          onNext={next}
        />
      )}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border-2 border-line bg-white px-3 text-sm font-bold text-ink shadow-[0_3px_0_0_var(--color-line)]">
      {children}
    </span>
  );
}

/** Five bars, one per level, filled up to the current one. Same height as the daily's progress bar. */
function Levels({ level }: { level: number }) {
  return (
    <div className="mb-3 sm:mb-4">
      <ol className="grid grid-cols-5 gap-1.5 sm:gap-2" aria-hidden="true">
        {LEVELS.map((_, i) => (
          <li key={i} className={`block h-3 rounded-full ${i < level ? "bg-green" : i === level ? "pop-in bg-primary" : "bg-beige"}`} />
        ))}
      </ol>
      <p className="sr-only">{t.levelSr(level + 1, LEVELS.length, t.levels[level])}</p>
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

function Results({ run, streak, best, onAgain }: { run: Run; streak: number; best: number; onAgain: () => void }) {
  const shareBox = useShareBox();
  const newBest = streak > run.bestBefore && streak > 0;
  const miss = run.questions[streak];
  const played = run.questions.slice(0, run.choices.length);
  const level = levelOf(streak + 1);
  const [runs, setRuns] = useState<number | null>(null);
  const [dailyDone, setDailyDone] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setRuns(loadEndless().runs);
      setDailyDone(typeof loadSave().days[localDateKey()]?.s === "number");
    });
    if (!newBest) return;
    play("perfect");
    buzz([20, 40, 20, 40, 80]);
    const id = setTimeout(confetti, reducedMotion() ? 0 : 300);
    return () => clearTimeout(id);
  }, [newBest]);

  const share = () => {
    const url = `${location.origin}/endless`;
    const text = `${R.shareHead(site.name, streak)}\n${grid(streak)}\n${R.shareDare(streak + 1)}\n${url}`;
    shareBox.share({ kind: "score", url, text }, "endless");
  };

  return (
    <section aria-labelledby="endless-done" className="rounded-[28px] border-2 border-line bg-white p-5 shadow-[0_8px_0_0_var(--color-line)] sm:p-7">
      <div className="text-center">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">{R.eyebrow}</p>
        <p aria-hidden="true" className="pop-in mt-1 font-display text-[5.5rem] leading-none text-ink sm:text-8xl">
          {streak}
        </p>
        <p aria-hidden="true" className="font-bold text-muted">
          {R.inARow(streak)}
        </p>
        {newBest ? (
          <p className="pop-in mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 text-sm font-extrabold uppercase tracking-wider text-ink shadow-[0_3px_0_0_var(--color-gold-shadow)]">
            <TrophyIcon className="size-5" />
            {R.newBest}
          </p>
        ) : null}
        <h2 id="endless-done" className="mt-3 font-display text-3xl leading-tight text-ink">
          <span className="sr-only">{R.scoreSr(streak)} </span>
          {R.title(streak)}
        </h2>
        <p className="mt-1 text-muted">{R.verdict(streak + 1)}</p>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-2 text-center sm:gap-3">
        {[
          [R.best, best, R.bestSub],
          [R.runs, runs ?? "—", R.runsSub],
          [R.level, `${level + 1}/${LEVELS.length}`, t.levels[level]],
        ].map(([k, v, sub]) => (
          <div key={String(k)} className="flex flex-col rounded-[20px] border-2 border-line bg-paper px-2 py-3">
            <dt className="order-1 whitespace-nowrap text-[11px] font-bold uppercase tracking-normal text-muted">{k}</dt>
            <dd className="order-2 font-display text-[1.7rem] leading-tight text-ink">{v}</dd>
            <dd className="order-3 text-xs text-muted">{sub}</dd>
          </div>
        ))}
      </dl>

      <button type="button" onClick={onAgain} className="btn btn-gold btn-lg mt-5 w-full">
        {R.playAgain} <span aria-hidden="true">→</span>
      </button>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={share} className="btn btn-primary h-12 px-2 text-sm sm:text-base">
          <span className="sm:hidden">{R.shareShort}</span>
          <span className="hidden sm:inline">{R.share}</span>
        </button>
        <Link href="/daily" className="btn btn-white h-12 px-2 text-sm sm:text-base">
          {dailyDone ? R.dailyDone : R.dailyPlay}
        </Link>
      </div>
      {shareBox.box}

      {miss ? (
        <>
          <h3 className="mt-7 font-display text-xl text-ink">{R.missTitle}</h3>
          <Answer q={miss} right={false} />
        </>
      ) : null}
      {played.length > 1 ? (
        <details className="mt-4 rounded-2xl border-2 border-line px-4 py-1">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-ink">{R.allTitle(played.length)}</summary>
          <ol className="divide-y divide-line">
            {played.map((pq, i) => (
              <li key={i}>
                <Answer q={pq} right={run.choices[i] === pq.answer} />
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  );
}

/** "Brazil is 12% bigger than Australia", with a link to compare the two on the map. */
function Answer({ q, right }: { q: Question; right: boolean }) {
  const big = q.options[q.answer];
  const small = q.options[1 - q.answer];
  const line = sizeParts(big, small);
  return (
    <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 py-2.5 text-sm sm:flex sm:flex-wrap">
      <MarkIcon right={right} className="size-5 translate-y-1" />
      <span className="min-w-0 flex-1 text-ink">
        <strong>{line.big}</strong> <span className="text-muted">({big.sub})</span> {line.link} <strong>{line.small}</strong>{" "}
        <span className="text-muted">({small.sub})</span>
      </span>
      <Link
        href={mapHref(q)}
        aria-label={`Compare the sizes of ${nameInSentence(big)} and ${nameInSentence(small)} on the map`}
        className="col-start-2 font-semibold text-primary hover:underline"
      >
        {R.dragOnMap} →
      </Link>
    </div>
  );
}
