"use client";

import { useEffect, useRef } from "react";
import { geoGraticule10, geoOrthographic, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { POLITICAL } from "@/lib/palette";

type Country = { type: "Feature"; properties: { n: string; k: number }; geometry: GeoPermissibleObjects };

const TILT = -18; // degrees: show a little more of the north, where most people live
const SPEED = 6; // degrees per second
const FRAME_MS = 50; // 20 frames a second is smooth enough for a slow spin and keeps phones responsive

/** A slowly turning globe drawn from our own borders. Drag to spin it. Decorative: the page works without it. */
export function Globe({ label }: { label: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current!;
    const box = wrap.current!;
    const ctx = el.getContext("2d")!;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let countries: Country[] = [];
    let lon = -20;
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
      const r = size / 2 - 8;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      proj.scale(r).translate([size / 2, size / 2]).rotate([lon, TILT]);
      ctx.beginPath();
      path(graticule);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
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
      ctx.strokeStyle = "rgba(88, 60, 46, 0.45)";
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

    fetch("/data/globe.json")
      .then((r) => r.json())
      .then((topo: Topology<{ p: GeometryCollection<{ n: string; k: number }> }>) => {
        if (disposed) return;
        countries = (feature(topo, topo.objects.p) as unknown as { features: Country[] }).features;
        draw();
        const go = () =>
          window.setTimeout(() => {
            ready = true;
            start();
          }, 1200);
        if (document.readyState === "complete") go();
        else window.addEventListener("load", go, { once: true });
      })
      .catch(() => {
        /* the globe stays as a plain ocean sphere */
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
      {/* sea lit from the top left, with a soft glow */}
      <div
        aria-hidden="true"
        className="absolute inset-2 rounded-full bg-[radial-gradient(circle_at_38%_32%,#b9def0,#4f8fbf_75%)] shadow-[0_0_40px_6px_rgba(120,190,240,0.35)]"
      />
      <canvas ref={canvas} role="img" aria-label={label} className="relative block cursor-grab touch-pan-y" />
      {/* shade the far edge so it reads as a sphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-2 rounded-full bg-[radial-gradient(circle_at_38%_32%,transparent_55%,rgba(14,42,71,0.4)_100%)]"
      />
    </div>
  );
}
