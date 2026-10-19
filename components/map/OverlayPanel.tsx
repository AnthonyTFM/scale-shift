"use client";

import Link from "next/link";
import { useState } from "react";
import { site } from "@/content/site";
import { featuredIds } from "@/content/featured";
import { lineage } from "@/content/lineage";
import {
  KIND_LABEL,
  PRECISION_LABEL,
  formatKm2,
  formatMi2,
  formatPopulation,
  nearestYear,
  spanLabel,
  yearLabel,
  yearsOf,
} from "@/lib/format";
import type { Entity, Overlay } from "@/lib/types";
import type { ResolvedOverlay } from "./MapCanvas";
import { AreaChart } from "./AreaChart";

interface Props {
  items: ResolvedOverlay[];
  selectedUid: string | null;
  entityById: Map<string, Entity>;
  years: number[];
  sliderYear: number;
  showBorders: boolean;
  onBorders: (v: boolean) => void;
  onSelect: (uid: string | null) => void;
  onUpdate: (uid: string, patch: Partial<Overlay>) => void;
  onRemove: (uid: string) => void;
  onClear: () => void;
  onYear: (y: number) => void;
  onAdd: (id: string) => void;
}

const swatch = (i: number) => `var(--pigment-${i % 8})`;

export function OverlayPanel(props: Props) {
  const { items, selectedUid, entityById, years, sliderYear, showBorders, onBorders, onSelect, onUpdate, onRemove, onClear, onYear, onAdd } =
    props;
  const [expanded, setExpanded] = useState(false);
  const selected = items.find((r) => r.overlay.uid === selectedUid) ?? null;
  const today = years[years.length - 1];

  return (
    <aside
      aria-label={site.map.panelTitle}
      className={`pointer-events-auto z-30 flex flex-col bg-paper text-ink shadow-[0_10px_30px_rgba(0,0,0,0.3)]
        max-md:absolute max-md:inset-x-0 max-md:bottom-0 max-md:rounded-t-2xl ${expanded ? "max-md:max-h-[62%]" : "max-md:max-h-[148px]"}
        md:absolute md:left-3 md:top-3 md:max-h-[calc(100%-1.5rem)] md:w-[340px] md:rounded-2xl`}
    >
      <div className="flex items-center justify-between gap-1 pb-1 pl-4 pr-2 pt-2 md:pt-3">
        <h2 className="font-display whitespace-nowrap text-xl">
          {site.map.panelTitle}
          {items.length ? <span className="ml-2 font-sans text-sm text-ink-soft">{items.length}</span> : null}
        </h2>
        <div className="flex items-center gap-1">
          <label className="flex cursor-pointer items-center gap-1.5 text-sm md:hidden">
            <input type="checkbox" className="h-4 w-4 accent-[var(--ink)]" checked={showBorders} onChange={(e) => onBorders(e.target.checked)} />
            Borders
          </label>
          {items.length > 0 && (
            <button type="button" className="whitespace-nowrap rounded-full px-2 py-2 text-sm text-ink-soft hover:text-ink" onClick={onClear}>
              {site.map.clearAll}
            </button>
          )}
          <button
            type="button"
            className="icon-btn md:hidden"
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse panel" : "Expand panel"}
            onClick={() => setExpanded((v) => !v)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className={expanded ? "rotate-180" : ""}>
              <path d="M3 10l5-5 5 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-4">
        {items.length === 0 ? (
          <p className="py-2 text-sm text-ink-soft">{site.map.panelEmpty}</p>
        ) : (
          <ul className="flex gap-2 overflow-x-auto pb-1 max-md:flex-nowrap md:flex-col md:gap-0.5" aria-label="Shapes on the map">
            {items.map((r) => {
              const isSel = r.overlay.uid === selectedUid;
              return (
                <li key={r.overlay.uid} className="shrink-0 md:shrink">
                  <div className={`flex items-center gap-1 rounded-xl pr-1 ${isSel ? "bg-paper-2" : ""}`}>
                    <button
                      type="button"
                      className="grid h-11 w-9 shrink-0 place-items-center"
                      aria-label={`Change colour of ${r.entity?.n ?? r.overlay.id}`}
                      onClick={() => onUpdate(r.overlay.uid, { color: (r.overlay.color + 1) % 8 })}
                    >
                      <span className="block h-4 w-4 rounded-[5px] border-2 border-ink/20" style={{ background: swatch(r.overlay.color) }} />
                    </button>
                    <button
                      type="button"
                      className="min-w-0 flex-1 py-1.5 text-left"
                      aria-pressed={isSel}
                      onClick={() => {
                        onSelect(isSel ? null : r.overlay.uid);
                        setExpanded(true);
                      }}
                    >
                      <span className="block max-w-[11rem] truncate font-bold leading-tight md:max-w-none">{r.entity?.n ?? r.overlay.id}</span>
                      <span className="block text-xs text-ink-soft">
                        {yearLabel(r.overlay.year)}
                        {r.area !== undefined ? `, ${formatKm2(r.area)}` : ""}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="icon-btn h-9 w-9 shrink-0 text-ink-soft hover:text-ink"
                      aria-label={`Remove ${r.entity?.n ?? r.overlay.id}`}
                      onClick={() => onRemove(r.overlay.uid)}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                        <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {selected?.entity && (
          <Details
            r={selected}
            entity={selected.entity}
            entityById={entityById}
            years={years}
            sliderYear={sliderYear}
            today={today}
            onUpdate={onUpdate}
            onYear={onYear}
            onAdd={onAdd}
          />
        )}
      </div>
    </aside>
  );
}

function Details({
  r,
  entity,
  entityById,
  years,
  sliderYear,
  today,
  onUpdate,
  onYear,
  onAdd,
}: {
  r: ResolvedOverlay;
  entity: Entity;
  entityById: Map<string, Entity>;
  years: number[];
  sliderYear: number;
  today: number;
  onUpdate: (uid: string, patch: Partial<Overlay>) => void;
  onYear: (y: number) => void;
  onAdd: (id: string) => void;
}) {
  const o = r.overlay;
  const realmId = entity.k === "r" ? entity.i.replace(/-claims$/, "") : `${entity.i}-claims`;
  const realm = entityById.get(realmId);
  const before = (lineage[entity.i] ?? []).map((id) => entityById.get(id)).filter(Boolean) as Entity[];
  const mappedYears = yearsOf(entity, years);

  return (
    <section className="mt-3 border-t border-paper-3 pt-3" aria-label={`Details for ${entity.n}`}>
      <h3 className="font-display text-2xl leading-tight">{entity.n}</h3>
      <p className="text-sm text-ink-soft">{entity.k === "s" && entity.st ? entity.st : KIND_LABEL[entity.k]}</p>

      {r.missing && (
        <div className="mt-3 rounded-xl bg-paper-2 p-3 text-sm">
          <p>
            Not on the {yearLabel(sliderYear)} map. Showing its {yearLabel(o.year)} borders.
          </p>
          <button type="button" className="mt-2 font-bold underline underline-offset-4" onClick={() => onYear(o.year)}>
            Go to {yearLabel(o.year)}
          </button>
        </div>
      )}

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-ink-soft">True area</dt>
        <dd>
          {r.area !== undefined ? (
            <>
              {formatKm2(r.area)}
              <br />
              <span className="text-ink-soft">{formatMi2(r.area)}</span>
            </>
          ) : (
            "Unknown"
          )}
        </dd>
        {entity.p && o.year === today ? (
          <>
            <dt className="text-ink-soft">Population</dt>
            <dd>
              {formatPopulation(entity.p)}
              {entity.py ? <span className="text-ink-soft"> ({entity.py} estimate)</span> : null}
            </dd>
          </>
        ) : null}
        <dt className="text-ink-soft">Mapped</dt>
        <dd>
          {mappedYears.length} snapshot{mappedYears.length === 1 ? "" : "s"}, {spanLabel(entity, years)}
        </dd>
        <dt className="text-ink-soft">Borders</dt>
        <dd>{PRECISION_LABEL[entity.q] ?? PRECISION_LABEL[1]}</dd>
      </dl>

      {mappedYears.length > 1 && (
        <div className="mt-3">
          <AreaChart entity={entity} years={years} current={o.year} color={`var(--pigment-${o.color % 8})`} width={300} height={110} />
        </div>
      )}

      <div className="mt-3 grid gap-3 text-sm">
        {mappedYears.length > 1 && (
          <label className="grid gap-1">
            <span className="text-ink-soft">Show its borders from</span>
            <select
              className="field"
              value={o.year}
              onChange={(e) => {
                const y = Number(e.target.value);
                onUpdate(o.uid, { year: y, follow: y === sliderYear });
              }}
            >
              {mappedYears.map((y) => (
                <option key={y} value={y}>
                  {yearLabel(y)}
                </option>
              ))}
            </select>
          </label>
        )}

        {mappedYears.length > 1 && (
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--ink)]"
              checked={o.follow}
              onChange={(e) => onUpdate(o.uid, { follow: e.target.checked })}
            />
            <span>Change with the timeline</span>
          </label>
        )}

        {realm && (
          <button
            type="button"
            className="btn btn-ghost w-full"
            onClick={() => onUpdate(o.uid, { id: realm.i, year: nearestYear(realm, years, o.year) })}
          >
            {entity.k === "r" ? "Show the core territory only" : "Show everything it claimed"}
          </button>
        )}

        <label className="grid gap-1">
          <span className="flex justify-between text-ink-soft">
            <span>Rotate</span>
            <span>{Math.round(o.rot)}°</span>
          </span>
          <input
            type="range"
            className="small-range"
            min={-180}
            max={180}
            step={1}
            value={o.rot}
            aria-valuetext={`${Math.round(o.rot)} degrees`}
            onChange={(e) => onUpdate(o.uid, { rot: Number(e.target.value) })}
          />
        </label>

        {(o.pos || o.rot) && (
          <button type="button" className="btn btn-ghost w-full" onClick={() => onUpdate(o.uid, { pos: null, rot: 0 })}>
            Put it back where it belongs
          </button>
        )}

        {before.length > 0 && (
          <div>
            <p className="text-ink-soft">Came before</p>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {before.map((b) => (
                <li key={b.i}>
                  <button type="button" className="rounded-full bg-paper-2 px-3 py-1.5 hover:bg-paper-3" onClick={() => onAdd(b.i)}>
                    {b.n}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {featuredIds.includes(entity.i) && (
          <Link href={`/history/${entity.i}`} className="font-bold underline underline-offset-4">
            Read the {entity.n} timeline
          </Link>
        )}
      </div>
    </section>
  );
}
