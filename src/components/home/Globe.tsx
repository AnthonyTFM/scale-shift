"use client";

import { useEffect, useRef } from "react";
import { GLOBE_START_LON } from "@/lib/globe";
import { globeCountries, globeRenderer, type GlobeTopology } from "@/lib/globe-draw";
import type { GlobeMessage } from "./globe.worker";

const SPEED = 6; // degrees per second
const FRAME_MS = 50; // 20 frames a second is smooth enough for a slow spin
// Main-thread fallback only (browsers without OffscreenCanvas): on slow phones, draw less often so the spin takes about
// a quarter of the main thread, but never below 8 frames a second (110 ms lands on the 7th frame at 60 Hz, ~8.6 fps)
const BUDGET = 0.25;
const SLOWEST_MS = 110;

/** A globe drawn by the background worker, or on the main thread where workers can't draw. */
type Painter = {
  size(size: number, dpr: number): void;
  data(topo: GlobeTopology): void;
  spin(on: boolean): void;
  stop(): void;
};

/** Draws in a worker, so the spin never holds up taps and scrolling. */
function workerPainter(canvas: HTMLCanvasElement, drawn: () => void, failed: () => void): Painter | null {
  if (typeof Worker === "undefined" || !("transferControlToOffscreen" in canvas)) return null;
  let worker: Worker;
  try {
    worker = new Worker(new URL("./globe.worker.ts", import.meta.url), { type: "module" });
  } catch {
    return null;
  }
  const offscreen = canvas.transferControlToOffscreen();
  const send = (m: GlobeMessage, transfer: Transferable[] = []) => worker.postMessage(m, transfer);
  worker.onmessage = (e: MessageEvent<{ type: string }>) => (e.data.type === "drawn" ? drawn() : e.data.type === "failed" && failed());
  worker.onerror = () => failed();
  send({ type: "init", canvas: offscreen }, [offscreen]);
  return {
    size: (size, dpr) => send({ type: "size", size, dpr }),
    data: (topo) => send({ type: "data", topo }),
    spin: (on) => send({ type: "spin", on }),
    stop: () => worker.terminate(),
  };
}

