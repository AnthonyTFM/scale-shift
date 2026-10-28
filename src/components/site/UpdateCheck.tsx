"use client";

import { useEffect } from "react";

const BUILD = process.env.BUILD_ID;
/** how often an open, visible tab asks whether a new version is out */
const EVERY = 10 * 60_000;
/** never ask more often than this (a tab flicking between apps) */
const GAP = 60_000;

/** pages where reloading can't lose anything you typed (forms, search boxes and the map are left alone) */
const RELOADABLE = /^\/(?:|daily|endless|leaderboard|eras(?:\/[^/]+)?)$/;

/**
 * A daily game is often left open in a tab for days, which would keep running the old version. This asks, in the
 * background, which build is live (when the tab comes back, and every 10 minutes while it's visible). Once a newer one
 * is out, coming back to the tab reloads it, but only at a safe moment: on a game or browsing page, with no round in
 * play (see PlayingMark) and no pop-up open. Elsewhere the new version arrives with the next link: Next.js itself does
 * a full page load when the live build differs from the tab's.
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
    const safe = () =>
      RELOADABLE.test(location.pathname) &&
      !document.documentElement.dataset.playing &&
      !document.querySelector('dialog[open], [role="dialog"], [aria-modal="true"]');
    const onVisible = async () => {
      if (document.visibilityState !== "visible") return;
      await check();
      if (stale && safe()) location.reload();
    };
    const id = setInterval(() => document.visibilityState === "visible" && check(), EVERY);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
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
