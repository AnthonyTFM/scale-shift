"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadEndless } from "@/lib/endless";
import { home } from "@/content/home";
import { FlameIcon, flameTier, TrophyIcon } from "@/components/site/Icons";

/** The best streak ever: unknown while loading, null when the board is empty, "failed" when it couldn't be reached. */
type Top = { name: string; score: number } | null | "failed";

// read here, not imported from the game, so the homepage doesn't load the game's code
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A number that counts up from 0 once it's known (shown at once with reduced motion). */
function CountUp({ to }: { to: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (reducedMotion() || to <= 0) {
      const id = requestAnimationFrame(() => setV(to));
      return () => cancelAnimationFrame(id);
    }
    const start = performance.now();
    const ms = Math.min(1200, 300 + to * 60);
    let id = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setV(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [to]);
  return <>{v}</>;
}

/** Endless mode's tile at the top of the homepage, beside the daily's: your best streak, the best ever and one button. */
export function HeroEndless() {
  const t = home.hub;
  // your best lives in this browser; the best ever comes from the Best streaks board
  const [best, setBest] = useState<number | null>(null);
  const [top, setTop] = useState<Top | undefined>(undefined);

  useEffect(() => {
    const read = () => setBest(loadEndless().best);
    read();
    window.addEventListener("focus", read);
    const ctrl = new AbortController();
    fetch("/api/endless?scope=all&limit=1", { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { rows?: { name: string; score: number }[] }) => setTop(d.rows?.[0] ?? null))
      .catch(() => {
        // leaving the page cancels the request: that isn't a failure to show
        if (!ctrl.signal.aborted) setTop("failed");
      });
    return () => {
      window.removeEventListener("focus", read);
      ctrl.abort();
    };
  }, []);

  return (
    <div className="flex flex-col rounded-card bg-[linear-gradient(160deg,var(--color-gold-soft),var(--color-gold-pale))] p-4 text-ink shadow-float ring-1 ring-gold/70 sm:p-5">
      <p className="flex min-h-4 items-center gap-1 text-xs font-bold uppercase tracking-wide text-ink-soft">
        <FlameIcon className="flame-flicker size-4" /> {t.endlessEyebrow}
      </p>
      <h2 className="mt-1 font-display text-xl leading-tight sm:text-2xl md:text-3xl">
        <Link href="/endless" className="hover:underline">
          {t.endlessTitle}
        </Link>
      </h2>
      {/* one line: your best and the best ever (or what the game is, before your first run) */}
      <p className="mt-2 flex min-h-7 flex-wrap items-center gap-x-2.5 font-display text-lg tabular-nums leading-tight sm:text-xl">
        {best === null ? null : best > 0 ? (
          <span className="inline-flex items-center gap-1">
            <FlameIcon className="flame-flicker size-5" tier={flameTier(best)} />
            <span aria-hidden="true">
              <CountUp to={best} />
            </span>
            <span className="sr-only">{t.endlessBestSr(best)}</span>
          </span>
        ) : (
          <span className="text-base text-muted">{t.endlessNew}</span>
        )}
        {top && top !== "failed" ? (
          <span className="inline-flex items-center gap-1 text-base text-muted" title={top.name}>
            <TrophyIcon className="size-4" />
            {t.endlessTopLine(top.score)}
          </span>
        ) : null}
      </p>
      <div className="mt-auto pt-3">
        <Link href="/endless" className="btn btn-gold group h-12 w-full px-3 sm:w-auto sm:px-6">
          <span className="sm:hidden">{best ? t.endlessCtaBeat(best) : t.endlessCta}</span>
          <span className="hidden sm:inline">{best ? t.endlessCtaBeatLong(best) : t.endlessCtaLong}</span>
          <span aria-hidden="true" className="transition group-hover:translate-x-1">
            →
          </span>
        </Link>
        {/* the same height as the daily tile's countdown line, so the two tiles match */}
        <p className="mt-1.5 min-h-4" aria-hidden="true" />
      </div>
    </div>
  );
}
