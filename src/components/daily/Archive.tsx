"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { buildQuestions, dayNumber, LAUNCH, loadSave, localDateKey, shiftDate, type Question } from "@/lib/daily";
import { dayName } from "@/lib/format";
import { play } from "@/lib/sound";
import { track } from "@/lib/analytics";
import { dailyCopy } from "@/content/daily";
import { loadPool, loadShapes, mapHref, QuestionCard, Skeleton } from "./Matchup";
import { MapIcon, MarkIcon } from "@/components/site/Icons";
import type { ShapeFile } from "@/lib/outline";

const t = dailyCopy.archive;
const reveal = dailyCopy.reveal;
const R = dailyCopy.results;

// scores from archive replays, kept apart from the real days (which drive the streak and the leaderboard)
const KEY = "atlas-archive-v1";
type Replays = Record<string, number>;
const loadReplays = (): Replays => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
};
const saveReplay = (date: string, score: number) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadReplays(), [date]: score }));
  } catch {
    /* storage blocked */
  }
};

/** The list of past days, or one day's five when `?day=N` names a past day. */
export function Archive() {
  const params = useSearchParams();
  const day = Number(params.get("day"));
  // the last day the archive holds: yesterday, in this player's time (today's five are live on /daily)
  const [last, setLast] = useState<number | null>(null);
  useEffect(() => queueMicrotask(() => setLast(dayNumber(localDateKey()) - 1)), []);
  // the list's height, so the page doesn't jump when it arrives
  if (last === null) return <div aria-busy="true" className="min-h-48" />;
  if (Number.isInteger(day) && day >= 1 && day <= last) return <ArchiveGame key={day} day={day} />;
  return <DayList last={last} />;
}

function DayList({ last }: { last: number }) {
  const [save] = useState(() => loadSave());
  const [replays] = useState(() => loadReplays());
  const today = localDateKey();
  if (last < 1) return <p className="rounded-[22px] border-2 border-line bg-white p-6 text-center text-ink-soft">{t.none}</p>;
  const days = Array.from({ length: last }, (_, i) => last - i);
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {days.map((n) => {
        const date = shiftDate(LAUNCH, n - 1);
        const official = save.days[date]?.s;
        const replayed = replays[date];
        const state =
          typeof official === "number" ? t.official(official, 5) : typeof replayed === "number" ? t.replayed(replayed, 5) : t.unplayed;
        const played = typeof official === "number" || typeof replayed === "number";
        return (
          <li key={n}>
            <Link
              href={`/daily/archive?day=${n}`}
              className={`press-card flex min-h-16 flex-col justify-center rounded-2xl border-2 px-3 py-2 ${played ? "border-line bg-white" : "border-dashed border-line bg-paper"}`}
            >
              <span className="font-display text-base text-ink">{t.day(n)}</span>
              <span className="text-xs text-muted">
                {dayName(date, today)} · <span className={played ? "font-semibold text-ink-soft" : ""}>{state}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

type Round = { date: string; questions: Question[]; shapes: Record<string, ShapeFile> };

/** One past day's five, played like the daily but saved only as a replay score. */
function ArchiveGame({ day }: { day: number }) {
  const date = shiftDate(LAUNCH, day - 1);
  const [round, setRound] = useState<Round | null>(null);
  const [failed, setFailed] = useState(false);
  const [choices, setChoices] = useState<number[]>([]);
  const [step, setStep] = useState(0);

  const fetchRound = async (): Promise<Round> => {
    const questions = buildQuestions(await loadPool(), date);
    return { date, questions, shapes: await loadShapes(questions) };
  };
  useEffect(() => {
    let live = true;
    fetchRound()
      .then((r) => {
        if (!live) return;
        setRound(r);
        play("start");
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the day is this component's key
  }, []);
  const retry = () => {
    setFailed(false);
    fetchRound()
      .then((r) => {
        setRound(r);
        play("start");
      })
      .catch(() => setFailed(true));
  };

  if (failed)
    return (
      <div role="alert" className="rounded-[22px] border-2 border-line bg-white p-6 text-center">
        <p className="font-semibold">{t.failed}</p>
        <button type="button" onClick={retry} className="btn btn-primary mt-3 h-12">
          {t.retry}
        </button>
      </div>
    );
  if (!round) return <Skeleton label={t.loading(day)} />;

  const total = round.questions.length;
  const score = choices.filter((c, i) => round.questions[i]?.answer === c).length;
  const finished = step >= total;

  const answer = (choice: number) => {
    if (choices.length > step) return;
    const q = round.questions[step];
    const right = q.answer === choice;
    const next = [...choices, choice];
    play(right ? "right" : "wrong");
    track("archive_answer", { day, n: step + 1, correct: right });
    setChoices(next);
    if (next.length >= total) {
      const s = next.filter((c, i) => round.questions[i].answer === c).length;
      saveReplay(date, s);
      track("archive_complete", { day, score: s });
    }
  };

  if (finished) {
    const marks = round.questions.map((q, i) => choices[i] === q.answer);
    return (
      <section aria-labelledby="archive-done" className="rounded-[28px] border-2 border-line bg-white p-5 shadow-[0_8px_0_0_var(--color-line)] sm:p-7">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">{t.day(day)} · {dayName(date, localDateKey())}</p>
        <h2 id="archive-done" tabIndex={-1} className="mt-1 font-display text-3xl leading-tight text-ink outline-none">
          {R.title(score, total)}
        </h2>
        <p className="mt-1 text-lg font-semibold text-ink">{t.resultTitle(score, total)}</p>
        <ol className="mt-3 flex gap-1.5" aria-label={t.answers}>
          {marks.map((right, i) => (
            <li key={i} className={`pop-in flex size-9 items-center justify-center rounded-lg ${right ? "bg-green" : "bg-red"}`}>
              <MarkIcon right={right} className="size-5" />
              <span className="sr-only">{R.markSr(i + 1, right)}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-muted">{t.noStreak}</p>
        <div className="mt-4 flex gap-2">
          <Link href="/daily/archive" className="btn btn-primary btn-lg min-w-0 flex-1">
            {t.another} <span aria-hidden="true">→</span>
          </Link>
          <Link href="/daily" className="btn btn-white btn-lg shrink-0 px-4">
            {t.today}
          </Link>
        </div>
        <ul className="mt-5 space-y-2 text-sm">
          {round.questions.map((q, i) => {
            const big = q.options[q.answer];
            const small = q.options[1 - q.answer];
            const href = mapHref(q);
            return (
              <li key={i} className="flex items-center gap-2 rounded-xl bg-paper px-3 py-2 ring-1 ring-line">
                <MarkIcon right={marks[i]} className="size-5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <strong className="text-ink">{big.n}</strong> <span className="text-muted">beats</span> {small.n}
                </span>
                {href ? (
                  <Link href={href} aria-label={`${R.dragOnMap}: ${big.n}, ${small.n}`} className="shrink-0 text-primary">
                    <MapIcon className="size-5" />
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  return (
    <QuestionCard
      key={`${date}-${step}`}
      eyebrow={t.round(day, step + 1, total)}
      q={round.questions[step]}
      shapes={round.shapes}
      picked={choices[step]}
      verdict={(correct) => (correct ? reveal.right : reveal.wrong)}
      nextLabel={step + 1 < total ? reveal.next : t.seeScore}
      exclude={round.questions.flatMap((x) => x.options.map((o) => o.id))}
      onPick={answer}
      onNext={() => setStep(step + 1)}
    />
  );
}
