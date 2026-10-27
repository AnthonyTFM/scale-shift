"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadEndless } from "@/lib/endless";
import { home } from "@/content/home";
import { FlameIcon, TrophyIcon } from "@/components/site/Icons";

type Top = { name: string; score: number } | null;

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

/** The hero's second card, beside today's game: endless mode, your best streak and the best ever. */
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
      .catch(() => setTop(null));
    return () => {
      window.removeEventListener("focus", read);
      ctrl.abort();
    };
  }, []);

  return (
    <div className="flex flex-col rounded-card bg-[linear-gradient(160deg,var(--color-gold-soft),#ffe7a8)] p-5 text-ink shadow-float ring-1 ring-gold/70 md:px-6 md:py-5">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-soft">
        <FlameIcon className="flame-flicker size-5" /> {t.endlessEyebrow}
      </p>
      <h2 className="mt-2 font-display text-3xl leading-tight md:text-4xl">
        <Link href="/endless" className="hover:underline">
          {t.endlessTitle}
        </Link>
      </h2>
      <p className="mt-1 max-w-md text-ink-soft">{t.endlessLead}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/80 px-3 py-2.5 ring-1 ring-gold/50">
          <dt className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t.endlessYourBest}</dt>
          <dd className="mt-0.5 flex min-h-9 items-center gap-1.5 font-display text-3xl tabular-nums leading-none">
            {best === null ? null : best > 0 ? (
              <>
                <FlameIcon className="flame-flicker size-7" />
                <span aria-hidden="true">
                  <CountUp to={best} />
                </span>
                <span className="sr-only">{t.endlessSr(best)}</span>
              </>
            ) : (
              <span className="text-base font-bold text-muted">{t.endlessNoBest}</span>
            )}
          </dd>
        </div>
        <div className="rounded-2xl bg-white/80 px-3 py-2.5 ring-1 ring-gold/50">
          <dt className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t.endlessTop}</dt>
          <dd className="mt-0.5 flex min-h-9 items-center gap-1.5 font-display text-3xl tabular-nums leading-none">
            {top === undefined ? null : top ? (
              <>
                <TrophyIcon className="size-7" />
                <span aria-hidden="true">
                  <CountUp to={top.score} />
                </span>
                <span className="sr-only">{t.endlessSr(top.score)}</span>
              </>
            ) : (
              <span className="text-base font-bold text-muted">{t.endlessTopNone}</span>
            )}
          </dd>
          {top ? <dd className="mt-1 truncate text-xs font-semibold text-muted">{t.endlessTopBy(top.name)}</dd> : null}
        </div>
      </dl>
      <div className="mt-auto pt-4">
        <Link href="/endless" className="btn btn-gold btn-lg group">
          {best ? t.endlessCtaBeat(best) : t.endlessCta}
          <span aria-hidden="true" className="transition group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}
