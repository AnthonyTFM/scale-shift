"use client";

import Link from "next/link";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { site } from "@/content/site";
import { track } from "@/lib/analytics";
import { entityMap, loadIndex, loadYear, type YearData } from "@/lib/data";
import { areaAt, nearestYear, TODAY } from "@/lib/format";
import { decodeState, encodeState, newUid } from "@/lib/state";
import type { DataIndex, Entity, MapState, Overlay } from "@/lib/types";
import { YEARS } from "@/lib/years.generated";
import { Coach } from "./Coach";
import { MapCanvas, type ResolvedOverlay } from "./MapCanvas";
import { OverlayPanel } from "./OverlayPanel";
import { SearchBox } from "./SearchBox";
import { ShareButton } from "./ShareButton";
import { TimeDock } from "./TimeDock";

export interface InitialOverlay {
  id: string;
  year: number;
  at?: [number, number];
  follow?: boolean;
}

/** First visit: Greenland dropped onto Africa, and Rome at its height laid over the United States. */
export const DEFAULT_START: { year: number; overlays: InitialOverlay[] } = {
  year: TODAY,
  overlays: [
    { id: "greenland", year: TODAY, at: [20, 2] },
    { id: "roman-empire", year: 200, at: [-97, 39], follow: false },
  ],
};

interface Props {
  variant?: "full" | "embed";
  /** starting state; in the full variant a state in the URL wins */
  start?: { year: number; overlays: InitialOverlay[] };
  /** link for the embed's "open full map" button */
  fullMapHref?: string;
}

const MAX_OVERLAYS = 12;

function toOverlays(list: InitialOverlay[]): Overlay[] {
  return list.map((o, i) => ({
    uid: newUid(),
    id: o.id,
    year: o.year,
    follow: o.follow ?? true,
    pos: o.at ?? null,
    rot: 0,
    color: i % 8,
  }));
}

