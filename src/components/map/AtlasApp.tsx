"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { presets, type Preset } from "@/content/presets";
import { site } from "@/content/site";
import { track } from "@/lib/analytics";
import { claims as allClaims, claimsForEra, loadClaimShapes, unclaimed } from "@/lib/antarctica";
import { featureAtIn, loadGrid, loadIndex, loadLayer, type IndexRow, type RulersGrid } from "@/lib/data";
import { eraByKey, eraIndex, eras, snapshotForYear } from "@/lib/eras";
import type { AreaUnit } from "@/lib/format";
import { boundsOf, fitView, mergeBounds, placeGeometry } from "@/lib/geo";
import { MAP_PATH, decodeState, encodeState, type MapState } from "@/lib/share";
import { SiteMenu } from "@/components/site/SiteMenu";
import { ChangesPanel } from "./ChangesPanel";
import { ComparisonsTab } from "./ComparisonsTab";
import { Compass } from "./Compass";
import { EraBar } from "./EraBar";
import { InfoSheet, type Info } from "./InfoSheet";
import { IntroCard } from "./IntroCard";
import { MapEngine, PALETTE, type ClaimShape, type Overlay } from "./engine";
import { MapKey } from "./MapKey";
import { YearNote } from "./YearNote";
import { DEFAULT_ERA, buildOverlay, lineageFor, overlayAtEra, pickNameInLayer, timelineSteps, type OverlayStep } from "./overlays";
import { SearchBox, type SearchPick } from "./SearchBox";
import { ShapeCard } from "./ShapeCard";
import { ShareDialog } from "./ShareDialog";

const MAX_SHAPES = 12;
const DEFAULT_PRESET = "greenland-vs-congo";
const INTRO_KEY = "atlas-intro-seen";
const UNIT_KEY = "atlas-unit";

type Toast = { msg: string; undo?: () => void } | null;

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

