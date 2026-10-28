"use client";

import { events } from "@/content/events";
import { eraByKey, eraIndex, eras, formatYear, PRESENT_MAP_YEAR } from "@/lib/eras";

type Props = {
  year: number;
  eraKey: string;
  onEra: (key: string) => void;
  onFocus: (lon: number, lat: number) => void;
  onClose: () => void;
};

const yearOf = (key: string) => {
  const e = eraByKey(key);
  return !e ? 0 : e.year === "present" ? PRESENT_MAP_YEAR : e.year;
};

/** After "go to year": which snapshot is on screen, and what changed between it and the year asked for. */
export function YearNote({ year, eraKey, onEra, onFocus, onClose }: Props) {
  const snap = eraByKey(eraKey);
  const snapYear = yearOf(eraKey);
  const exact = snapYear === year;
  const next = eras[eraIndex(eraKey) + 1];
  const since = events.filter((ev) => ev.taken > snapYear && ev.taken <= year).sort((a, b) => a.taken - b.taken);
  const asked = formatYear(year);

  return (
    <section aria-label={`Borders in ${asked}`} className="pointer-events-auto relative z-10 mb-2 rounded-2xl bg-white p-3 text-ink shadow-float sm:p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-bold">
            {exact ? (
              <>{asked} is one of our map snapshots.</>
            ) : eraKey === "present" ? (
              <>Showing today&apos;s borders for {asked}.</>
            ) : (
              <>
                Showing the {snap?.label} map for {asked}.
              </>
            )}
          </p>
          {!exact && eraKey !== "present" ? (
            <p className="text-xs text-muted">
              Our maps are 50–200 years apart in ancient times and 5–20 years apart after 1800. This is the closest one before {asked}.
            </p>
          ) : null}
        </div>
        <button type="button" onClick={onClose} aria-label="Close year note" className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-paper">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      {!exact && since.length ? (
        <div className="mt-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Changed between {snap?.label} and {asked} (not yet on this map)
          </p>
          <ul className="mt-1 max-h-28 space-y-1 overflow-y-auto pr-1">
            {since.slice(0, 8).map((ev) => (
              <li key={ev.id}>
                <button type="button" onClick={() => onFocus(ev.lon, ev.lat)} className="w-full rounded-md px-1.5 py-1 text-left text-sm hover:bg-paper">
                  <span className="mr-2 font-mono text-xs text-muted">{formatYear(ev.taken)}</span>
                  {ev.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {!exact && next ? (
        <button type="button" onClick={() => onEra(next.key)} className="mt-2 text-sm font-semibold text-link hover:underline">
          Next map: {next.label} →
        </button>
      ) : null}
    </section>
  );
}
