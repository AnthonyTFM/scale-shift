"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { home } from "@/content/home";
import { loadSave, localDateKey } from "@/lib/daily";

// pages where the bar would only get in the way: forms and long reading
const HIDDEN = /^\/(daily|contact|privacy|terms|about|unsubscribed)(\/|$)/;
// pages where today's game is the better next step, until it's played
const PLAY_FIRST = /^\/(leaderboard|eras)(\/|$)/;

/**
 * Phone-only "open the map" bar. It slides away while you scroll down to read and comes back when you scroll up, so it
 * never sits on top of what you're reading. Hidden on the daily challenge so it never covers the game, on forms and
 * long reading pages, and on the homepage until the hero (with its own map button and the globe) has scrolled fully out
 * of view. On the leaderboard and era pages it offers today's game instead, until that's played.
 */
export function StickyMapCta() {
  const path = usePathname();
  const [pastHero, setPastHero] = useState(path !== "/");
  const [scrollingDown, setScrollingDown] = useState(false);
  const [unplayed, setUnplayed] = useState(false);

  useEffect(() => {
    // read after load: the saved game lives in this browser only
    queueMicrotask(() => setUnplayed(PLAY_FIRST.test(path) && typeof loadSave().days[localDateKey()]?.s !== "number"));
  }, [path]);

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

  if (HIDDEN.test(path)) return null;
  const shown = pastHero && !scrollingDown;
  const label = unplayed ? home.stickyPlay : home.stickyCta;
  return (
    <aside
      aria-label={label}
      aria-hidden={!shown}
      inert={!shown}
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-3 pb-2 pt-3 backdrop-blur transition-transform duration-200 md:hidden ${
        shown ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <Link href={unplayed ? "/daily" : "/map"} className={`btn ${unplayed ? "btn-gold" : "btn-primary"} btn-lg mb-1.5 w-full`}>
        {label}
      </Link>
    </aside>
  );
}
