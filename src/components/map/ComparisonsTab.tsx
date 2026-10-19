"use client";

import Link from "next/link";
import { presetCategories, presets, type Preset } from "@/content/presets";

export function ComparisonsTab({ onPick, activeId }: { onPick: (p: Preset) => void; activeId: string | null }) {
  return (
    <div className="space-y-5">
      <Link
        href="/daily"
        className="block rounded-xl bg-accent p-3 text-panel transition hover:bg-accent-strong"
      >
        <span className="block text-sm font-bold">Daily challenge: which is bigger?</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-panel/80">5 new size puzzles every day. Keep your streak going →</span>
      </Link>
      {(Object.keys(presetCategories) as (keyof typeof presetCategories)[]).map((cat) => (
        <section key={cat} aria-labelledby={`cmp-${cat}`}>
          <h2 id={`cmp-${cat}`} className="font-display text-lg">
            {presetCategories[cat].title}
          </h2>
          <p className="text-xs text-panel-muted">{presetCategories[cat].blurb}</p>
          <ul className="mt-2 space-y-2">
            {presets
              .filter((p) => p.category === cat)
              .map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onPick(p)}
                    aria-current={activeId === p.id ? "true" : undefined}
                    className={`w-full rounded-xl p-3 text-left transition hover:bg-white/15 ${
                      cat === "controversial" ? "bg-rose-400/10 ring-1 ring-rose-300/25" : "bg-amber-300/10 ring-1 ring-amber-200/25"
                    } aria-[current=true]:ring-2 aria-[current=true]:ring-accent`}
                  >
                    <span className="block text-sm font-bold">{p.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-panel-muted">{p.hook}</span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
