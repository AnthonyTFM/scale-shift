"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { presets, type Preset } from "@/content/presets";
import { site } from "@/content/site";
import { track } from "@/lib/analytics";
import { claims as allClaims, claimsForEra, loadClaimShapes, unclaimed } from "@/lib/antarctica";
import { featureAtIn, loadGrid, loadIndex, loadLakes, loadLayer, type IndexRow, type RulersGrid } from "@/lib/data";
import { eraByKey, eraIndex, eras, snapshotForYear } from "@/lib/eras";
import type { AreaUnit } from "@/lib/format";
import { boundsOf, fitView, mergeBounds, panBy, placeGeometry } from "@/lib/geo";
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

/** Phone-width screens, where the panel starts folded so the map shows first. */
const isPhone = () => window.matchMedia("(max-width: 639px)").matches;

export default function AtlasApp() {
  const mapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const phoneBarRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MapEngine | null>(null);
  const overlaysRef = useRef<Overlay[]>([]);
  const eraRef = useRef<string>(DEFAULT_ERA);
  /** the play direction the timeline last had (to tell when play starts) */
  const wasPlaying = useRef<0 | 1 | -1>(0);

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
  /** 1 plays forward through the eras, -1 plays back in time, 0 is stopped */
  const [playing, setPlaying] = useState<0 | 1 | -1>(0);
  // shown in the server HTML (fast first paint); hidden on mount for returning visitors and shared links
  const [showIntro, setShowIntro] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const [index, setIndex] = useState<IndexRow[] | null>(null);
  const [grid, setGrid] = useState<RulersGrid | null>(null);
  const [ready, setReady] = useState(false);
  /** phones: how far above the screen's bottom the sheets, the selected-shape bar and the toast start (above the timeline
   * and its year note) */
  const [stackBottom, setStackBottom] = useState(130);
  /** bumped after a search pick, to move keyboard focus to the picked shape */
  const [focusAsk, setFocusAsk] = useState(0);

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
    // frame the shapes in the part of the map nothing covers: right of the side panel's column (on phones, where the
    // panel spans the screen and stays folded, below its search box), left of the controls and above the timeline
    const panel = panelRef.current?.getBoundingClientRect();
    const phone = isPhone();
    const left = panel && !phone ? panel.right + 8 : 0;
    const top = phone ? (searchRef.current?.getBoundingClientRect().bottom ?? 0) + 8 : 0;
    const right = Math.max(left + 120, (controlsRef.current?.getBoundingClientRect().left ?? w) - 8);
    // on phones the selected-shape bar will sit above the timeline too
    const bottom = Math.max(top + 120, (timelineRef.current?.getBoundingClientRect().top ?? h) - 8 - (phone ? 64 : 0));
    const v = fitView(box, right - left, bottom - top, phone ? 0.12 : 0.2);
    // fitView centres the shapes; move them to the middle of the free area
    engine.setView(panBy(v, (left + right) / 2 - w / 2, (top + bottom) / 2 - h / 2, w, h), true);
  }, []);

  const nextColor = (list: Overlay[]) => {
    const used = new Set(list.map((o) => o.color % PALETTE.length));
    for (let i = 0; i < PALETTE.length; i++) if (!used.has(i)) return i;
    return list.length % PALETTE.length;
  };

  // after adding or picking a shape: laptops open the panel on its card; phones keep the panel folded and close any
  // sheet, so the shape stays in view with the bottom bar
  const showShape = useCallback(() => {
    setTab("explore");
    if (!isPhone()) return setPanelOpen(true);
    setInfo(null);
    setKeyOpen(false);
    setChangesOpen(false);
  }, []);

  const addShape = useCallback(
    async (name: string, eraKey: string, opts: { fly?: boolean } = {}) => {
      // the same shape from the same era is already on the map: select it instead of adding a copy
      const existing = overlaysRef.current.find((o) => o.name === name && o.era === eraKey);
      if (existing) {
        setSelected(existing.id);
        showShape();
        if (opts.fly !== false) fitTo([existing]);
        showToast(`${name} is already on the map.`);
        return;
      }
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
      showShape();
      track("add_shape", { name, era: eraKey });
      if (eraKey !== "us" && eraKey !== eraRef.current) showToast(`Showing ${name} as of ${eraByKey(eraKey)?.label}.`);
      if (opts.fly !== false) fitTo([o]);
    },
    [fitTo, showToast, showShape],
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
      setPlaying(0);
      setActivePreset(p.id);
      await applyState({ era: p.baseEra, shapes: p.shapes.map((s, i) => ({ ...s, color: i })), at: p.at });
      if (!p.at) setSelected(null);
      track("preset", { id: p.id });
      if (p.play) setPlaying(1);
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
    // the same big lakes on every era (the sources disagree about which lakes they leave out)
    loadLakes()
      .then((lakes) => engine.setLakes(lakes))
      .catch(() => {});

    let alive = true;
    (async () => {
      // phones: start with the panel collapsed so the map is visible first
      if (isPhone()) setPanelOpen(false);
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
        setPlaying(0);
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

  // ---- play through eras, forward or back in time: each era's borders sweep in straight after the last one's, at a
  // steady pace (the next era loads while they sweep), so the map keeps moving until the last era ----
  useEffect(() => {
    const engine = engineRef.current;
    const started = playing !== 0 && wasPlaying.current !== playing;
    wasPlaying.current = playing;
    if (!playing) engine?.setSteady(false);
    if (!playing || loadingEra) return;
    const next = eraIndex(eraRef.current) + playing;
    const last = next < 0 || next > eras.length - 1;
    if (!last) loadLayer(eras[next].key).catch(() => {});
    // as this era's sweep ends; with none running, at once when play starts, else after a moment (for readers who prefer
    // less motion, or when a sweep was skipped because the map was being moved)
    const left = engine?.sweepLeft() ?? 0;
    const t = setTimeout(
      () => {
        if (last) return setPlaying(0);
        engine?.setSteady(true);
        changeEra(eras[next].key);
      },
      left > 0 ? left : started ? 0 : 1400,
    );
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
  // the phone "selected shape" bar shows when the panel is folded and nothing else covers the bottom
  const phoneBar = selectedOverlay && !panelOpen && !info && !changesOpen && !keyOpen ? selectedOverlay : null;
  const steps = selectedOverlay && index ? timelineSteps(selectedOverlay.name, selectedOverlay.era, index) : null;
  useEffect(() => {
    if (selected && !index) needIndex();
  }, [selected, index, needIndex]);

  // phones: keep the bottom column clear of the timeline, which grows when the year note opens. The 14px gap above the
  // timeline (12px offset + 14) is where the era name's tap area reaches up to its full 44px (EraBar)
  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStackBottom(el.offsetHeight + 26));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // after a search pick, keyboard focus moves to the shape's card (the bar at the bottom on phones) instead of the page
  useEffect(() => {
    if (focusAsk) (cardRef.current ?? phoneBarRef.current)?.focus();
  }, [focusAsk]);

  const onPick = async (p: SearchPick) => {
    await addShape(p.name, p.era);
    setFocusAsk((n) => n + 1);
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
    a.download = `${(shareTitle.replace(/[^\w]+/g, "-") || site.name.replace(/[^\w]+/g, "-")).toLowerCase()}.png`;
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
    else if (e.key === "Enter" || e.key === " ") {
      // "Who ruled here?" for the place under the crosshair, at the centre of the map
      e.preventDefault();
      const at = engine.center();
      openPlace(at, eraRef.current, engine.featureAt(at[0], at[1]));
    } else if (e.key === "Escape") {
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
        aria-label={`Map of the world in ${eraMeta?.label}. Arrow keys pan, plus and minus zoom, and Enter shows who ruled the place at the centre. With a shape selected, arrow keys move it, square brackets rotate it and Delete removes it.`}
        onKeyDown={onMapKey}
        className="peer absolute inset-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-focus"
      />
      {/* keyboard focus on the map: the place Enter asks about */}
      <svg
        aria-hidden="true"
        viewBox="0 0 32 32"
        className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden size-8 -translate-x-1/2 -translate-y-1/2 text-panel drop-shadow peer-focus-visible:block"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="M16 3v9M16 20v9M3 16h9M20 16h9" />
        <circle cx="16" cy="16" r="1.5" fill="currentColor" />
      </svg>

      {/* Panel (parity with the reference: title, search, selected shape, units, links) */}
      <aside className="pointer-events-none absolute left-3 top-3 z-20 flex focus-within:z-40 max-h-[calc(100dvh-120px)] w-[calc(100vw-80px)] max-w-[380px] flex-col sm:max-h-[calc(100dvh-130px)]">
        <div ref={panelRef} className="pointer-events-auto flex min-h-0 flex-col rounded-2xl bg-panel text-panel-text shadow-float">
          <div className="flex items-center gap-2 px-3 pb-1 pt-1.5 sm:px-4 sm:pb-3 sm:pt-3">
            <Link href="/" className="font-display text-lg font-bold tracking-tight sm:text-2xl">
              {site.name}
            </Link>
            <span className="hidden text-xs text-panel-muted sm:inline">2000 BCE → today</span>
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              aria-expanded={panelOpen}
              aria-controls="atlas-panel-body"
              aria-label={panelOpen ? "Collapse panel" : "Expand panel"}
              className="ml-auto grid size-8 place-items-center rounded-lg bg-white/10 hover:bg-white/15 sm:size-9"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className={`size-4 transition-transform ${panelOpen ? "" : "rotate-180"}`} fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m6 15 6-6 6 6" />
              </svg>
            </button>
          </div>
          <div ref={searchRef} className="px-3 pb-2 sm:px-4 sm:pb-3">
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
                  if (isPhone()) setPanelOpen(false);
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
                <p className="text-sm text-panel-muted">Search for a country or empire, or tap any land to see who ruled it.</p>
              )}
              {selectedOverlay ? (
                <div
                  ref={cardRef}
                  tabIndex={-1}
                  role="group"
                  aria-label={`${selectedOverlay.name}, selected`}
                  className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
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
                </div>
              ) : overlays.length ? (
                <p className="text-xs text-panel-muted">Drag a shape to compare. Tap it for details and its border history.</p>
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
                © {site.copyrightHolder}. Borders: historical-basemaps, Cliopatria, HistoGIS, OpenHistoricalMap, Natural Earth.{" "}
                <Link href="/about" className="underline hover:text-white">
                  Sources &amp; accuracy
                </Link>
              </p>
            </div>
          ) : null}
        </div>
      </aside>

      {/* Right-hand controls */}
      <div ref={controlsRef} className="absolute right-3 top-3 z-20 flex flex-col items-end gap-2">
        {/* phones: Home sits under the menu so it stays clear of the search panel */}
        <div className="flex flex-col-reverse items-end gap-2 sm:flex-row">
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

      {/* Phones: the place, changes or key sheet, the selected-shape bar, the toast and the compass share one column above
          the timeline (and its year note), so none covers another. From sm up the column drops out (sm:contents) and each
          keeps its own place. */}
      <div
        className="pointer-events-none absolute inset-x-3 z-30 flex flex-col-reverse gap-2 sm:contents"
        style={{ bottom: stackBottom }}
      >
        {/* Place / dispute / changes panel (on phones it stops short of the right-hand buttons, as the search panel does) */}
        {info || changesOpen || keyOpen ? (
          <div className="pointer-events-auto mr-[52px] max-h-[48dvh] overflow-y-auto rounded-2xl sm:absolute sm:right-16 sm:top-[120px] sm:z-30 sm:mr-0 sm:max-h-[calc(100dvh-250px)] sm:w-[380px]">
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

        {/* Phones: the panel is folded, so show what's selected with quick actions */}
        {phoneBar ? (
          <div
            ref={phoneBarRef}
            tabIndex={-1}
            role="group"
            aria-label={`${phoneBar.name} selected`}
            className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-panel p-2 pl-3 text-panel-text shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:hidden"
          >
            <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ background: PALETTE[phoneBar.color % PALETTE.length] }} />
            <span className="min-w-0 flex-1 truncate text-sm font-bold">{phoneBar.name}</span>
            <button
              type="button"
              onClick={() => {
                setTab("explore");
                setPanelOpen(true);
              }}
              className="h-10 rounded-lg bg-white/10 px-3 text-sm font-semibold"
            >
              Edit
            </button>
            <button type="button" onClick={() => removeShape(phoneBar.id)} className="h-10 rounded-lg bg-rose-500/20 px-3 text-sm font-semibold text-rose-100">
              Remove
            </button>
            <button type="button" onClick={() => setSelected(null)} aria-label="Deselect" className="grid size-10 place-items-center rounded-lg hover:bg-white/10">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        ) : null}

        <div aria-live="polite" className="flex justify-center sm:pointer-events-none sm:absolute sm:inset-x-0 sm:bottom-[124px] sm:z-50 sm:px-3">
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

        {/* Compass rose (rotation), like the reference; hidden on phones while a sheet or the open panel needs the room */}
        <div
          className={`pointer-events-auto self-start sm:absolute sm:bottom-4 sm:left-3 sm:z-10 ${info || changesOpen || keyOpen || panelOpen ? "hidden sm:block" : ""}`}
        >
          <Compass
            rotation={selectedOverlay ? Math.round(((selectedOverlay.rot % 360) + 540) % 360 - 180) : null}
            onRotate={(deg) => selectedOverlay && update(selectedOverlay.id, { rot: deg, moved: true })}
          />
        </div>
      </div>

      {/* Timeline */}
      <div ref={timelineRef} className="pointer-events-none absolute inset-x-3 bottom-3 z-20 mx-auto max-w-3xl">
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
            setPlaying(0);
            setYearAsked({ year: y, era: snap.key });
            changeEra(snap.key);
            track("year_search", { year: y });
          }}
          era={era}
          loading={loadingEra}
          playing={playing}
          onEra={(k) => {
            setPlaying(0);
            changeEra(k);
          }}
          onTogglePlay={(dir) => {
            if (playing === dir) return setPlaying(0);
            // at the end of the line, start again from the other end
            const i = eraIndex(era);
            if (dir === 1 && i >= eras.length - 1) changeEra(eras[0].key);
            if (dir === -1 && i <= 0) changeEra(eras[eras.length - 1].key);
            setPlaying(dir);
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

      <ShareDialog open={shareOpen} url={shareUrl} title={shareTitle} onClose={() => setShareOpen(false)} onDownload={download} />
    </div>
  );
}
