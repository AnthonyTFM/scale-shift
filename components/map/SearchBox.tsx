"use client";

import { useId, useMemo, useRef, useState } from "react";
import { site } from "@/content/site";
import { KIND_SHORT, slugify, spanLabel, yearLabel } from "@/lib/format";
import type { Entity } from "@/lib/types";

interface Props {
  entities: Entity[];
  years: number[];
  sliderYear: number;
  onPick: (e: Entity) => void;
}

interface Hit {
  e: Entity;
  score: number;
}

const prepared = new WeakMap<Entity[], { e: Entity; key: string }[]>();
function keysFor(entities: Entity[]) {
  let k = prepared.get(entities);
  if (!k) {
    k = entities.map((e) => ({ e, key: slugify([e.n, ...(e.al ?? [])].join(" ")) }));
    prepared.set(entities, k);
  }
  return k;
}

export function SearchBox({ entities, years, sliderYear, onPick }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const sliderIdx = years.indexOf(sliderYear);

  const hits = useMemo<Hit[]>(() => {
    const needle = slugify(q);
    if (!needle) return [];
    const out: Hit[] = [];
    for (const { e, key } of keysFor(entities)) {
      const pos = key.indexOf(needle);
      if (pos === -1) continue;
      let score = pos === 0 ? 0 : key.includes(` ${needle}`) ? 1 : 2;
      if (!e.y.includes(sliderIdx)) score += 0.5; // prefer things on the current map
      if (e.k === "s") score += 0.3;
      score -= Math.min(0.4, Math.log10(Math.max(...e.a) + 1) / 20); // bigger first among equals
      out.push({ e, score });
    }
    out.sort((a, b) => a.score - b.score || a.e.n.localeCompare(b.e.n));
    return out.slice(0, 8);
  }, [q, entities, sliderIdx]);

  const choose = (e: Entity) => {
    onPick(e);
    setQ("");
    setOpen(false);
    setActive(0);
  };

  const showList = open && q.trim().length > 0;

  return (
    <div className="relative w-full">
      <label htmlFor={`${listId}-input`} className="sr-only">
        {site.map.searchLabel}
      </label>
      <div className="flex h-11 items-center rounded-full bg-paper pl-4 pr-2 shadow-sm ring-1 ring-paper-3 focus-within:ring-2 focus-within:ring-ink">
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0 text-ink-soft">
          <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M12 12l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          id={`${listId}-input`}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && hits[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder={site.map.searchPlaceholder}
          className="h-full w-full min-w-0 bg-transparent px-2 text-base text-ink placeholder:text-ink-soft focus:outline-none"
          value={q}
          onChange={(ev) => {
            setQ(ev.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(ev) => {
            if (ev.key === "ArrowDown") {
              ev.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, Math.max(0, hits.length - 1)));
            } else if (ev.key === "ArrowUp") {
              ev.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (ev.key === "Enter") {
              if (hits[active]) {
                ev.preventDefault();
                choose(hits[active].e);
              }
            } else if (ev.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </div>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching places"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-[60vh] overflow-auto rounded-2xl bg-paper py-1 text-ink shadow-[0_12px_32px_rgba(0,0,0,0.3)] ring-1 ring-paper-3"
        >
          {hits.length === 0 ? (
            <li className="px-4 py-3 text-sm text-ink-soft" role="option" aria-selected={false} aria-disabled="true">
              {site.map.searchEmpty}
            </li>
          ) : (
            hits.map(({ e }, i) => {
              const onMap = e.y.includes(sliderIdx);
              return (
                <li
                  key={e.i}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={`flex cursor-pointer items-baseline justify-between gap-3 px-4 py-2.5 ${i === active ? "bg-paper-2" : ""}`}
                  onMouseDown={(ev) => ev.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(e)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{e.n}</span>
                    <span className="block text-sm text-ink-soft">
                      {onMap ? `On the ${yearLabel(sliderYear)} map` : spanLabel(e, years)}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-paper-2 px-2 py-0.5 text-xs text-ink-soft">{KIND_SHORT[e.k]}</span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
