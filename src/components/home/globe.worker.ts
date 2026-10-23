// Draws the homepage globe off the main thread, so its spin never holds up taps and scrolling (Globe.tsx).
import { globeCountries, globeRenderer, type GlobeTopology } from "@/lib/globe-draw";
import { GLOBE_START_LON } from "@/lib/globe";

export type GlobeMessage =
  | { type: "init"; canvas: OffscreenCanvas }
  | { type: "data"; topo: GlobeTopology }
  | { type: "size"; size: number; dpr: number }
  | { type: "spin"; on: boolean }
  | { type: "drag"; start: boolean }
  | { type: "turn"; by: number };

const SPEED = 6; // degrees per second
const FRAME_MS = 50; // 20 frames a second is smooth enough for a slow spin

let canvas: OffscreenCanvas | null = null;
let draw: ReturnType<typeof globeRenderer> | null = null;
let groups: ReturnType<typeof globeCountries> | null = null;
let lon = GLOBE_START_LON;
let dragFrom: number | null = null;
let size = 0;
let dpr = 1;
let spinning = false;
let timer = 0;
let last = 0;
let told = false;

function paint() {
  if (!draw || !groups || !size) return;
  draw(groups, lon, size, dpr);
  if (!told) {
    told = true;
    postMessage({ type: "drawn" });
  }
}

function tick() {
  timer = 0;
  const now = performance.now();
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (dragFrom === null) lon += SPEED * dt;
  paint();
  // wait for what's left of the frame, so a slow draw doesn't make the spin fall behind
  if (spinning) timer = setTimeout(tick, Math.max(0, FRAME_MS - (performance.now() - now))) as unknown as number;
}

onmessage = (e: MessageEvent<GlobeMessage>) => {
  const m = e.data;
  if (m.type === "init") {
    canvas = m.canvas;
    const ctx = canvas.getContext("2d");
    if (ctx) draw = globeRenderer(ctx);
  } else if (m.type === "data") {
    groups = globeCountries(m.topo);
    paint();
  } else if (m.type === "size") {
    size = m.size;
    dpr = m.dpr;
    if (canvas) canvas.width = canvas.height = Math.round(size * dpr);
    paint();
  } else if (m.type === "spin") {
    spinning = m.on;
    if (spinning && !timer) {
      last = performance.now();
      tick();
    } else if (!spinning && timer) {
      clearTimeout(timer);
      timer = 0;
    }
  } else if (m.type === "drag") {
    dragFrom = m.start ? lon : null;
  } else if (m.type === "turn") {
    if (dragFrom !== null) lon = dragFrom + m.by;
    if (!spinning) paint();
  }
};
