import type { ReactNode } from "react";
import { GlobeLazy } from "@/components/home/GlobeLazy";

/**
 * The top of a results card: a blue sky with the homepage's slowly turning globe rising out of the bottom, and the
 * score on top in white. It bleeds to the card's edges, so it goes first inside a card padded p-5 sm:p-7. Purely
 * decorative: the globe is hidden from screen readers, stands still for reduced motion and only spins on screen.
 */
export function SkyHeader({ children }: { children: ReactNode }) {
  return (
    <div className="relative -mx-5 -mt-5 overflow-hidden rounded-t-[26px] bg-[linear-gradient(180deg,#1d4ed8_0%,#2563eb_calc(100%_-_7rem),#7fb2f8_100%)] sm:bg-[linear-gradient(180deg,#1d4ed8_0%,#2563eb_calc(100%_-_8rem),#7fb2f8_100%)] px-5 pb-28 pt-5 text-white [text-shadow:0_2px_12px_rgba(15,23,42,0.35)] sm:-mx-7 sm:-mt-7 sm:px-7 sm:pb-32 sm:pt-6">
      {/* the sky stays deep blue wherever there's text (white on it passes AA); it lightens only behind the globe */}
      {/* faint stars */}
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] bg-size-[26px_26px]" />
      {/* the globe's top rises over the horizon: its box is far wider than the card on phones, and cropped */}
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-[424px] left-1/2 w-[520px] -translate-x-1/2 sm:-bottom-[488px] sm:w-[600px]">
        <GlobeLazy label="" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
