"use client";

import { useEffect, useRef } from "react";
import { appCopy } from "@/content/site";
import { presetCategories, presets, type Preset } from "@/content/presets";

type Props = { onClose: () => void; onPreset: (p: Preset) => void };

const picks = {
  surprising: presets.filter((p) => p.category === "surprising").slice(0, 4),
  controversial: presets.filter((p) => p.category === "controversial").slice(0, 3),
};

export function IntroCard({ onClose, onPreset }: Props) {
  // the card sits over the map: keyboard and screen-reader users start in it, not 27 stops later behind it
  const ref = useRef<HTMLElement>(null);
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  return (
    <section ref={ref} tabIndex={-1} aria-labelledby="intro-title" className="max-h-[85dvh] overflow-y-auto rounded-2xl bg-card p-5 text-ink shadow-float outline-none">
      <h2 id="intro-title" className="font-display text-2xl leading-tight">
        {appCopy.introTitle}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{appCopy.introBody}</p>
      {(Object.keys(picks) as (keyof typeof picks)[]).map((cat) => (
        <div key={cat} className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{presetCategories[cat].title}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {picks[cat].map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onPreset(p)}
                  title={p.hook}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                    cat === "controversial"
                      ? "border-rose-200 bg-rose-50 hover:border-rose-400"
                      : "border-amber-200 bg-amber-50 hover:border-amber-400"
                  }`}
                >
                  {p.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <button type="button" onClick={onClose} className="mt-5 h-11 w-full rounded-lg bg-panel text-sm font-bold text-white hover:bg-panel-2">
        {appCopy.introCta}
      </button>
    </section>
  );
}
