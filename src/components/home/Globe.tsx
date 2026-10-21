"use client";

import { useEffect, useRef } from "react";
import { geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { POLITICAL } from "@/lib/palette";
import { dropSlivers, GLOBE_INSET, GLOBE_START_LON, GLOBE_TILT, type GlobeCountry, type RawGlobeCountry } from "@/lib/globe";

type Country = GlobeCountry;

const TILT = GLOBE_TILT;
const SPEED = 6; // degrees per second
const FRAME_MS = 50; // 20 frames a second is smooth enough for a slow spin and keeps phones responsive

/** A slowly turning globe drawn from our own borders. Drag to spin it. Decorative: the page works without it. */
export function Globe({ label, onReady }: { label: string; onReady?: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  // the latest onReady, read once the countries are drawn (keeps the set-up effect from re-running)
  const readyCb = useRef(onReady);
  useEffect(() => {
    readyCb.current = onReady;
  });

  useEffect(() => {
    const el = canvas.current!;
    const box = wrap.current!;
    const ctx = el.getContext("2d")!;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let countries: Country[] = [];
    let lon = GLOBE_START_LON;
    let size = 0;
    let dpr = 1;
    let visible = true;
    let raf = 0;
    let last = 0;
    let drag: { x: number; lon: number } | null = null;
    let disposed = false;

    const proj = geoOrthographic().clipAngle(90);
    const path = geoPath(proj, ctx);
    let lastDraw = 0;
    const graticule = geoGraticule10();

    const resize = () => {
      size = Math.max(1, Math.round(box.getBoundingClientRect().width));
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      el.width = el.height = Math.round(size * dpr);
      el.style.width = el.style.height = `${size}px`;
      draw();
    };

    // Only the turning parts (grid and countries) are drawn here; the sea, glow and edge shading are CSS layers.
    function draw() {
      const r = size / 2 - GLOBE_INSET;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      proj.scale(r).translate([size / 2, size / 2]).rotate([lon, TILT]);
      ctx.beginPath();
      path(graticule);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
      ctx.lineWidth = 0.6;
      ctx.stroke();
      // one path per colour (8 fills instead of ~200), then all borders in one stroke
      const groups = POLITICAL.map(() => new Path2D());
      const pathTo = geoPath(proj);
      for (const c of countries) pathTo.context(groups[c.properties.k % POLITICAL.length] as unknown as CanvasRenderingContext2D)(c.geometry);
      groups.forEach((g, i) => {
        ctx.fillStyle = POLITICAL[i];
        ctx.fill(g);
      });
      ctx.strokeStyle = "rgba(88, 60, 46, 0.35)";
      ctx.lineWidth = 0.5;
      for (const g of groups) ctx.stroke(g);
    }

    const tick = (now: number) => {
      raf = 0;
      if (!last) last = now;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!drag) lon += SPEED * dt;
      if (now - lastDraw >= FRAME_MS) {
        lastDraw = now;
        draw();
      }
      if (visible && !still && !document.hidden) raf = requestAnimationFrame(tick);
    };
    // spin only once the page has finished loading, so the globe never slows the first paint or first taps
    let ready = false;
    const start = () => {
      if (ready && !raf && !still && visible && !document.hidden) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };

    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, lon };
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      lon = drag.lon + ((e.clientX - drag.x) / size) * 180;
      if (still || !raf) draw();
    };
    const up = () => {
      drag = null;
      el.style.cursor = "grab";
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });
    io.observe(box);
    const onVisibility = () => start();
    document.addEventListener("visibilitychange", onVisibility);
    const ro = new ResizeObserver(resize);
    ro.observe(box);

    // a dropped connection shouldn't leave an empty ocean: try again a couple of times
    const load = (tries: number): Promise<Topology<{ p: GeometryCollection<{ n: string; k: number }> }>> =>
      fetch("/data/globe.json")
        .then((r) => {
          if (!r.ok) throw new Error(`globe ${r.status}`);
          return r.json();
        })
        .catch((e) => (tries > 0 ? new Promise((ok) => setTimeout(ok, 800)).then(() => load(tries - 1)) : Promise.reject(e)));
    load(2)
      .then((topo) => {
        if (disposed) return;
        countries = (feature(topo, topo.objects.p) as unknown as { features: RawGlobeCountry[] }).features.map(dropSlivers);
        draw();
        readyCb.current?.();
        const go = () =>
          window.setTimeout(() => {
            ready = true;
            start();
          }, 1200);
        if (document.readyState === "complete") go();
        else window.addEventListener("load", go, { once: true });
      })
      .catch(() => {
        /* the still picture of the globe stays in place */
      });

    resize();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, []);

  return (
    <div ref={wrap} className="relative aspect-square w-full">
      {/* a light, daylight sea lit from the top left, with a soft glow */}
      <div
        aria-hidden="true"
        className="absolute inset-2 rounded-full bg-[radial-gradient(circle_at_38%_32%,#f1f8ff,#a9d3f0_78%)] shadow-[0_0_44px_8px_rgba(37,99,235,0.12)]"
      />
      <canvas ref={canvas} role="img" aria-label={label} className="relative block cursor-grab touch-pan-y" />
      {/* shade the far edge so it reads as a sphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-2 rounded-full bg-[radial-gradient(circle_at_38%_32%,transparent_58%,rgba(29,33,64,0.16)_100%)]"
      />
    </div>
  );
}
