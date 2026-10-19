"use client";

import { useEffect, useState } from "react";
import { site } from "@/content/site";
import { yearLabel } from "@/lib/format";

interface Props {
  years: number[];
  year: number;
  onYear: (y: number) => void;
  showBorders: boolean;
  onBorders: (v: boolean) => void;
  compact?: boolean;
}

const TICKS: { y: number; minor?: boolean }[] = [
  { y: -1 },
  { y: 500, minor: true },
  { y: 1000 },
  { y: 1500, minor: true },
  { y: 1800 },
  { y: 1914, minor: true },
  { y: 2026 },
];

export function TimeDock({ years, year, onYear, showBorders, onBorders, compact = false }: Props) {
  const idx = Math.max(0, years.indexOf(year));
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => {
      if (idx >= years.length - 1) setPlaying(false);
      else onYear(years[idx + 1]);
    }, 1300);
    return () => window.clearTimeout(t);
  }, [playing, idx, years, onYear]);

  const step = (d: number) => {
    setPlaying(false);
    const n = Math.min(years.length - 1, Math.max(0, idx + d));
    onYear(years[n]);
  };

  const label = yearLabel(year);

  return (
    <div className="relative z-20 border-t border-paper-3 bg-paper text-ink">
      <div
        className={`mx-auto grid grid-cols-[1fr_auto] items-center gap-x-3 px-3 sm:flex sm:gap-5 sm:px-5 ${compact ? "py-1.5" : "py-2 sm:py-3"}`}
      >
        <div className="shrink-0 sm:w-[8.5rem]" aria-live="polite" aria-atomic="true">
          <span className="sr-only">Map year: </span>
          <span className={`year-numeral block ${compact ? "text-3xl" : "text-[2.1rem] sm:text-[3.1rem]"}`}>{label}</span>
        </div>

        <div className="flex shrink-0 items-center">
          <button type="button" className="icon-btn" aria-label={site.map.prevLabel} onClick={() => step(-1)} disabled={idx === 0}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            className="icon-btn bg-ink text-paper hover:bg-[#23404a]"
            aria-label={playing ? site.map.pauseLabel : site.map.playLabel}
            aria-pressed={playing}
            onClick={() => {
              if (!playing && idx >= years.length - 1) onYear(years[0]);
              setPlaying((p) => !p);
            }}
          >
            {playing ? (
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <rect x="3.5" y="3" width="3" height="10" rx="1" fill="currentColor" />
                <rect x="9.5" y="3" width="3" height="10" rx="1" fill="currentColor" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M5 3l8 5-8 5z" fill="currentColor" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={site.map.nextLabel}
            onClick={() => step(1)}
            disabled={idx === years.length - 1}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="relative col-span-2 min-w-0 flex-1 max-sm:-mt-1">
          <label htmlFor="timeline" className="sr-only">
            Timeline, from 1 BC to today
          </label>
          <input
            id="timeline"
            type="range"
            className="timeline-range"
            min={0}
            max={years.length - 1}
            step={1}
            value={idx}
            aria-valuetext={label}
            onChange={(e) => {
              setPlaying(false);
              onYear(years[Number(e.target.value)]);
            }}
          />
          <div className="pointer-events-none relative -mt-2 hidden h-4 text-[11px] text-ink-soft sm:block" aria-hidden="true">
            {TICKS.map((t) => {
              const i = years.indexOf(t.y);
              if (i === -1) return null;
              const pct = (i / (years.length - 1)) * 100;
              return (
                <span
                  key={t.y}
                  className={`absolute -translate-x-1/2 whitespace-nowrap ${t.minor ? "hidden xl:block" : ""}`}
                  style={{ left: `calc(13px + (100% - 26px) * ${pct / 100})` }}
                >
                  {yearLabel(t.y)}
                </span>
              );
            })}
          </div>
        </div>

        <label className="hidden shrink-0 cursor-pointer items-center gap-2 text-sm md:flex">
          <input
            type="checkbox"
            className="h-5 w-5 accent-[var(--ink)]"
            checked={showBorders}
            onChange={(e) => onBorders(e.target.checked)}
          />
          {site.map.bordersLabel}
        </label>
      </div>
    </div>
  );
}
