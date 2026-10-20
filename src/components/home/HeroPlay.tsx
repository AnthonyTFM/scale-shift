"use client";

import { useEffect, useState, ViewTransition } from "react";
import Link from "next/link";
import { dayNumber, loadSave, localDateKey, stats } from "@/lib/daily";
import { challengeFriend } from "@/lib/challenge-friend";
import { home } from "@/content/home";

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
  const [note, setNote] = useState("");
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

  const share = async () => {
    const r = await challengeFriend(s?.score ?? 0);
    setNote(r === null ? "" : r === "copied" ? t.challengeCopied : r);
  };

  return (
    <ViewTransition name="daily-card" share="morph" default="none">
      <div className="rounded-card bg-accent p-5 text-panel shadow-float ring-1 ring-amber-200/60 md:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <p className="rounded-full bg-panel px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-accent">{t.playEyebrow}</p>
          {s ? <p className="text-xs font-bold uppercase tracking-wide">Daily challenge #{s.day}</p> : null}
          {s?.streak ? <p className="rounded-full bg-white/60 px-2.5 py-1 text-xs font-bold">🔥 {s.streak}-day streak</p> : null}
        </div>
        <h2 className="mt-3 font-display text-4xl leading-tight md:text-5xl">
          <Link href="/daily" transitionTypes={["to-daily"]} className="hover:underline">
            {t.playTitle}
          </Link>
        </h2>
        <p className="mt-2 max-w-md text-panel/80">{s?.done ? t.playDone(s.score ?? 0) : t.playLead}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/daily"
            transitionTypes={["to-daily"]}
            className="group inline-flex h-12 items-center gap-2 rounded-lg bg-panel px-6 font-bold text-white shadow-sm hover:bg-panel-2"
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
              className="inline-flex h-12 items-center rounded-lg bg-white/70 px-5 font-bold text-panel ring-1 ring-panel/10 hover:bg-white"
            >
              {t.challengeCta}
            </button>
          ) : null}
        </div>
        {s?.done && left ? (
          <p className="mt-3 text-sm font-semibold text-panel/80" aria-live="polite">
            ⏳ {left.ms < 60_000 ? t.nextReady : t.nextIn(left.h, left.m)}
          </p>
        ) : null}
        {note ? (
          <p role="status" className="mt-2 break-words text-sm font-semibold">
            {note}
          </p>
        ) : null}
      </div>
    </ViewTransition>
  );
}