/** Draws on the main thread, drawing less often on slow phones to keep the page responsive. */
function mainPainter(canvas: HTMLCanvasElement, drawn: () => void): Painter {
  const draw = globeRenderer(canvas.getContext("2d")!);
  let groups: ReturnType<typeof globeCountries> | null = null;
  let lon = GLOBE_START_LON;
  let size = 0;
  let dpr = 1;
  let raf = 0;
  let last = 0;
  let lastDraw = 0;
  let cost = 0; // recent time one frame takes to draw, ms
  let told = false;
  const paint = () => {
    if (!groups || !size) return;
    const t = performance.now();
    draw(groups, lon, size, dpr);
    cost = cost ? cost * 0.8 + (performance.now() - t) * 0.2 : performance.now() - t;
    if (!told) {
      told = true;
      drawn();
    }
  };
  const tick = (now: number) => {
    if (!last) last = now;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    lon += SPEED * dt;
    if (now - lastDraw >= Math.min(SLOWEST_MS, Math.max(FRAME_MS, cost / BUDGET))) {
      lastDraw = now;
      paint();
    }
    raf = requestAnimationFrame(tick);
  };
  return {
    size: (s, d) => {
      size = s;
      dpr = d;
      canvas.width = canvas.height = Math.round(s * d);
      paint();
    },
    data: (topo) => {
      groups = globeCountries(topo);
      paint();
    },
    spin: (on) => {
      if (on && !raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      } else if (!on && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    stop: () => {
      cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}

/** A slowly turning globe drawn from our own borders, behind the homepage hero. Decorative: the page works without it. */
export function Globe({ label, onReady, onGone }: { label: string; onReady?: () => void; onGone?: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const shade = useRef<HTMLDivElement>(null);
  // the latest onReady, read once the countries are drawn (keeps the set-up effect from re-running)
  const readyCb = useRef(onReady);
  const goneCb = useRef(onGone);
  useEffect(() => {
    readyCb.current = onReady;
    goneCb.current = onGone;
  });

  useEffect(() => {
    const box = wrap.current!;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let topo: GlobeTopology | null = null;
    let size = 0;
    let dpr = 1;
    let visible = true;
    let ready = false;
    let disposed = false;

    // A fresh canvas each time: a canvas handed to a worker can't be handed over again (React runs this twice in dev).
    let canvas: HTMLCanvasElement;
    let painter: Painter;
    const drawn = () => readyCb.current?.();
    const makeCanvas = () => {
      const c = document.createElement("canvas");
      // a globe used only as decoration (an empty label) isn't announced as a picture
      if (label) {
        c.setAttribute("role", "img");
        c.setAttribute("aria-label", label);
      }
      c.className = "relative block";
      box.insertBefore(c, shade.current);
      return c;
    };
    const setUp = (useWorker: boolean) => {
      canvas = makeCanvas();
      painter =
        (useWorker &&
          workerPainter(canvas, drawn, () => {
            // the worker couldn't start: draw on the main thread instead, on a new canvas
            if (disposed) return;
            painter.stop();
            canvas.remove();
            setUp(false);
            sync();
          })) ||
        mainPainter(canvas, drawn);
    };
    // tell a (new) painter everything it needs
    const sync = () => {
      canvas.style.width = canvas.style.height = `${size}px`;
      painter.size(size, dpr);
      if (topo) painter.data(topo);
      spin();
    };
    // spin only once the page has finished loading and while the globe is on screen
    const spin = () => {
      if (!disposed) painter.spin(ready && !still && visible && !document.hidden);
    };

    setUp(true);

    const resize = () => {
      size = Math.max(1, Math.round(box.getBoundingClientRect().width));
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.style.width = canvas.style.height = `${size}px`;
      painter.size(size, dpr);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      spin();
    });
    io.observe(box);
    document.addEventListener("visibilitychange", spin);
    const ro = new ResizeObserver(resize);
    ro.observe(box);

    // spin only once the page has finished loading, so the globe never slows the first paint or first taps
    let goTimer = 0;
    const go = () => {
      goTimer = window.setTimeout(() => {
        ready = true;
        spin();
      }, 1200);
    };

    // a dropped connection shouldn't leave an empty ocean: try again a couple of times
    const load = (tries: number): Promise<GlobeTopology> =>
      fetch("/data/globe.json")
        .then((r) => {
          if (!r.ok) throw new Error(`globe ${r.status}`);
          return r.json();
        })
        .catch((e) => (tries > 0 ? new Promise((ok) => setTimeout(ok, 800)).then(() => load(tries - 1)) : Promise.reject(e)));
    load(2)
      .then((t) => {
        if (disposed) return;
        topo = t;
        painter.data(t);
        if (document.readyState === "complete") go();
        else window.addEventListener("load", go, { once: true });
      })
      .catch(() => {
        /* the still picture of the globe stays in place */
      });

    resize();
    return () => {
      disposed = true;
      window.clearTimeout(goTimer);
      window.removeEventListener("load", go);
      painter.stop();
      canvas.remove();
      io.disconnect();
      ro.disconnect();
      // the canvas is gone: show the still picture again until the next one has drawn (coming Back to the page)
      goneCb.current?.();
      document.removeEventListener("visibilitychange", spin);
    };
    // the label is read once: it doesn't change while the page is open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrap} className="relative aspect-square w-full">
      {/* a light, daylight sea lit from the top left, with a soft glow */}
      <div
        aria-hidden="true"
        className="absolute inset-2 rounded-full bg-[radial-gradient(circle_at_38%_32%,#f1f8ff,#a9d3f0_78%)] shadow-[0_0_44px_8px_rgba(37,99,235,0.12)]"
      />
      {/* the canvas goes here: it's made in the effect above */}
      {/* shade the far edge so it reads as a sphere */}
      <div
        ref={shade}
        aria-hidden="true"
        className="pointer-events-none absolute inset-2 rounded-full bg-[radial-gradient(circle_at_38%_32%,transparent_58%,rgba(29,33,64,0.16)_100%)]"
      />
    </div>
  );
}
