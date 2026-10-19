"use client";

import { useState, useSyncExternalStore } from "react";
import { site } from "@/content/site";
import { track } from "@/lib/analytics";

const KEY = "scale-shift:coach-done";

/** Three-step first-visit guide. Remembers completion per browser when storage is available. */
function readDone(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
const noopSubscribe = () => () => {};

export function Coach() {
  // The guide is part of the server HTML so it paints immediately. For returning visitors an inline
  // script hides it before the first paint, and React removes it after hydration.
  const done = useSyncExternalStore(noopSubscribe, readDone, () => false);
  const [step, setStep] = useState<number | null>(0);

  const finish = (completed: boolean) => {
    setStep(null);
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      // storage blocked: the guide simply shows again next visit
    }
    track(completed ? "coachmark_completed" : "coachmark_skipped");
  };

  if (done || step === null) return null;
  const item = site.coach[step];
  const last = step === site.coach.length - 1;

  return (
    <>
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: `try{if(localStorage.getItem(${JSON.stringify(KEY)})==="1")document.documentElement.dataset.coachDone="1"}catch(e){}`,
      }}
    />
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="coach-title"
      className="coach-card pointer-events-auto absolute right-3 z-40 w-[min(320px,calc(100%-1.5rem))] rounded-2xl bg-ink p-4 text-paper shadow-[0_12px_32px_rgba(0,0,0,0.4)] max-md:top-3 md:bottom-4"
    >
      <p className="text-xs text-paper/70">
        Step {step + 1} of {site.coach.length}
      </p>
      <h2 id="coach-title" className="font-display mt-0.5 text-2xl">
        {item.title}
      </h2>
      <p className="mt-1 text-sm text-paper/90">{item.body}</p>
      <div className="mt-3 flex items-center justify-between">
        <button type="button" className="rounded-full px-2 py-2 text-sm text-paper/75 hover:text-paper" onClick={() => finish(false)}>
          {site.coachSkip}
        </button>
        <button type="button" className="btn btn-accent" onClick={() => (last ? finish(true) : setStep(step + 1))} autoFocus>
          {last ? site.coachDone : site.coachNext}
        </button>
      </div>
    </div>
    </>
  );
}