export function MapApp({ variant = "full", start, fullMapHref }: Props) {
  const [index, setIndex] = useState<DataIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<number>(start?.year ?? TODAY);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [showBorders, setShowBorders] = useState(true);
  const [yearData, setYearData] = useState<Map<number, YearData>>(new Map());
  const [fitOnLoad, setFitOnLoad] = useState(false);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const pending = useRef(new Set<number>());

  const entityById = useMemo(() => (index ? entityMap(index) : new Map<string, Entity>()), [index]);
  const years = useMemo(() => index?.years ?? YEARS, [index]);

  // 1. load the index, then decide the starting state
  useEffect(() => {
    let alive = true;
    loadIndex()
      .then((ix) => {
        if (!alive) return;
        const byId = entityMap(ix);
        let state: MapState | null = null;
        let fromUrl = false;
        if (variant === "full") {
          state = decodeState(window.location.search.slice(1), ix.years);
          fromUrl = Boolean(state);
        }
        if (!state) {
          const s = start ?? DEFAULT_START;
          state = { year: s.year, overlays: toOverlays(s.overlays) };
        }
        // drop unknown ids and snap years to ones the entity really has
        const clean = state.overlays
          .filter((o) => byId.has(o.id))
          .map((o) => {
            const e = byId.get(o.id)!;
            const ok = e.y.includes(ix.years.indexOf(o.year));
            return ok ? o : { ...o, year: nearestYear(e, ix.years, o.year) };
          });
        setIndex(ix);
        setYear(ix.years.includes(state.year) ? state.year : TODAY);
        setOverlays(clean);
        setFitOnLoad(fromUrl || Boolean(start));
        setReady(true);
      })
      .catch(() => alive && setError(site.map.loadError));
    return () => {
      alive = false;
    };
  }, [variant, start, attempt]);

  // 2. load every snapshot we need to draw
  const neededYears = useMemo(() => {
    const s = new Set<number>([TODAY, year, ...overlays.map((o) => o.year)]);
    return [...s];
  }, [year, overlays]);

  useEffect(() => {
    if (!index) return;
    for (const y of neededYears) {
      if (yearData.has(y) || pending.current.has(y)) continue;
      pending.current.add(y);
      loadYear(y)
        // a transition lets React draw the map in small slices instead of one long blocking task
        .then((d) => startTransition(() => setYearData((m) => new Map(m).set(y, d))))
        .catch(() => setError(site.map.loadError))
        .finally(() => pending.current.delete(y));
    }
  }, [index, neededYears, yearData]);

  // 3. keep the URL in sync so any view can be shared or bookmarked
  useEffect(() => {
    if (!ready || variant !== "full") return;
    const t = window.setTimeout(() => {
      const q = encodeState({ year, overlays });
      window.history.replaceState(window.history.state, "", `${window.location.pathname}?${q}`);
    }, 250);
    return () => window.clearTimeout(t);
  }, [ready, variant, year, overlays]);

  const has = useCallback(
    (id: string, y: number) => {
      const e = entityById.get(id);
      return Boolean(e && e.y.includes(years.indexOf(y)));
    },
    [entityById, years],
  );

  const changeYear = useCallback(
    (y: number) => {
      setYear(y);
      setOverlays((prev) => prev.map((o) => (o.follow && has(o.id, y) && o.year !== y ? { ...o, year: y } : o)));
      track("timeline_changed", { year: y });
    },
    [has],
  );

  const addEntity = useCallback(
    (id: string, preferYear?: number) => {
      const e = entityById.get(id);
      if (!e) return;
      const target = preferYear ?? year;
      const y = has(id, target) ? target : nearestYear(e, years, target);
      const uid = newUid();
      setOverlays((prev) => {
        const used = new Set(prev.map((o) => o.color));
        let color = 0;
        while (used.has(color) && color < 7) color++;
        const next = [...prev, { uid, id, year: y, follow: true, pos: null, rot: 0, color }];
        return next.slice(-MAX_OVERLAYS);
      });
      setSelectedUid(uid);
      track("region_added", { id, year: y });
    },
    [entityById, has, year, years],
  );

  const updateOverlay = useCallback(
    (uid: string, patch: Partial<Overlay>) => {
      setOverlays((prev) =>
        prev.map((o) => {
          if (o.uid !== uid) return o;
          const next = { ...o, ...patch };
          // turning "follow" on snaps to the timeline year when the entity exists there
          if (patch.follow === true && has(next.id, year)) next.year = year;
          return next;
        }),
      );
      if (patch.rot !== undefined) track("overlay_rotated");
    },
    [has, year],
  );

  const moveOverlay = useCallback((uid: string, pos: [number, number]) => {
    setOverlays((prev) => prev.map((o) => (o.uid === uid ? { ...o, pos } : o)));
  }, []);
  const rotateOverlay = useCallback((uid: string, delta: number) => {
    setOverlays((prev) => prev.map((o) => (o.uid === uid ? { ...o, rot: Math.max(-180, Math.min(180, o.rot + delta)) } : o)));
  }, []);
  const removeOverlay = useCallback((uid: string) => {
    setOverlays((prev) => prev.filter((o) => o.uid !== uid));
    setSelectedUid((s) => (s === uid ? null : s));
    track("region_removed");
  }, []);
  const clearAll = useCallback(() => {
    setOverlays([]);
    setSelectedUid(null);
  }, []);
  const onDragEnd = useCallback(() => track("overlay_dragged"), []);
  const pickTerritory = useCallback((id: string, y: number) => addEntity(id, y), [addEntity]);
  const pickSearch = useCallback((e: Entity) => addEntity(e.i), [addEntity]);
  const addById = useCallback((id: string) => addEntity(id), [addEntity]);

  const resolved = useMemo<ResolvedOverlay[]>(
    () =>
      overlays.map((o) => {
        const entity = entityById.get(o.id);
        return {
          overlay: o,
          entity,
          shape: yearData.get(o.year)?.get(o.id) ?? null,
          area: entity ? areaAt(entity, years, o.year) : undefined,
          missing: o.follow && !has(o.id, year),
        };
      }),
    [overlays, entityById, yearData, years, has, year],
  );

  const getQuery = useCallback(() => encodeState({ year, overlays }), [year, overlays]);
  const shareTitle = useMemo(() => {
    const names = resolved.map((r) => r.entity?.n).filter(Boolean);
    return names.length ? `${names.slice(0, 3).join(" vs ")} at true size` : site.name;
  }, [resolved]);

  const embed = variant === "embed";

  return (
    <div className={`relative flex flex-col bg-paper ${embed ? "h-[min(78vh,640px)] overflow-hidden rounded-2xl ring-1 ring-paper-3" : "h-[100dvh]"}`}>
      <header className="relative z-40 flex items-center gap-2 border-b border-paper-3 bg-paper px-3 py-2 sm:gap-4 sm:px-5">
        {!embed && (
          <Link href="/" className="font-display shrink-0 text-[1.6rem] leading-none max-sm:hidden" aria-label={`${site.name} home`}>
            {site.name}
          </Link>
        )}
        <div className="min-w-0 flex-1 sm:max-w-xl">
          {index ? (
            <SearchBox entities={index.entities} years={years} sliderYear={year} onPick={pickSearch} />
          ) : (
            <div className="h-11 rounded-full bg-paper-2" aria-hidden="true" />
          )}
        </div>
        {!embed && (
          <nav aria-label="Main" className="ml-auto hidden items-center gap-1 lg:flex">
            {site.nav.slice(1).map((n) => (
              <Link key={n.href} href={n.href} className="rounded-full px-3 py-2 text-sm font-bold text-ink-soft hover:text-ink">
                {n.label}
              </Link>
            ))}
          </nav>
        )}
        <div className={`flex shrink-0 items-center gap-2 ${embed ? "ml-auto" : "lg:ml-0 ml-auto"}`}>
          {embed && fullMapHref && (
            <Link href={fullMapHref} className="btn btn-ghost max-sm:px-3">
              <span className="max-sm:hidden">Open full map</span>
              <span className="sm:hidden">Full map</span>
            </Link>
          )}
          <ShareButton getQuery={getQuery} title={shareTitle} variant={embed ? "ghost" : "solid"} />
          {!embed && (
            <Link href="/about" className="icon-btn lg:hidden" aria-label="How it works">
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.8" fill="none" />
                <path d="M10 9v5M10 6.2v.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Link>
          )}
        </div>
      </header>

      <div id={embed ? undefined : "main"} className="relative min-h-0 flex-1">
        {!embed && (
          <h1 className="sr-only">Scale Shift: drag countries and historical empires to see their true size, from 1 BC to today</h1>
        )}
        <MapCanvas
          today={yearData.get(TODAY) ?? null}
          background={yearData.get(year) ?? null}
          showBorders={showBorders}
          sliderYear={year}
          overlays={resolved}
          selectedUid={selectedUid}
          entityById={entityById}
          years={years}
          onSelect={setSelectedUid}
          onMove={moveOverlay}
          onRotate={rotateOverlay}
          onRemove={removeOverlay}
          onPickTerritory={pickTerritory}
          onDragEnd={onDragEnd}
          fitOnLoad={fitOnLoad}
        />
        {index && (
          <OverlayPanel
            items={resolved}
            selectedUid={selectedUid}
            entityById={entityById}
            years={years}
            sliderYear={year}
            showBorders={showBorders}
            onBorders={setShowBorders}
            onSelect={setSelectedUid}
            onUpdate={updateOverlay}
            onRemove={removeOverlay}
            onClear={clearAll}
            onYear={changeYear}
            onAdd={addById}
          />
        )}
        {!embed && <Coach />}
        {error && (
          <div role="alert" className="absolute inset-x-3 top-3 z-50 mx-auto max-w-md rounded-xl bg-paper p-4 text-ink shadow-lg">
            <p>{error}</p>
            <button
              type="button"
              className="btn btn-primary mt-3"
              onClick={() => {
                setError(null);
                setAttempt((a) => a + 1);
              }}
            >
              {site.map.retry}
            </button>
          </div>
        )}
      </div>

      <TimeDock years={years} year={year} onYear={changeYear} showBorders={showBorders} onBorders={setShowBorders} compact={embed} />
    </div>
  );
}
