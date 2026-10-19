"use client";

import dynamic from "next/dynamic";

// The globe's drawing code loads after the page is on screen; until then a plain sphere holds its place.
const Globe = dynamic(() => import("./Globe").then((m) => m.Globe), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="aspect-square w-full rounded-full bg-[radial-gradient(circle_at_38%_32%,#b9def0,#4f8fbf_70%)] p-2" />,
});

export function GlobeLazy({ label }: { label: string }) {
  return <Globe label={label} />;
}
