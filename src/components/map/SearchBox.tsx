"use client";

import { useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { IndexRow } from "@/lib/data";
import { eraByKey, eraIndex } from "@/lib/eras";
import { formatArea, type AreaUnit } from "@/lib/format";
import { appCopy } from "@/content/site";
import { eraKeyOfYear } from "./era-keys";

export type SearchPick = { name: string; era: string; us: boolean };

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const ALIASES: Record<string, string> = {
  usa: "United States",
  us: "United States",
  america: "United States",
  uk: "United Kingdom",
  britain: "United Kingdom",
  "great britain": "United Kingdom",
  england: "United Kingdom",
  drc: "DR Congo",
  congo: "DR Congo",
  "soviet union": "USSR",
  ussr: "USSR",
  rome: "Roman Empire",
  turkey: "Türkiye",
  holland: "Netherlands",
  persia: "Persia",
  "lower 48": "Contiguous United States",
  contiguous: "Contiguous United States",
};

type Props = {
  index: IndexRow[] | null;
  onNeedIndex: () => void;
  currentEra: string;
  unit: AreaUnit;
  onPick: (pick: SearchPick) => void;
};

function rangeLabel(row: IndexRow) {
  const first = eraByKey(eraKeyOfYear(row.y[0]))?.label ?? "";
  const last = eraByKey(eraKeyOfYear(row.y[row.y.length - 1]))?.label ?? "";
  return first === last ? first : `${first} – ${last}`;
}

/** Era to use when a name is picked: the current era if it exists there, otherwise the closest one. */
export function bestEraFor(row: IndexRow, currentEra: string) {
  if (row.us) return "us";
  const keys = row.y.map(eraKeyOfYear);
  if (keys.includes(currentEra)) return currentEra;
  const ci = eraIndex(currentEra);
  return keys.reduce((best, k) => (Math.abs(eraIndex(k) - ci) < Math.abs(eraIndex(best) - ci) ? k : best), keys[0]);
}

export function SearchBox({ index, onNeedIndex, currentEra, unit, onPick }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const query = norm(q.trim());
    if (!index || query.length < 2) return [];
    const alias = ALIASES[query];
    const scored: { row: IndexRow; score: number }[] = [];
    for (const row of index) {
      const n = norm(row.n);
      let score = -1;
      if (alias && row.n === alias) score = 0;
      else if (n === query) score = 1;
      else if (n.startsWith(query)) score = 2;
      else if (n.split(/[\s(-]+/).some((w) => w.startsWith(query))) score = 3;
      else if (n.includes(query)) score = 4;
      if (score < 0) continue;
      const keys = row.y.map(eraKeyOfYear);
      if (keys.includes(currentEra)) score -= 0.5;
      if (row.y.length > 3) score -= 0.2;
      scored.push({ row, score });
    }
    return scored
      .sort((a, b) => a.score - b.score || b.row.a[b.row.a.length - 1] - a.row.a[a.row.a.length - 1])
      .slice(0, 8)
      .map((s) => s.row);
  }, [q, index, currentEra]);

  const pick = (row: IndexRow) => {
    onPick({ name: row.n, era: bestEraFor(row, currentEra), us: !!row.us });
    setQ("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      if (results[active]) {
        e.preventDefault();
        pick(results[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && q.trim().length >= 2;

  return (
    <div className="relative">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search countries, empires and US states
      </label>
      <div className="flex items-center gap-2 rounded-lg border-2 border-transparent bg-white px-3 focus-within:border-focus">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={inputRef}
          id={`${listId}-input`}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder={appCopy.searchPlaceholder}
          value={q}
          onFocus={() => {
            onNeedIndex();
            setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className="h-10 w-full bg-transparent sm:h-11 text-[15px] text-ink placeholder:text-slate-500 focus:outline-none"
        />
      </div>
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-auto rounded-lg bg-white py-1 text-ink shadow-float"
        >
          {!index ? <li className="px-3 py-2 text-sm text-muted">Loading names…</li> : null}
          {index && results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">
              No match for “{q}”.{" "}
              <Link className="font-semibold text-link underline" href={`/contact?topic=missing&region=${encodeURIComponent(q)}`}>
                Suggest it
              </Link>
            </li>
          ) : null}
          {results.map((row, i) => (
            <li
              key={`${row.n}-${row.us ? "us" : ""}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(row)}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${i === active ? "bg-slate-100" : ""}`}
            >
              {row.f ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/flags/${row.f}.svg`} alt="" width={24} height={16} className="h-4 w-6 rounded-sm object-cover ring-1 ring-black/10" />
              ) : (
                <span aria-hidden="true" className="h-4 w-6 rounded-sm bg-slate-200" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{row.n}</span>
                <span className="block truncate text-xs text-muted">
                  {row.us ? "US state" : rangeLabel(row)} · {formatArea(row.a[row.a.length - 1], unit)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