export default function AtlasApp() {
  const mapRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MapEngine | null>(null);
  const overlaysRef = useRef<Overlay[]>([]);
  const eraRef = useRef<string>(DEFAULT_ERA);

  const [era, setEra] = useState(DEFAULT_ERA);
  const [loadingEra, setLoadingEra] = useState(true);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [unit, setUnit] = useState<AreaUnit>("mi2");
  const [labels, setLabels] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [tab, setTab] = useState<"explore" | "compare">("explore");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [changesOpen, setChangesOpen] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);
  /** set by "go to year": the typed year and the snapshot chosen for it */
  const [yearAsked, setYearAsked] = useState<{ year: number; era: string } | null>(null);
  const [playing, setPlaying] = useState(false);
  // shown in the server HTML (fast first paint); hidden on mount for returning visitors and shared links
  const [showIntro, setShowIntro] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const [index, setIndex] = useState<IndexRow[] | null>(null);
  const [grid, setGrid] = useState<RulersGrid | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    overlaysRef.current = overlays;
  }, [overlays]);
  useEffect(() => {
    eraRef.current = era;
  }, [era]);

  const showToast = useCallback((msg: string, undo?: () => void) => setToast({ msg, undo }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.undo ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const needIndex = useCallback(() => {
    loadIndex()
      .then(setIndex)
      .catch(() => showToast("Couldn't load the search index. Check your connection."));
  }, [showToast]);

  const changeEra = useCallback((key: string) => {
    if (key === eraRef.current || !eras.some((e) => e.key === key)) return;
    eraRef.current = key;
    setLoadingEra(true);
    setEra(key);
    track("era_change", { era: key });
  }, []);

  const fitTo = useCallback((list: Overlay[]) => {
    const engine = engineRef.current;
    if (!engine || !list.length) return;
    const boxes = list.map((o) => {
      const g = o.moved || o.rot ? placeGeometry(o.geom, o.origin, [o.lon, o.lat], o.rot) : o.geom;
      return boundsOf(g, o.lon);
    });
    const box = mergeBounds(boxes);
    if (!box) return;
    const { w, h } = engine.getSize();
    engine.setView(fitView(box, w, h, w < 640 ? 0.12 : 0.2), true);
  }, []);

  const nextColor = (list: Overlay[]) => {
    const used = new Set(list.map((o) => o.color % PALETTE.length));
    for (let i = 0; i < PALETTE.length; i++) if (!used.has(i)) return i;
    return list.length % PALETTE.length;
  };

  const addShape = useCallback(
    async (name: string, eraKey: string, opts: { fly?: boolean } = {}) => {
      if (overlaysRef.current.length >= MAX_SHAPES) {
        showToast(`You can compare up to ${MAX_SHAPES} shapes at once.`);
        return;
      }
      const o = await buildOverlay(eraKey, name, { color: nextColor(overlaysRef.current) });
      if (!o) {
        showToast(`Couldn't find ${name} in that era.`);
        return;
      }
      setOverlays((prev) => [...prev, o]);
      setSelected(o.id);
      setPanelOpen(true);
      track("add_shape", { name, era: eraKey });
      if (eraKey !== "us" && eraKey !== eraRef.current) showToast(`Showing ${name} as of ${eraByKey(eraKey)?.label}.`);
      if (opts.fly !== false) fitTo([o]);
    },
    [fitTo, showToast],
  );

  const applyShapes = useCallback(async (state: MapState) => {
    const built = await Promise.all(
      state.shapes.map((s) => buildOverlay(s.era, s.name, { color: s.color, lon: s.lon, lat: s.lat, rot: s.rot })),
    );
    return built.filter((o): o is Overlay => !!o);
  }, []);

  const openPlace = useCallback((at: [number, number], eraKey: string, feature: ReturnType<typeof featureAtIn>) => {
    setInfo({ at, feature, era: eraKey });
    setChangesOpen(false);
    setKeyOpen(false);
    engineRef.current?.setHighlight(feature?.props.n ?? null, at);
    loadGrid()
      .then(setGrid)
      .catch(() => setGrid(null));
  }, []);

  const applyState = useCallback(
    async (state: MapState) => {
      changeEra(state.era);
      const list = await applyShapes(state);
      setOverlays(list);
      setSelected(null);
      if (state.at) {
        const layer = await loadLayer(state.era).catch(() => null);
        openPlace(state.at, state.era, layer ? featureAtIn(layer, state.at[0], state.at[1]) : null);
        // with shapes, frame them; otherwise fly to the point
        if (list.length) fitTo(list);
        else engineRef.current?.flyTo(state.at[0], state.at[1], engineRef.current.scaleFor(800_000, state.at[1]));
      } else if (list.length) fitTo(list);
    },
    [applyShapes, changeEra, fitTo, openPlace],
  );

  const applyPreset = useCallback(
    async (p: Preset) => {
      setShowIntro(false);
      writeStorage(INTRO_KEY, "1");
      setInfo(null);
      setPlaying(false);
      setActivePreset(p.id);
      await applyState({ era: p.baseEra, shapes: p.shapes.map((s, i) => ({ ...s, color: i })), at: p.at });
      if (!p.at) setSelected(null);
      track("preset", { id: p.id });
      if (p.play) setPlaying(true);
    },
    [applyState],
  );

  // ---- shape actions ----
  const removeShape = useCallback(
    (id: string) => {
      const removed = overlaysRef.current.find((o) => o.id === id);
      if (!removed) return;
      setOverlays((prev) => prev.filter((o) => o.id !== id));
      setSelected((s) => (s === id ? null : s));
      showToast(`Removed ${removed.name}.`, () => setOverlays((prev) => [...prev, removed]));
    },
    [showToast],
  );

  // ---- mount: engine + initial state ----
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const engine = new MapEngine(el, {
      onSelect: (id) => {
        setSelected(id);
        if (id) {
          setOverlays((prev) => {
            const o = prev.find((x) => x.id === id);
            return o ? [...prev.filter((x) => x.id !== id), o] : prev;
          });
          setInfo(null);
        }
      },
      onOverlayMove: (id, lon, lat) =>
        setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, lon, lat, moved: true } : o))),
      onRemove: (id) => removeShape(id),
      onMapClick: (at, feature) => openPlace(at, eraRef.current, feature),
      onViewChange: () => {},
    });
    engineRef.current = engine;

    let alive = true;
    (async () => {
      // phones: start with the panel collapsed so the map is visible first
      if (window.matchMedia("(max-width: 639px)").matches) setPanelOpen(false);
      const savedUnit = readStorage(UNIT_KEY);
      if (savedUnit === "km2" || savedUnit === "mi2") setUnit(savedUnit);
      const state = decodeState(window.location.hash);
      if (state || readStorage(INTRO_KEY) === "1") setShowIntro(false);
      if (state) await applyState(state);
      else {
        const p = presets.find((x) => x.id === DEFAULT_PRESET);
        if (p) {
          const list = await applyShapes({ era: p.baseEra, shapes: p.shapes.map((s, i) => ({ ...s, color: i })) });
          if (alive) setOverlays(list);
        }
      }
      if (alive) setReady(true);
    })();

    const onHash = () => {
      const s = decodeState(window.location.hash);
      if (s) applyState(s);
    };
    window.addEventListener("hashchange", onHash);
    return () => {
      alive = false;
      window.removeEventListener("hashchange", onHash);
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- era: load layer, keep unmoved shapes in sync with the timeline ----
  useEffect(() => {
    let alive = true;
    loadLayer(era)
      .then(async (layer) => {
        if (!alive) return;
        engineRef.current?.setLayer(layer);
        setLoadingEra(false);
        const current = overlaysRef.current;
        const updated = await Promise.all(
          current.map(async (o) => {
            if (o.moved || o.era === "us" || o.era === era) return o;
            const name = pickNameInLayer(lineageFor(o.name), layer);
            return name ? ((await overlayAtEra(o, era, name)) ?? o) : o;
          }),
        );
        if (!alive) return;
        const changed = new Map(updated.filter((u, i) => u !== current[i]).map((u) => [u.id, u]));
        if (changed.size) setOverlays((prev) => prev.map((p) => (!p.moved && changed.get(p.id)) || p));
      })
      .catch(() => {
        if (!alive) return;
        setLoadingEra(false);
        setPlaying(false);
        showToast("Couldn't load that era. Check your connection and try again.");
      });
    // US state lines only show when zoomed in, so fetch them once the page is idle
    let idle = 0;
    if (era === "present") {
      idle = window.setTimeout(() => {
        loadLayer("us")
          .then((s) => alive && engineRef.current?.setStates(s))
          .catch(() => {});
      }, 2500);
    } else engineRef.current?.setStates(null);
    return () => {
      alive = false;
      clearTimeout(idle);
    };
  }, [era, showToast]);

  // ---- Antarctic claims made by this era (the first was in 1908) ----
  useEffect(() => {
    const list = claimsForEra(era);
    if (!list.length) {
      engineRef.current?.setClaims([]);
      return;
    }
    let alive = true;
    loadClaimShapes()
      .then((geoms) => {
        if (!alive) return;
        const mid = (r: number[]) => (r[0] + r[1]) / 2;
        const widest = (ranges: number[][]) => ranges.reduce((a, b) => (b[1] - b[0] > a[1] - a[0] ? b : a));
        const shapes: ClaimShape[] = list.map((c) => ({ id: c.id, label: c.claimant, color: c.color, geom: geoms[c.id], at: [mid(widest(c.ranges)), -80] }));
        if (list.length === allClaims.length)
          shapes.push({ id: "unclaimed", label: "Unclaimed", color: "#7a6a5e", geom: geoms.unclaimed, at: [mid(unclaimed.ranges[0]), -80] });
        engineRef.current?.setClaims(shapes.filter((x) => x.geom));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [era]);

  useEffect(() => {
    engineRef.current?.setOverlays(overlays, selected);
  }, [overlays, selected]);

  useEffect(() => {
    engineRef.current?.setLabels(labels);
  }, [labels]);

  // ---- URL hash mirrors the map so any view can be shared ----
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      const hash = encodeState({
        era,
        shapes: overlays.map((o) => ({
          era: o.era,
          name: o.name,
          color: o.color,
          ...(o.moved ? { lon: o.lon, lat: o.lat, rot: o.rot } : {}),
        })),
      });
      window.history.replaceState(null, "", `#${hash}`);
    }, 250);
    return () => clearTimeout(t);
  }, [era, overlays, ready]);

  // ---- play through eras (waits for each era to load) ----
  useEffect(() => {
    if (!playing || loadingEra) return;
    const t = setTimeout(() => {
      const i = eraIndex(eraRef.current);
      if (i >= eras.length - 1) setPlaying(false);
      else changeEra(eras[i + 1].key);
    }, 1400);
    return () => clearTimeout(t);
  }, [playing, loadingEra, era, changeEra]);


  const clearAll = () => {
    const before = overlaysRef.current;
    if (!before.length) return;
    setOverlays([]);
    setSelected(null);
    showToast("Cleared the map.", () => setOverlays(before));
  };

  const update = (id: string, patch: Partial<Overlay>) => setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  const stepShape = async (o: Overlay, step: OverlayStep) => {
    const next = await overlayAtEra(o, step.era, step.name);
    if (next) setOverlays((prev) => prev.map((p) => (p.id === o.id ? next : p)));
  };

  const selectedOverlay = overlays.find((o) => o.id === selected) ?? null;
  const steps = selectedOverlay && index ? timelineSteps(selectedOverlay.name, selectedOverlay.era, index) : null;
  useEffect(() => {
    if (selected && !index) needIndex();
  }, [selected, index, needIndex]);

  const onPick = (p: SearchPick) => {
    addShape(p.name, p.era);
  };

  const openShare = () => {
    const hash = encodeState({
      era,
      shapes: overlays.map((o) => ({ era: o.era, name: o.name, color: o.color, ...(o.moved ? { lon: o.lon, lat: o.lat, rot: o.rot } : {}) })),
    });
    setShareUrl(`${window.location.origin}${MAP_PATH}#${hash}`);
    setShareOpen(true);
    track("share_open");
  };

  const shareTitle = overlays.length
    ? overlays
        .slice(0, 3)
        .map((o) => o.name)
        .join(" vs ")
    : `The world in ${eraByKey(era)?.label}`;

  const download = async () => {
    const blob = await engineRef.current?.toBlob(`${shareTitle} · ${eraByKey(era)?.label} · ${site.name}`);
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${shareTitle.replace(/[^\w]+/g, "-").toLowerCase() || "scale-shift"}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const onMapKey = (e: React.KeyboardEvent) => {
    const engine = engineRef.current;
    if (!engine) return;
    const o = selectedOverlay;
    const big = e.shiftKey ? 5 : 1;
    const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    if (arrows[e.key]) {
      e.preventDefault();
      const [dx, dy] = arrows[e.key];
      if (o) update(o.id, { lon: ((o.lon + dx * big + 540) % 360) - 180, lat: Math.max(-80, Math.min(80, o.lat + dy * big)), moved: true });
      else engine.panPixels(-dx * 80 * big, dy * 80 * big);
    } else if (e.key === "+" || e.key === "=") engine.zoomBy(1.5);
    else if (e.key === "-" || e.key === "_") engine.zoomBy(1 / 1.5);
    else if (o && (e.key === "[" || e.key === "]")) update(o.id, { rot: o.rot + (e.key === "]" ? 5 : -5), moved: true });
    else if (o && (e.key === "Delete" || e.key === "Backspace")) removeShape(o.id);
    else if (e.key === "Escape") {
      setSelected(null);
      setInfo(null);
    }
  };

  const eraMeta = eraByKey(era);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#9FCBE0] text-ink">
      <h1 className="sr-only">
        {site.name}: drag countries and empires to see their real size, from 2000 BCE to today
      </h1>
      <div
        ref={mapRef}
        tabIndex={0}
        role="application"
        aria-roledescription="map"
        aria-label={`Map of the world in ${eraMeta?.label}. Arrow keys pan, plus and minus zoom. With a shape selected, arrow keys move it, square brackets rotate it and Delete removes it.`}
        onKeyDown={onMapKey}
        className="absolute inset-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-focus"
      />

      {/* Panel (parity with the reference: title, search, selected shape, units, links) */}
      <aside className="pointer-events-none absolute left-3 top-3 z-20 flex max-h-[calc(100dvh-120px)] w-[calc(100vw-80px)] max-w-[380px] flex-col sm:max-h-[calc(100dvh-130px)]">
        <div className="pointer-events-auto flex min-h-0 flex-col overflow-hidden rounded-2xl bg-panel text-panel-text shadow-float">
          <div className="flex items-center gap-2 px-4 pb-3 pt-3">
            <Link href="/" className="font-display text-xl font-bold tracking-tight sm:text-2xl">
              {site.name}
            </Link>
            <span className="hidden text-xs text-panel-muted sm:inline">2000 BCE → today</span>
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              aria-expanded={panelOpen}
              aria-controls="atlas-panel-body"
              aria-label={panelOpen ? "Collapse panel" : "Expand panel"}
              className="ml-auto grid size-9 place-items-center rounded-lg bg-white/10 hover:bg-white/15"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className={`size-4 transition-transform ${panelOpen ? "" : "rotate-180"}`} fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m6 15 6-6 6 6" />
              </svg>
            </button>
          </div>
          <div className="px-4 pb-3">
            <SearchBox index={index} onNeedIndex={needIndex} currentEra={era} unit={unit} onPick={onPick} />
          </div>
          {panelOpen ? (
            <div role="tablist" aria-label="Panel" className="mx-4 mb-3 grid grid-cols-2 rounded-xl bg-white/10 p-1 text-sm font-semibold">
              {(
                [
                  ["explore", "Explore"],
                  ["compare", "Comparisons"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`tab-${id}`}
                  aria-selected={tab === id}
                  aria-controls="atlas-panel-body"
                  onClick={() => setTab(id)}
                  className="rounded-lg py-1.5 aria-selected:bg-accent aria-selected:text-panel"
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
          {panelOpen && tab === "compare" ? (
            <div id="atlas-panel-body" role="tabpanel" aria-labelledby="tab-compare" className="min-h-0 overflow-y-auto px-4 pb-4">
              <ComparisonsTab
                activeId={activePreset}
                onPick={(p) => {
                  applyPreset(p);
                  if (window.matchMedia("(max-width: 639px)").matches) setPanelOpen(false);
                }}
              />
            </div>
          ) : null}
          {panelOpen && tab === "explore" ? (
            <div id="atlas-panel-body" role="tabpanel" aria-labelledby="tab-explore" className="min-h-0 space-y-3 overflow-y-auto px-4 pb-4">
              {overlays.length ? (
                <ul aria-label="Shapes on the map" className="flex flex-wrap gap-1.5">
                  {overlays.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        aria-pressed={o.id === selected}
                        onClick={() => {
                          setSelected(o.id === selected ? null : o.id);
                          setInfo(null);
                        }}
                        className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold hover:bg-white/15 aria-pressed:bg-white aria-pressed:text-panel"
                      >
                        <span className="size-2.5 rounded-full" style={{ background: PALETTE[o.color % PALETTE.length] }} />
                        <span className="max-w-36 truncate">{o.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-panel-muted">Search for a country or empire, or click any land to see who ruled it.</p>
              )}
              {selectedOverlay ? (
                <ShapeCard
                  overlay={selectedOverlay}
                  steps={steps}
                  unit={unit}
                  onRemove={() => removeShape(selectedOverlay.id)}
                  onColor={(c) => update(selectedOverlay.id, { color: c })}
                  onStep={(s) => stepShape(selectedOverlay, s)}
                  onReset={() =>
                    update(selectedOverlay.id, { lon: selectedOverlay.origin[0], lat: selectedOverlay.origin[1], rot: 0, moved: false })
                  }
                  onZoom={() => fitTo([selectedOverlay])}
                />
              ) : overlays.length ? (
                <p className="text-xs text-panel-muted">Drag a shape to compare. Click it for details and its border history.</p>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <div role="group" aria-label="Area units" className="flex rounded-full bg-white/10 p-1 text-xs font-semibold">
                  {(
                    [
                      ["mi2", "sq mi"],
                      ["km2", "km²"],
                    ] as const
                  ).map(([u, label]) => (
                    <button
                      key={u}
                      type="button"
                      aria-pressed={unit === u}
                      onClick={() => {
                        setUnit(u);
                        writeStorage(UNIT_KEY, u);
                      }}
                      className="rounded-full px-3 py-1 aria-pressed:bg-white aria-pressed:text-panel"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setTab("compare")} className="text-xs font-semibold text-accent underline hover:text-white">
                  See comparisons
                </button>
              </div>
              <p className="text-xs text-panel-muted">
                © {site.copyrightHolder}. Borders: historical-basemaps, Natural Earth.{" "}
                <Link href="/about" className="underline hover:text-white">
                  Sources &amp; accuracy
                </Link>
              </p>
            </div>
          ) : null}
        </div>
      </aside>

      {/* Right-hand controls */}
      <div className="absolute right-3 top-3 z-20 flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <Link
            href="/"
            aria-label="Home"
            title="Back to the homepage"
            className="flex h-11 items-center gap-2 rounded-xl bg-panel px-3 text-sm font-bold text-panel-text shadow-float hover:bg-panel-2"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
              <path d="M3 11 12 4l9 7M5 10v10h5v-6h4v6h5V10" />
            </svg>
            <span className="hidden sm:inline">Home</span>
          </Link>
          <SiteMenu variant="map" />
        </div>
        <button
          type="button"
          onClick={openShare}
          className="flex h-11 items-center gap-2 rounded-xl bg-accent px-3 text-sm font-bold text-panel shadow-float hover:bg-accent-strong sm:px-4"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
          </svg>
          <span className="hidden sm:inline">Share</span>
          <span className="sr-only sm:hidden">Share</span>
        </button>
        <div className="flex flex-col overflow-hidden rounded-xl bg-panel text-white shadow-float">
          <button type="button" onClick={() => engineRef.current?.zoomBy(1.6)} aria-label="Zoom in" className="grid size-11 place-items-center hover:bg-white/10">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <span className="mx-2 h-px bg-white/20" />
          <button type="button" onClick={() => engineRef.current?.zoomBy(1 / 1.6)} aria-label="Zoom out" className="grid size-11 place-items-center hover:bg-white/10">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14" />
            </svg>
          </button>
        </div>
        <button
          type="button"
          onClick={() => setLabels((v) => !v)}
          aria-pressed={labels}
          aria-label="Show labels"
          title="Toggle labels"
          className="grid size-11 place-items-center rounded-xl bg-panel text-white shadow-float hover:bg-slate-800 aria-[pressed=false]:opacity-70"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 6V4h14v2M12 4v16M9 20h6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => {
            setKeyOpen((v) => !v);
            setInfo(null);
            setChangesOpen(false);
          }}
          aria-expanded={keyOpen}
          aria-label="Map key"
          title="Map key"
          className="grid size-11 place-items-center rounded-xl bg-panel text-white shadow-float hover:bg-slate-800 aria-expanded:ring-2 aria-expanded:ring-accent"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="5" height="4" rx="1" />
            <rect x="3" y="10" width="5" height="4" rx="1" />
            <rect x="3" y="16" width="5" height="4" rx="1" />
            <path d="M11 6h10M11 12h10M11 18h10" />
          </svg>
        </button>
        <button
          type="button"
          onClick={clearAll}
          aria-label="Remove all shapes"
          title="Remove all shapes"
          className="grid size-11 place-items-center rounded-xl bg-panel text-white shadow-float hover:bg-slate-800"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
          </svg>
        </button>
      </div>

      {/* Place / dispute / changes panel */}
      {info || changesOpen || keyOpen ? (
        <div className="absolute inset-x-3 bottom-[124px] z-30 max-h-[48dvh] overflow-y-auto rounded-2xl sm:inset-x-auto sm:bottom-auto sm:right-16 sm:top-[120px] sm:max-h-[calc(100dvh-250px)] sm:w-[380px]">
          {keyOpen ? (
            <MapKey era={era} onClose={() => setKeyOpen(false)} />
          ) : changesOpen ? (
            <ChangesPanel
              era={era}
              unit={unit}
              onClose={() => setChangesOpen(false)}
              onFocus={(lon, lat) => engineRef.current?.flyTo(lon, lat)}
            />
          ) : info ? (
            <InfoSheet
              info={info}
              grid={grid}
              unit={unit}
              currentEra={era}
              onClose={() => {
                setInfo(null);
                engineRef.current?.setHighlight(null, null);
              }}
              onAdd={(name, eraKey) => addShape(name, eraKey)}
              onEra={changeEra}
            />
          ) : null}
        </div>
      ) : null}

      {/* Compass rose (rotation), like the reference */}
      <div className={`absolute bottom-[124px] left-3 z-10 sm:bottom-4 ${info || changesOpen || keyOpen ? "hidden sm:block" : ""}`}>
        <Compass
          rotation={selectedOverlay ? Math.round(((selectedOverlay.rot % 360) + 540) % 360 - 180) : null}
          onRotate={(deg) => selectedOverlay && update(selectedOverlay.id, { rot: deg, moved: true })}
        />
      </div>

      {/* Timeline */}
      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 mx-auto max-w-3xl">
        {yearAsked && yearAsked.era === era ? (
          <YearNote
            year={yearAsked.year}
            eraKey={era}
            onEra={(k) => {
              setYearAsked(null);
              changeEra(k);
            }}
            onFocus={(lon, lat) => engineRef.current?.flyTo(lon, lat)}
            onClose={() => setYearAsked(null)}
          />
        ) : null}
        <EraBar
          onYear={(y) => {
            const snap = snapshotForYear(y);
            setPlaying(false);
            setYearAsked({ year: y, era: snap.key });
            changeEra(snap.key);
            track("year_search", { year: y });
          }}
          era={era}
          loading={loadingEra}
          playing={playing}
          onEra={(k) => {
            setPlaying(false);
            changeEra(k);
          }}
          onTogglePlay={() => {
            if (!playing && eraIndex(era) >= eras.length - 1) changeEra(eras[0].key);
            setPlaying((p) => !p);
          }}
          onChanges={() => {
            setChangesOpen((v) => !v);
            setInfo(null);
            setKeyOpen(false);
          }}
          changesOpen={changesOpen}
        />
      </div>

      {showIntro ? (
        <div data-intro className="absolute inset-0 z-40 grid place-items-center bg-slate-900/30 p-4">
          <div className="w-full max-w-md">
            <IntroCard
              onClose={() => {
                setShowIntro(false);
                writeStorage(INTRO_KEY, "1");
              }}
              onPreset={applyPreset}
            />
          </div>
        </div>
      ) : null}

      <div aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-[124px] z-50 flex justify-center px-3">
        {toast ? (
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-panel px-4 py-2 text-sm text-white shadow-float">
            <span>{toast.msg}</span>
            {toast.undo ? (
              <button
                type="button"
                onClick={() => {
                  toast.undo?.();
                  setToast(null);
                }}
                className="font-bold text-accent underline"
              >
                Undo
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <ShareDialog open={shareOpen} url={shareUrl} title={shareTitle} onClose={() => setShareOpen(false)} onDownload={download} />
    </div>
  );
}
