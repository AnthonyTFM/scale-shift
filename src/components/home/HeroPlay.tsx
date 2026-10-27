"use client";

import { useEffect, useState, ViewTransition } from "react";
import Link from "next/link";
import { dayNumber, loadSave, localDateKey, stats } from "@/lib/daily";
import { challengeMessage } from "@/lib/challenge-friend";
import { useShareBox } from "@/components/site/ShareBox";
import { home } from "@/content/home";
import { ClockIcon, FlameIcon } from "@/components/site/Icons";

type State = { day: number; done: boolean; score?: number; streak: number };

/** Time until the player's next local midnight, as whole hours and minutes. */
function untilMidnight() {
  const now = new Date();
  const ms = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
  return { h: Math.floor(ms / 3_600_000), m: Math.floor((ms % 3_600_000) / 60_000), ms };
}

/** The hero's first card: today's game, your status and streak. Morphs into the game on /daily. */
export function HeroPlay() {
  const [s, setS] = useState<State | null>(null);
  const [left, setLeft] = useState<ReturnType<typeof untilMidnight> | null>(null);
  const { share: open, box } = useShareBox();
  const t = home.hub;

  useEffect(() => {
    const read = () => {
      const today = localDateKey();
      const save = loadSave();
      const rec = save.days[today];
      setS({ day: dayNumber(today), done: typeof rec?.s === "number", score: rec?.s, streak: stats(save, today).streak });
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

  const share = () => open(challengeMessage(s?.score ?? 0), "home");

  return (
    <ViewTransition name="daily-card" share="morph" default="none">
      <div className="flex flex-col rounded-card bg-card p-5 text-ink shadow-float ring-1 ring-line md:px-6 md:py-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">{t.playEyebrow}</p>
          {s ? (
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              <span className="hidden sm:inline">{t.playDay} </span>#{s.day}
            </p>
          ) : null}
          {s?.streak ? (
            <p className="ml-auto inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-xs font-bold ring-1 ring-line">
              <FlameIcon className="size-4" /> {s.streak}-day streak
            </p>
          ) : null}
        </div>
        <h2 className="mt-2 font-display text-3xl leading-tight md:text-4xl">
          <Link href="/daily" transitionTypes={["to-daily"]} className="hover:underline">
            {t.playTitle}
          </Link>
        </h2>
        <p className="mt-1 max-w-md text-muted">{s?.done ? t.playDone(s.score ?? 0) : t.playLead}</p>
        {/* at the foot of the card, level with the endless card's button beside it */}
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
          <Link
            href="/daily"
            transitionTypes={["to-daily"]}
            className="btn btn-primary btn-lg group"
          >
            {s?.done ? t.playDoneCta : t.playCta}
            <span aria-hidden="true" className="transition group-hover:translate-x-1">
              →
            </span>
          </Link>
          {s?.done ? (
            <button
              type="button"
              onClick={share}
              className="btn btn-red"
            >
              {t.challengeCta}
            </button>
          ) : null}
          {s?.done && left ? (
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted" aria-live="polite">
              <ClockIcon className="size-4" /> {left.ms < 60_000 ? t.nextReady : t.nextIn(left.h, left.m)}
            </p>
          ) : null}
        </div>
        {box}
      </div>
    </ViewTransition>
  );
}
