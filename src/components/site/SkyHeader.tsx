import type { ReactNode } from "react";
import { GlobeLazy } from "@/components/home/GlobeLazy";

/**
 * The top of a results card: deep space with the homepage's slowly turning globe rising out of the bottom like the
 * Earth from orbit, and the score on top in white. It bleeds to the card's edges, so it goes first inside a card padded
 * p-5 sm:p-7. Purely decorative: the globe is hidden from screen readers, stands still for reduced motion and only
 * spins on screen.
 */
export function SkyHeader({ children }: { children: ReactNode }) {
  return (
    <div className="space-sky relative -mx-5 -mt-5 overflow-hidden rounded-t-[26px] px-5 pb-28 pt-5 text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.5)] sm:-mx-7 sm:-mt-7 sm:px-7 sm:pb-32 sm:pt-6">
      {/* stars (see .space-stars in globals.css) */}
      <div aria-hidden="true" className="space-stars" />
      <div aria-hidden="true" className="space-stars-bright" />
      {/* the Earth's top rises over the bottom edge: its box is far wider than the card on phones, and cropped. The glow
          of atmosphere is a still ring behind it (a filter on the spinning canvas would repaint every frame) */}
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-[424px] left-1/2 w-[520px] -translate-x-1/2 sm:-bottom-[488px] sm:w-[600px]">
        <div className="absolute inset-2 rounded-full shadow-[0_0_36px_10px_rgba(96,165,250,0.55)]" />
        <GlobeLazy label="" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
