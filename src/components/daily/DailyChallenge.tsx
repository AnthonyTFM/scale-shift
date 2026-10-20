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
import { rememberPlayer } from "@/lib/player";
import { signInOn } from "@/lib/sign-in";
import { PlayedElsewhere } from "./PlayedElsewhere";
import { play, setSound, soundOn } from "@/lib/sound";
import { buzz, confetti } from "@/lib/celebrate";
import { resultImage } from "@/lib/result-image";
import { challengeMessage } from "@/lib/challenge-friend";
import { useShareBox } from "@/components/site/ShareBox";

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

  useEffect(() => {
    const c = readChallenge(location.hash);
    if (c) queueMicrotask(() => setChallenge(c));
    prepare(false)
      .then(setGame)
      .catch(() => setFailed(true));
    // another tab answered: show its progress here too, so tabs never disagree (or let today be played twice)
    const sync = () => setGame((g) => (g ? catchUp(g) : g));
    // signed in: bring in this player's results from the leaderboard, so every device shows the same (first) score
    if (signInOn)
      fetch(`/api/leaderboard/me?today=${localDateKey()}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { player?: { id: string; name: string | null } | null; days?: Record<string, { c: number[]; s: number }> } | null) => {
          if (d?.player?.name) rememberPlayer({ id: d.player.id, name: d.player.name });
          if (!d?.days || !Object.keys(d.days).length) return;
          const save = mergeDays(d.days);
          setGame((g) => (g ? official(g, save) : g));
        })
        .catch(() => {});
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
    const last = next.length >= round.questions.length;
    const perfect = last && scoreOf(round, next) === round.questions.length;
    play(q.answer !== choice ? "wrong" : perfect ? "perfect" : "right");
    // a tick for every answer, a double buzz when wrong, and a party on a perfect round
    buzz(q.answer !== choice ? [30, 50, 30] : 12);
    if (perfect) {
      buzz([20, 40, 20, 40, 80]);
      setTimeout(confetti, 350);
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
    <div>
      {challenge && todayNo && !finished ? (
        <p className="mb-3 rounded-xl bg-amber-100 p-3 text-sm font-semibold text-amber-950 ring-1 ring-amber-300">
          🎯{" "}
          {challenge.day === todayNo
            ? `${challenge.name} scored ${challenge.score}/5 on today's challenge. Can you beat it?`
            : `${challenge.name} sent you Daily #${challenge.day}, but this is today's. Play it and send your score back.`}
        </p>
      ) : null}
      {signInOn && !finished && round.date ? <PlayedElsewhere /> : null}
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
    <ol className="mb-4 flex items-center gap-1.5" aria-label="Progress">
      {round.questions.map((q, i) => {
        const done = i < choices.length;
        const right = done && choices[i] === q.answer;
        const current = !done && i === step;
        return (
          <li
            key={i}
            aria-label={`Question ${i + 1}: ${done ? (right ? "correct" : "wrong") : current ? "current" : "not answered"}`}
            className="flex flex-1 items-center gap-1.5"
          >
            <span
              aria-hidden="true"
              className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                done
                  ? `pop-in text-white ${right ? "bg-formal" : "bg-danger"}`
                  : current
                    ? "bg-accent text-panel ring-4 ring-accent/30"
                    : "bg-white text-muted ring-1 ring-line"
              }`}
            >
              {done ? (right ? "✓" : "✗") : i + 1}
            </span>
            {i < round.questions.length - 1 ? <span aria-hidden="true" className={`h-1 flex-1 rounded-full ${done ? "bg-ink-soft/30" : "bg-line"}`} /> : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Sound effects on or off (off by default). */
function SoundToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => queueMicrotask(() => setOn(soundOn())), []);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        setSound(!on);
        setOn(!on);
      }}
      className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-muted ring-1 ring-line hover:text-ink"
    >
      <span aria-hidden="true">{on ? "🔊" : "🔇"}</span> Sound {on ? "on" : "off"}
    </button>
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
  // one shared scale per view for both tiles, so the two drawings compare fairly
  const spanOf = (view: "merc" | "ea") => Math.max(...q.options.map((o) => size(shapes[o.id][view]))) * 1.12;
  const spans = { merc: spanOf("merc"), ea: spanOf("ea") };

  useEffect(() => {
    // keyboard users land on "Next"; preventScroll keeps the page where it is (the reveal is the thing to watch)
    if (answered) nextRef.current?.focus({ preventScroll: true });
  }, [answered]);

  return (
    <section aria-labelledby="daily-q" className="rounded-card border border-line bg-white p-4 shadow-float sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          {practice ? "Practice · " : ""}Question {n + 1} of {total}
        </p>
        <SoundToggle />
      </div>
      <h2 id="daily-q" className="mt-1 text-center font-display text-2xl text-ink sm:text-3xl">
        {q.prompt}
      </h2>
      <p className="mt-1 text-center text-sm text-muted">
        {answered ? "Watch them shrink or grow to their true size." : "Drawn the way a normal web map shows them. Tap the bigger one."}
      </p>

      <div className="relative mt-4 grid grid-cols-2 gap-3 sm:gap-4">
        {q.options.map((o, i) => {
          const isAnswer = i === q.answer;
          const look = !answered
            ? "border-line hover:border-accent [--press-shadow:#e3d6c3] hover:[--press-shadow:#f29e1f]"
            : isAnswer
              ? "border-formal [--press-shadow:#0f7a55]"
              : picked === i
                ? "border-danger [--press-shadow:#b4235a]"
                : "border-line opacity-70 [--press-shadow:#e3d6c3]";
          const inflate = o.m / o.a;
          return (
            <button
              key={o.id}
              type="button"
              disabled={answered}
              onClick={() => onPick(i)}
              aria-label={answered ? undefined : `${o.n}, ${o.sub}`}
              className={`press relative flex min-w-0 flex-col rounded-2xl border-2 bg-white p-2 text-left disabled:cursor-default sm:p-3 ${look}`}
            >
              {answered && (isAnswer || picked === i) ? (
                <span
                  className={`pop-in absolute -top-3 right-2 z-10 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow ${isAnswer ? "bg-formal" : "bg-danger"}`}
                >
                  {isAnswer ? "✓ Bigger" : "✗ Your pick"}
                </span>
              ) : null}
              <RevealTile map={shapes[o.id].merc} real={shapes[o.id].ea} spans={spans} revealed={answered} color={COLORS[i]} />
              <span className="mt-2 block truncate text-base font-bold text-ink sm:text-lg">{o.n}</span>
              <span className="block truncate text-xs text-muted">{o.sub}</span>
              {answered ? (
                <span className="mt-1 block text-xs font-semibold text-ink-soft">
                  {formatBoth(o.a)}
                  {inflate >= 1.3 ? <span className="block font-normal text-muted">Maps show it {inflate >= 10 ? Math.round(inflate) : inflate.toFixed(1)}× too big</span> : null}
                </span>
              ) : null}
            </button>
          );
        })}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[38%] z-10 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-panel text-xs font-black text-white ring-4 ring-white"
        >
          VS
        </span>
      </div>

      <WhoIsWho options={q.options} />

      <div aria-live="polite">
        {answered ? (
          <div className={`pop-in mt-4 rounded-xl p-4 ${correct ? "bg-emerald-50 text-emerald-950" : "bg-rose-50 text-rose-950"}`}>
            <p className="text-lg font-bold">{correct ? "✓ Correct!" : "✗ Not quite."}</p>
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
          className="press mt-4 h-12 w-full rounded-xl bg-panel font-bold text-panel-text [--press-shadow:#071a2e] hover:bg-panel-2"
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

const size = (o: Outline) => Math.max(o.b[2] - o.b[0], o.b[3] - o.b[1]);

/** One outline centred in a 100 × 100 tile, at the tile's shared scale. */
function Shape({ outline, span, color }: { outline: Outline; span: number; color: string }) {
  const [x0, y0, x1, y1] = outline.b;
  const k = 100 / span;
  const tiny = size(outline) < span * 0.06;
  return (
    <>
      <path
        d={outline.d}
        transform={`translate(50 50) scale(${k}) translate(${-(x0 + x1) / 2} ${-(y0 + y1) / 2})`}
        fill={color}
        fillOpacity={0.88}
        stroke={color}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        fillRule="evenodd"
        strokeLinejoin="round"
      />
      {tiny ? <circle cx={50} cy={50} r={8} fill="none" stroke={color} strokeWidth={1.2} /> : null}
    </>
  );
}

/**
 * The shrink reveal: before answering, the shape as a normal map draws it. On answering, it grows or shrinks to the size
 * it really is next to the other shape, then the true outline fades in.
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
  const area = (o: Outline, span: number) => ((o.b[2] - o.b[0]) * (o.b[3] - o.b[1])) / (span * span);
  const grow = Math.sqrt(area(real, spans.ea) / Math.max(area(map, spans.merc), 1e-9)) || 1;
  return (
    <svg viewBox="0 0 100 100" className="aspect-square w-full rounded-xl bg-[radial-gradient(circle_at_35%_30%,#dff0f8,#bcdcec)]" aria-hidden="true">
      <g className="reveal-map" style={{ transform: revealed ? `scale(${grow})` : "scale(1)", opacity: revealed ? 0 : 1 }}>
        <Shape outline={map} span={spans.merc} color={color} />
      </g>
      <g className="reveal-true" style={{ opacity: revealed ? 1 : 0 }}>
        <Shape outline={real} span={spans.ea} color={color} />
      </g>
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
  const shareBox = useShareBox();
  const verdict =
    score === total
      ? "Perfect. Mercator can't fool you."
      : score >= total - 1
        ? "Sharp eye. One got past you."
        : score >= 3
          ? "Not bad. The map tricked you twice."
          : "The map fooled you today. New questions tomorrow.";

  const challengeFriend = () => {
    if (round.date) shareBox.share(challengeMessage(score, total, round.date), "results");
  };

  const shareImage = async () => {
    if (!round.date) return;
    track("daily_share_image", { score });
    const blob = await resultImage({ day: dayNumber(round.date), score, marks: round.questions.map((q, i) => choices[i] === q.answer), verdict, streak: s.streak });
    if (!blob) return setCopied("Couldn't make the picture. Try Share my score instead.");
    const file = new File([blob], `scale-shift-daily-${dayNumber(round.date)}.png`, { type: "image/png" });
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
    setCopied("Picture saved. Post it anywhere.");
  };

  const share = () => {
    const url = `${location.origin}/daily`;
    shareBox.share({ kind: "score", url, text: `${site.name} Daily #${dayNumber(today)} · ${score}/${total}\n${grid}\n${url}` }, "results");
  };

  return (
    <section aria-labelledby="daily-done" className="rounded-card border border-line bg-white p-4 shadow-float sm:p-6">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{round.date ? `Daily #${dayNumber(round.date)}` : "Practice round"}</p>
      <div className="mt-2 flex items-center gap-4">
        <p
          className={`pop-in grid size-20 shrink-0 place-items-center rounded-full font-display text-3xl text-white ${score >= total - 1 ? "bg-formal" : score >= 3 ? "bg-panel" : "bg-danger"}`}
          aria-hidden="true"
        >
          {score}/{total}
        </p>
        <div>
          <h2 id="daily-done" className="font-display text-3xl leading-tight text-ink">
            You got {score} out of {total}
          </h2>
          <p className="mt-1 text-ink-soft">{verdict}</p>
        </div>
      </div>
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
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={share} className="press h-12 rounded-xl bg-accent font-bold text-panel [--press-shadow:#c47a10] hover:bg-accent-strong">
              Share my score
            </button>
            <button type="button" onClick={shareImage} className="press h-12 rounded-xl bg-accent font-bold text-panel [--press-shadow:#c47a10] hover:bg-accent-strong">
              📸 Share as a picture
            </button>
            <button type="button" onClick={challengeFriend} className="press h-12 rounded-xl bg-panel font-bold text-panel-text [--press-shadow:#071a2e] hover:bg-panel-2">
              Challenge a friend
            </button>
            <button type="button" onClick={onPractice} className="press h-12 rounded-xl border-2 border-line bg-white font-bold text-ink hover:bg-paper">
              Play a practice round
            </button>
          </div>
          <p aria-live="polite" className="mt-2 whitespace-pre-line text-sm text-formal">
            {copied}
          </p>
          {shareBox.box}
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
