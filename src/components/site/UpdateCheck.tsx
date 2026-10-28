"use client";

import { useEffect } from "react";

const BUILD = process.env.BUILD_ID;
/** how often an open, visible tab asks whether a new version is out */
const EVERY = 10 * 60_000;
/** never ask more often than this (a tab flicking between apps) */
const GAP = 60_000;

/**
 * A daily game is often left open in a tab for days, which would keep running the old version. This asks, in the
 * background, which build is live; once a newer one is out, it arrives at the next safe moment, never mid-round:
 * - the next link to another page loads it fresh (a full page load instead of an in-app one);
 * - coming back to the tab reloads it, unless a round is in play (see PlayingMark), a pop-up is open, or it's the map
 *   (where your dragged shapes would go).
 */
export function UpdateCheck() {
  useEffect(() => {
    if (!BUILD || BUILD === "dev") return;
    let stale = false;
    let last = 0;
    const check = async () => {
      if (stale || Date.now() - last < GAP) return;
      last = Date.now();
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const { v } = (await res.json()) as { v?: string };
        if (v && v !== "dev" && v !== BUILD) stale = true;
      } catch {
        /* offline: ask again later */
      }
    };
    const safe = () => !document.documentElement.dataset.playing && !location.pathname.startsWith("/map") && !document.querySelector("dialog[open], [aria-modal='true']");
    const onVisible = async () => {
      if (document.visibilityState !== "visible") return;
      await check();
      if (stale && safe()) location.reload();
    };
    // with a new version out, a link to another page loads it fresh (capture phase: before the in-app navigation)
    const onClick = (e: MouseEvent) => {
      if (!stale || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || a.target || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      e.preventDefault();
      e.stopPropagation();
      location.assign(url.href);
    };
    const id = setInterval(() => document.visibilityState === "visible" && check(), EVERY);
    document.addEventListener("visibilitychange", onVisible);
    document.addEventListener("click", onClick, true);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("click", onClick, true);
    };
  }, []);
  return null;
}

/** Marks a round in play (html[data-playing]), so a new version never reloads the page in the middle of it. */
export function PlayingMark({ on }: { on: boolean }) {
  useEffect(() => {
    if (!on) return;
    document.documentElement.dataset.playing = "1";
    return () => {
      delete document.documentElement.dataset.playing;
    };
  }, [on]);
  return null;
}
