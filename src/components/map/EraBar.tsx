"use client";

import { useRef, useState } from "react";
import { eras, eraIndex, eraByKey, parseYear } from "@/lib/eras";
import { appCopy } from "@/content/site";

type Props = {
  era: string;
  loading: boolean;
  /** 1 playing forward, -1 playing back in time, 0 stopped */
  playing: 0 | 1 | -1;
  onEra: (key: string) => void;
  /** start playing in this direction, or pause if it's already playing that way */
  onTogglePlay: (dir: 1 | -1) => void;
  onChanges: () => void;
  changesOpen: boolean;
  /** jump to any typed year (shows the closest snapshot) */
  onYear: (year: number) => void;
};

/** The era label doubles as a "go to year" box: click it, type 1453 or 300 BC, press Enter. */
function YearBox({ label, loading, onYear }: { label?: string; loading: boolean; onYear: (y: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  if (!editing) {
    return (
      <p className="flex items-center gap-1.5 font-display text-lg leading-none sm:text-2xl" aria-live="polite">
        <button
          type="button"
          onClick={() => {
            setEditing(true);
            setError("");
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          aria-label={`${label}. Go to a specific year`}
          title="Go to a specific year"
          className="group flex items-center gap-1.5 rounded-md hover:text-accent"
        >
          {label}
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 text-panel-muted group-hover:text-accent" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="6" />
            <path d="m20 20-4.5-4.5" />
          </svg>
        </button>
        {loading ? <span className="font-sans text-xs font-normal text-panel-muted">loading…</span> : null}
      </p>
    );
  }
  return (
    <form
      className="relative flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        const y = parseYear(inputRef.current?.value ?? "");
        if (y === null) return setError("Try a year like 1453 or 300 BC");
        if (y < -2000) return setError("Our maps start in 2000 BCE");
        if (y > new Date().getFullYear()) return setError("That's in the future");
        setEditing(false);
        onYear(y);
      }}
    >
      <label htmlFor="year-input" className="sr-only">
        Go to year
      </label>
      <input
        id="year-input"
        ref={inputRef}
        inputMode="text"
        autoComplete="off"
        placeholder="e.g. 1453 or 300 BC"
        aria-invalid={!!error}
        aria-describedby={error ? "year-error" : undefined}
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
        onChange={() => error && setError("")}
        className="h-8 w-36 rounded-md bg-white px-2 font-sans text-sm text-ink placeholder:text-muted aria-invalid:ring-2 aria-invalid:ring-rose-400 sm:w-44"
      />
      <button type="submit" className="h-8 rounded-md bg-accent px-2.5 text-xs font-bold text-panel hover:bg-accent-strong">
        Go
      </button>
      <button type="button" onClick={() => setEditing(false)} aria-label="Cancel" className="h-8 px-1 text-xs text-panel-muted hover:text-white">
        ✕
      </button>
      {error ? (
        <span
          id="year-error"
          role="alert"
          className="absolute bottom-full left-0 mb-3 whitespace-nowrap rounded-md bg-rose-600 px-2 py-1 font-sans text-xs font-semibold text-white shadow-float"
        >
          {error}
        </span>
      ) : null}
    </form>
  );
}

function PauseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

export function EraBar({ era, loading, playing, onEra, onTogglePlay, onChanges, changesOpen, onYear }: Props) {
  const i = eraIndex(era);
  const meta = eraByKey(era);
  const go = (d: number) => {
    const n = Math.max(0, Math.min(eras.length - 1, i + d));
    onEra(eras[n].key);
  };
  return (
    <div className="pointer-events-auto rounded-2xl bg-panel/95 px-2.5 py-1.5 text-panel-text shadow-float backdrop-blur sm:px-4 sm:py-2">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => onTogglePlay(-1)}
          aria-label={playing === -1 ? "Pause timeline" : "Play timeline backward"}
          title={playing === -1 ? "Pause" : "Play back in time"}
          className={`grid size-8 shrink-0 place-items-center rounded-full sm:size-9 ${
            playing === -1 ? "bg-accent text-panel hover:bg-accent-strong" : "bg-white/10 hover:bg-white/15"
          }`}
        >
          {playing === -1 ? (
            <PauseIcon />
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="mr-0.5 size-4" fill="currentColor">
              <path d="M17 5v14L5 12z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={() => onTogglePlay(1)}
          aria-label={playing === 1 ? "Pause timeline" : "Play timeline"}
          title={playing === 1 ? "Pause" : "Play forward in time"}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-accent sm:size-10 text-panel hover:bg-accent-strong"
        >
          {playing === 1 ? (
            <PauseIcon />
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="ml-0.5 size-5" fill="currentColor">
              <path d="M7 5v14l12-7z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={i <= 0}
          aria-label="Previous era"
          className="hidden size-9 shrink-0 place-items-center rounded-lg hover:bg-white/10 disabled:opacity-30 sm:grid"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <YearBox label={meta?.label} loading={loading} onYear={onYear} />
            <span
              className={`hidden truncate rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline ${
                (meta?.precision ?? 1) >= 3 ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-200"
              }`}
            >
              {appCopy.precision[meta?.precision ?? 1]}
            </span>
          </div>
          <label className="sr-only" htmlFor="era-range">
            Era
          </label>
          <input
            id="era-range"
            className="era-range"
            type="range"
            min={0}
            max={eras.length - 1}
            step={1}
            value={i}
            aria-valuetext={meta?.label}
            onChange={(e) => onEra(eras[Number(e.target.value)].key)}
          />
          <div className="-mt-1 hidden justify-between text-[10px] text-panel-muted sm:flex">
            <span>{eras[0].label}</span>
            <span className="hidden sm:inline">1 CE</span>
            <span className="hidden sm:inline">1500</span>
            <span>{eras[eras.length - 1].label}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={i >= eras.length - 1}
          aria-label="Next era"
          className="hidden size-9 shrink-0 place-items-center rounded-lg hover:bg-white/10 disabled:opacity-30 sm:grid"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onChanges}
          aria-expanded={changesOpen}
          className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/15 sm:px-3 sm:py-2 sm:text-sm"
        >
          What changed?
        </button>
      </div>
    </div>
  );
}
