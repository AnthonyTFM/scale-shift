"use client";

import { useEffect, useState, ViewTransition } from "react";
import Link from "next/link";
import { dayNumber, loadSave, localDateKey, stats } from "@/lib/daily";
import { home } from "@/content/home";

type State = { day: number; done: boolean; score?: number; streak: number };

/** The hero's first card: today's game, your status and streak. Morphs into the game on /daily. */
export function HeroPlay() {
  const [s, setS] = useState<State | null>(null);
  const t = home.hub;

  useEffect(() => {
    const read = () => {
      const today = localDateKey();
      const save = loadSave();
      const rec = save.days[today];
      setS({ day: dayNumber(today), done: typeof rec?.s === "number", score: rec?.s, streak: stats(save, today).streak });
    };
    read();
    window.addEventListener("focus", read);
    return () => window.removeEventListener("focus", read);
  }, []);

  return (
    <Link href="/daily" transitionTypes={["to-daily"]} className="group block">
      <ViewTransition name="daily-card" share="morph" default="none">
        <div className="rounded-card bg-accent p-5 text-panel shadow-float ring-1 ring-amber-200/60 transition group-hover:-translate-y-0.5 group-hover:bg-accent-strong md:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <p className="rounded-full bg-panel px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-accent">{t.playEyebrow}</p>
            {s ? <p className="text-xs font-bold uppercase tracking-wide">Daily challenge #{s.day}</p> : null}
            {s?.streak ? <p className="rounded-full bg-white/60 px-2.5 py-1 text-xs font-bold">🔥 {s.streak}-day streak</p> : null}
          </div>
          <h2 className="mt-3 font-display text-4xl leading-tight md:text-5xl">{t.playTitle}</h2>
          <p className="mt-2 max-w-md text-panel/80">{s?.done ? t.playDone(s.score ?? 0) : t.playLead}</p>
          <span className="mt-5 inline-flex h-12 items-center gap-2 rounded-lg bg-panel px-6 font-bold text-white shadow-sm">
            {s?.done ? t.playDoneCta : t.playCta}
            <span aria-hidden="true" className="transition group-hover:translate-x-1">
              →
            </span>
          </span>
        </div>
      </ViewTransition>
    </Link>
  );
}
