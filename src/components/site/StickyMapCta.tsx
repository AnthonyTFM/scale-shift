"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { home } from "@/content/home";
import { loadSave, localDateKey } from "@/lib/daily";

// the bar is for long reading pages (home, eras, timeline, disputes, country sizes, teachers). Hidden on the games,
// the leaderboard (it has its own "play" banner, and the bar would cover the board), short pages, forms and the small print
const HIDDEN = /^\/(daily|endless|leaderboard|about|how-it-works|contact|privacy|terms|unsubscribed)(\/|$)/;
// pages where today's game is the better next step, until it's played
const PLAY_FIRST = /^\/eras(\/|$)/;

/**
 * Phone-only "open the map" bar. It slides away while you scroll down to read and comes back when you scroll up, so it
 * never sits on top of what you're reading. Only on long reading pages (see HIDDEN), and on the homepage until the hero (with its own map button and the globe) has
 * scrolled fully out of view. On era pages it offers today's game instead, until that's played.
 */
export function StickyMapCta() {
  const path = usePathname();
  const [pastHero, setPastHero] = useState(path !== "/");
  const [scrollingDown, setScrollingDown] = useState(false);
  // null until this browser's saved game has been read (after load). Blocked storage, or a game played on another
  // device, reads as unplayed: the bar then offers the game, and /daily shows the result straight away.
  const [unplayed, setUnplayed] = useState<boolean | null>(null);

  useEffect(() => {
    queueMicrotask(() => setUnplayed(typeof loadSave().days[localDateKey()]?.s !== "number"));
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
  const playFirst = PLAY_FIRST.test(path);
  const play = playFirst && unplayed === true;
  // on play-first pages the bar waits for that check, so it slides in once with the right button instead of swapping
  const shown = pastHero && !scrollingDown && (!playFirst || unplayed !== null);
  const label = play ? home.stickyPlay : home.stickyCta;
  return (
    <aside
      aria-label={label}
      aria-hidden={!shown}
      inert={!shown}
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-3 pb-2 pt-3 backdrop-blur transition-transform duration-200 md:hidden ${
        shown ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <Link href={play ? "/daily" : "/map"} className={`btn ${play ? "btn-gold" : "btn-primary"} btn-lg mb-1.5 w-full`}>
        {label}
      </Link>
    </aside>
  );
}
