"use client";

import { useEffect, useState, ViewTransition } from "react";
import Link from "next/link";
import { dayNumber, loadSave, localDateKey, QUESTIONS_PER_DAY, stats } from "@/lib/daily";
import { home } from "@/content/home";
import { ClockIcon, FlameIcon } from "@/components/site/Icons";

type State = { day: number; done: boolean; score?: number; streak: number; played: number; perfect: number };

/** Time until the player's next local midnight, as whole hours and minutes. */
function untilMidnight() {
  const now = new Date();
  const ms = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
  return { h: Math.floor(ms / 3_600_000), m: Math.floor((ms % 3_600_000) / 60_000), ms };
}

/**
 * The daily game's tile at the top of the homepage, beside endless mode's: a title, one line about you (streak and
 * today's score once played, streak and perfect days before, the game's length on a first visit) and one button. Kept
 * short so the Best streaks board and the map are on the first screen too. Morphs into the game on /daily.
 */
export function HeroPlay() {
  const [s, setS] = useState<State | null>(null);
  const [left, setLeft] = useState<ReturnType<typeof untilMidnight> | null>(null);
  const t = home.hub;

  useEffect(() => {
    const read = () => {
      const today = localDateKey();
      const save = loadSave();
      const rec = save.days[today];
      const st = stats(save, today);
      setS({ day: dayNumber(today), done: typeof rec?.s === "number", score: rec?.s, streak: st.streak, played: st.played, perfect: st.perfect });
      setLeft(untilMidnight());
    };
    read();
    const id = setInterval(() => setLeft(untilMidnight()), 30_000);
    window.addEventListener("focus", read);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", read);
    };
  }, []);

  const streak = s?.streak ? (
    <span className="inline-flex items-center gap-1">
      <FlameIcon className="size-5" />
      <span aria-hidden="true">{s.streak}</span>
      <span className="sr-only">{t.playStreakSr(s.streak)}</span>
    </span>
  ) : null;

  return (
    <ViewTransition name="daily-card" share="morph" default="none">
      <div className="hero-daily flex flex-col rounded-card bg-card p-4 text-ink shadow-float ring-1 ring-line sm:p-5">
        <p className="min-h-4 text-xs font-bold uppercase tracking-wide text-primary">{s ? t.playEyebrow(s.day) : null}</p>
        <h2 className="mt-1 font-display text-xl leading-tight sm:text-2xl md:text-3xl">
          <Link href="/daily" transitionTypes={["to-daily"]} className="hover:underline">
            {t.playTitle}
          </Link>
        </h2>
        {/* one line about you; the same height in every state, so nothing below moves */}
        <p className="mt-2 flex min-h-7 flex-wrap items-center gap-x-2.5 font-display text-lg tabular-nums leading-tight sm:text-xl">
          {!s ? null : s.done ? (
            <>
              {streak}
              <span>
                <span aria-hidden="true">
                  {s.score}/{QUESTIONS_PER_DAY} <span className="font-sans text-sm font-semibold text-muted">{t.playToday}</span>
                </span>
                <span className="sr-only">{t.playTodaySr(s.score ?? 0, QUESTIONS_PER_DAY)}</span>
              </span>
            </>
          ) : s.played ? (
            <>
              {streak ?? <span className="text-base text-muted">{t.playNoStreak}</span>}
              {s.perfect ? <span className="text-base text-muted">{t.playPerfect(s.perfect)}</span> : null}
            </>
          ) : (
            <span className="text-base text-muted">{t.playNew}</span>
          )}
        </p>
        <div className="mt-auto pt-3">
          <Link
            href="/daily"
            transitionTypes={["to-daily"]}
            aria-label={s?.done ? t.playDoneCtaLong : t.playCtaLong}
            className="btn btn-primary group h-12 w-full px-3 sm:w-auto sm:px-6"
          >
            <span className="sm:hidden">{s?.done ? t.playDoneCta : t.playCta}</span>
            <span className="hidden sm:inline">{s?.done ? t.playDoneCtaLong : t.playCtaLong}</span>
            <span aria-hidden="true" className="transition group-hover:translate-x-1">
              →
            </span>
          </Link>
          {/* after playing: when the next five arrive */}
          <p className="mt-1.5 flex min-h-4 items-center gap-1 text-xs font-semibold text-muted">
            {s?.done && left ? (
              <>
                <ClockIcon className="size-3.5" /> {left.ms < 60_000 ? t.nextReady : t.nextIn(left.h, left.m)}
              </>
            ) : null}
          </p>
          {/* always in the page, so screen readers hear it the moment the new five are ready (not every minute) */}
          <p className="sr-only" aria-live="polite">
            {s?.done && left && left.ms < 60_000 ? t.nextReady : ""}
          </p>
        </div>
      </div>
    </ViewTransition>
  );
}
