"use client";

import { useEffect, useState } from "react";
import { POOL_V as V } from "@/lib/pool-version";
import { home } from "@/content/home";
import { capitalize, nameInSentence, sizeLine, type PoolEntry } from "@/lib/daily";
import type { ShapeFile } from "@/lib/outline";
import { getJson, loadPair, Proof } from "./Proof";

// the pair that makes the point best: a normal map draws Greenland bigger than India; India is the bigger one
const PAIR = ["greenland-present", "india-present"] as const;

const times = (r: number) => (r >= 10 ? r.toFixed(0) : r.toFixed(1));

/**
 * A first visit's proof, under the headline: Greenland and India as a normal map draws them, shrinking to their real
 * sizes (the same picture as yesterday's matchup, with a fixed pair). The frame and its lines are drawn straight away;
 * the shapes fill in when they arrive, so nothing moves. Hidden for returning players (see .hero-proof in globals.css).
 */
export function HeroProof() {
  const t = home.proof;
  const [pair, setPair] = useState<{ options: [PoolEntry, PoolEntry]; shapes?: [ShapeFile, ShapeFile] } | null | undefined>(undefined);

  useEffect(() => {
    // returning players never see it (hidden by .returning, set before paint): don't fetch the shapes for them
    if (document.documentElement.classList.contains("returning")) return;
    let stale = false;
    getJson<PoolEntry[]>(`/data/daily/index.json${V}`)
      .then((pool) => {
        const options = PAIR.map((id) => pool.find((e) => e.id === id));
        if (!options[0] || !options[1]) throw new Error("pair missing from the pool");
        const found = options as [PoolEntry, PoolEntry];
        if (stale) return;
        setPair({ options: found });
        return loadPair(found).then((shapes) => !stale && setPair({ options: found, shapes }));
      })
      .catch(() => !stale && setPair(null));
    return () => {
      stale = true;
    };
  }, []);

  // when the shapes can't load, the frame stays (so nothing jumps) and the headline makes the claim on its own
  const [a, b] = pair?.options ?? [];
  // India is the bigger one in real life; a normal map draws Greenland bigger
  const looks = a && b ? a.m / b.m : 0;
  const mapNote = a && b ? t.mapNote(capitalize(nameInSentence(a)), times(looks), nameInSentence(b)) : "";
  const realNote = a && b ? sizeLine(b, a) : "";
  return (
    <div className="hero-proof mt-4 max-w-sm" aria-busy={pair === undefined}>
      <Proof
        shapes={pair?.shapes}
        label={a && b ? home.yesterday.proofSr(a.n, b.n) : t.loading}
        mapLabel={home.yesterday.mapLabel}
        realLabel={home.yesterday.realLabel}
        replay={home.yesterday.replay}
      />
      <p className="mt-2 min-h-10 text-sm leading-snug text-ink-soft">
        {mapNote} <strong className="text-ink">{realNote}</strong>
      </p>
    </div>
  );
}
