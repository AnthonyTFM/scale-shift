"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { home } from "@/content/home";

/**
 * Phone-only "open the map" bar. It slides away while you scroll down to read and comes back when you scroll up, so it
 * never sits on top of what you're reading. Hidden on the daily challenge so it never covers the game, and on the
 * homepage until the hero (with its own map button and the globe) has scrolled fully out of view.
 */
export function StickyMapCta() {
  const path = usePathname();
  const [pastHero, setPastHero] = useState(path !== "/");
  const [scrollingDown, setScrollingDown] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const hero = path === "/" ? document.querySelector("[data-hero]") : null;
    const onScroll = () => {
      const y = window.scrollY;
      if (hero) setPastHero(hero.getBoundingClientRect().bottom <= 0);
      else setPastHero(true);
      // ignore tiny moves (and iOS bounce at the top) so the bar doesn't flicker
      if (Math.abs(y - last) < 8) return;
      setScrollingDown(y > last && y > 80);
      last = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [path]);

  if (path === "/daily") return null;
  const shown = pastHero && !scrollingDown;
  return (
    <div
      aria-hidden={!shown}
      inert={!shown}
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-3 pb-2 pt-3 backdrop-blur transition-transform duration-200 md:hidden ${
        shown ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <Link href="/map" className="btn btn-primary btn-lg mb-1.5 w-full">
        {home.stickyCta}
      </Link>
    </div>
  );
}
