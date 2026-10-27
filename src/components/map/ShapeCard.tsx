"use client";

import { useMemo, useState } from "react";
import { appCopy } from "@/content/site";
import { eventsForPolity, eraByKey, formatYear } from "@/lib/eras";
import { compactNumber, formatArea, type AreaUnit } from "@/lib/format";
import { placeGeometry, webMapArea } from "@/lib/geo";
import { TakenFormalized } from "@/components/EventCard";
import { DataNote } from "./InfoSheet";
import { PALETTE, type Overlay } from "./engine";
import { PALETTE_NAMES } from "@/lib/palette";
import { lineageFor, type OverlayStep } from "./overlays";

type Props = {
  overlay: Overlay;
  steps: OverlayStep[] | null;
  unit: AreaUnit;
  onRemove: () => void;
  onColor: (c: number) => void;
  onStep: (step: OverlayStep) => void;
  onReset: () => void;
  onZoom: () => void;
};

export function ShapeCard({ overlay: o, steps, unit, onRemove, onColor, onStep, onReset, onZoom }: Props) {
  const [colorOpen, setColorOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const era = o.era === "us" ? null : eraByKey(o.era);
  const idx = steps ? steps.findIndex((s) => s.era === o.era) : -1;
  const prev = steps && idx > 0 ? steps[idx - 1] : null;
  const next = steps && idx >= 0 && idx < steps.length - 1 ? steps[idx + 1] : null;
  const history = eventsForPolity(lineageFor(o.name));
  // how much bigger or smaller the shape is drawn here than at home: the ratio of the two web-map areas, over the whole
  // shape (moving it along the map changes nothing, so it only counts once moved)
  const looks = useMemo(() => {
    if (!o.moved) return 1;
    const g = o.whole ?? o.geom; // Antarctica: the whole shape, as the map draws it once moved
    const home = webMapArea(g);
    return home ? webMapArea(placeGeometry(g, o.origin, [o.lon, o.lat], o.rot)) / home : 1;
  }, [o.moved, o.whole, o.geom, o.origin, o.lon, o.lat, o.rot]);

  return (
    <section aria-label={`${o.name} details`} className="rounded-xl bg-panel-2 p-4 text-panel-text">
      <div className="flex items-start gap-3">
        {o.props.f ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/flags/${o.props.f}.svg`} alt="" width={36} height={24} className="mt-1 h-6 w-9 rounded-sm object-cover ring-1 ring-white/20" />
        ) : (
          <span aria-hidden="true" className="mt-1 size-6 shrink-0 rounded-full" style={{ background: PALETTE[o.color % PALETTE.length] }} />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl leading-tight">{o.name}</h2>
          <p className="text-xs text-panel-muted">
            {o.era === "us" ? "US state · present day" : `Borders as of ${era?.label}`}
            {o.props.s ? ` · ruled by ${o.props.s}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${o.name}`}
          className="grid size-9 place-items-center rounded-lg text-panel-muted hover:bg-white/10 hover:text-white"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
          </svg>
        </button>
        <div className="relative">
          <button
            type="button"
            aria-label="Change color"
            aria-expanded={colorOpen}
            onClick={() => setColorOpen((v) => !v)}
            className="flex h-9 items-center gap-1 rounded-lg bg-white/10 px-2 hover:bg-white/15"
          >
            <span className="size-5 rounded-full ring-2 ring-white/40" style={{ background: PALETTE[o.color % PALETTE.length] }} />
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {colorOpen ? (
            <div className="absolute right-0 top-full z-20 mt-1 grid w-max grid-cols-4 gap-2 rounded-lg bg-white p-2 shadow-float">
              {PALETTE.map((c, i) => (
                <button
                  key={c}
                  type="button"
                  aria-label={PALETTE_NAMES[i] ?? `Color ${i + 1}`}
                  aria-pressed={i === o.color % PALETTE.length}
                  onClick={() => {
                    onColor(i);
                    setColorOpen(false);
                  }}
                  className="size-7 rounded-full ring-offset-2 aria-pressed:ring-2 aria-pressed:ring-slate-900"
                  style={{ background: c }}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-b border-white/10 pb-3 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-panel-muted">Real area</dt>
          <dd className="text-lg font-bold">≈ {formatArea(o.km2, unit)}</dd>
        </div>
        {o.props.pop ? (
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-panel-muted">Population ({o.props.py})</dt>
            <dd className="text-lg font-bold">{compactNumber(o.props.pop)}</dd>
          </div>
        ) : o.props.e ? (
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-panel-muted">Incl. subject lands</dt>
            <dd className="text-lg font-bold">≈ {formatArea(o.props.e, unit)}</dd>
          </div>
        ) : null}
        <div className="col-span-2 text-xs text-panel-muted">
          {appCopy.precision[o.props.b] ?? appCopy.precision[1]}
          {o.hiddenParts ? ` · ${o.hiddenParts} far-off part${o.hiddenParts > 1 ? "s" : ""} hidden (full area ${formatArea(o.props.a, unit)})` : ""}
          {o.moved && Math.abs(looks - 1) > 0.05
            ? ` · drawn ${looks > 1 ? `${looks.toFixed(1)}× bigger` : `${(1 / looks).toFixed(1)}× smaller`} than at home`
            : ""}
        </div>
      </dl>

      {o.props.w ? (
        <div className="mt-3">
          <DataNote text={o.props.w} />
        </div>
      ) : null}

      {steps && steps.length > 1 ? (
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg">{era?.label}</p>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={!prev}
                onClick={() => prev && onStep(prev)}
                aria-label={prev ? `Earlier: ${eraByKey(prev.era)?.label}` : "No earlier borders"}
                className="grid size-9 place-items-center rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-30"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m15 6-6 6 6 6" />
                </svg>
              </button>
              <button
                type="button"
                disabled={!next}
                onClick={() => next && onStep(next)}
                aria-label={next ? `Later: ${eraByKey(next.era)?.label}` : "No later borders"}
                className="grid size-9 place-items-center rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-30"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>
          <div className="relative mt-2 h-5" role="group" aria-label={`${steps.length} snapshots of ${o.name}`}>
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
            {steps.map((s, i) => (
              <button
                key={s.era}
                type="button"
                onClick={() => onStep(s)}
                aria-label={`${eraByKey(s.era)?.label}: ${s.name}`}
                title={`${eraByKey(s.era)?.label}: ${s.name}`}
                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                  s.era === o.era ? "h-4 w-1.5 bg-accent" : "h-2.5 w-1 bg-panel-muted hover:bg-white"
                }`}
                style={{ left: `${(i / (steps.length - 1)) * 100}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-panel-muted">
            <span>{eraByKey(steps[0].era)?.label}</span>
            <span>{eraByKey(steps[steps.length - 1].era)?.label}</span>
          </div>
          <p className="mt-1 text-xs text-panel-muted">
            Step through every snapshot of {lineageFor(o.name).length > 1 ? "this state and its other names" : "this state"}.
          </p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button type="button" onClick={onZoom} className="rounded-lg bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/15">
          Zoom to it
        </button>
        {o.moved ? (
          <button type="button" onClick={onReset} className="rounded-lg bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/15">
            Send home
          </button>
        ) : null}
        {history.length ? (
          <button
            type="button"
            aria-expanded={historyOpen}
            onClick={() => setHistoryOpen((v) => !v)}
            className="rounded-lg bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/15"
          >
            {historyOpen ? "Hide" : "Show"} land changes ({history.length})
          </button>
        ) : null}
      </div>

      {historyOpen ? (
        <ol className="mt-3 space-y-3">
          {history.map((ev) => (
            <li key={ev.id} className="rounded-lg bg-black/20 p-3">
              <p className="text-sm font-semibold">
                {formatYear(ev.taken, ev.approx)} · {ev.title}
              </p>
              <TakenFormalized ev={ev} dark />
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
