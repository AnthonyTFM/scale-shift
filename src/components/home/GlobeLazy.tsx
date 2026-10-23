"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// The globe's drawing code loads after the page is on screen. Until it has drawn, a still picture of its first frame
// (public/globe-still.svg, made by scripts/build-globe.mjs) sits in its place, so the globe never shows up empty.
const Globe = dynamic(() => import("./Globe").then((m) => m.Globe), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="aspect-square w-full rounded-full bg-[radial-gradient(circle_at_38%_32%,#f1f8ff,#a9d3f0_78%)] p-2" />,
});

export function GlobeLazy({ label }: { label: string }) {
  const [ready, setReady] = useState(false);
  return (
    <div className="relative">
      <Globe label={label} onReady={() => setReady(true)} onGone={() => setReady(false)} />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${ready ? "opacity-0" : "opacity-100"}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a fixed-size decorative SVG, nothing to optimise */}
        <img src="/globe-still.svg" alt="" width={480} height={480} fetchPriority="high" className="h-auto w-full" />
      </div>
    </div>
  );
}
