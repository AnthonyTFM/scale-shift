"use client";

import { useSyncExternalStore } from "react";
import { GlobeLazy } from "@/components/home/GlobeLazy";

const WIDE = "(min-width: 1024px)";

/**
 * The spinning Earth on the right of a page header, on wide screens only, clear of the text beside it. It mounts only there, so phones never load the
 * globe's code, data or worker (they get the still horizon in PageHero instead).
 */
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export function SpaceGlobe() {
  // false on the server and on narrow screens
  const wide = useSyncExternalStore(subscribe, () => window.matchMedia(WIDE).matches, () => false);
  if (!wide) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute -bottom-[250px] -right-[200px] w-[440px] xl:-bottom-[330px] xl:-right-[140px] xl:w-[620px]">
      <div className="absolute inset-2 rounded-full shadow-[0_0_36px_10px_rgba(96,165,250,0.55)]" />
      <GlobeLazy label="" />
    </div>
  );
}
