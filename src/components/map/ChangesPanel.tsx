"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { eraByKey, eraIndex, eras, eraSlug, eventsForEra } from "@/lib/eras";
import { formatArea, type AreaUnit } from "@/lib/format";
import { TakenFormalized } from "@/components/EventCard";
import dataVersion from "@/data/data-version.json";

type Change = { n: string; was?: string; from: number; to: number };
type Named = { n: string; a: number };
const renamed = (c: Change) => (c.was ? `${c.n} (was ${c.was})` : c.n);
export type EraStats = { key: string; top: Named[]; gained: Change[]; lost: Change[]; appeared: Named[]; vanished: Named[] };

let statsPromise: Promise<EraStats[]> | null = null;
const loadStats = () => (statsPromise ??= fetch(`/data/era-stats.json?v=${dataVersion.v}`).then((r) => r.json() as Promise<EraStats[]>));

type Props = { era: string; unit: AreaUnit; onClose: () => void; onFocus: (lon: number, lat: number) => void };

function List({ title, items }: { title: string; items: { n: string; detail: string }[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-panel-muted">{title}</h4>
      <ul className="mt-1 space-y-0.5 text-sm">
        {items.map((it) => (
          <li key={it.n} className="flex justify-between gap-2">
            <span className="truncate">{it.n}</span>
            <span className="shrink-0 text-panel-muted">{it.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChangesPanel({ era, unit, onClose, onFocus }: Props) {
  const [stats, setStats] = useState<EraStats | null>(null);
  useEffect(() => {
    let alive = true;
    loadStats()
      .then((all) => alive && setStats(all.find((s) => s.key === era) ?? null))
      .catch(() => alive && setStats(null));
    return () => {
      alive = false;
    };
  }, [era]);
  const i = eraIndex(era);
  const prev = i > 0 ? eras[i - 1] : null;
  const evs = eventsForEra(era);
  const meta = eraByKey(era);

  return (
    <section aria-label={`What changed by ${meta?.label}`} className="rounded-2xl bg-panel p-4 text-panel-text shadow-float">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-panel-muted">
            {prev ? `${prev.label} → ${meta?.label}` : meta?.label}
          </p>
          <h2 className="font-display text-xl">What changed?</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-lg text-panel-muted hover:bg-white/10">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      {evs.length ? (
        <ol className="mt-3 space-y-2">
          {evs.map((ev) => (
            <li key={ev.id}>
              <button type="button" onClick={() => onFocus(ev.lon, ev.lat)} className="w-full rounded-lg bg-black/20 p-3 text-left hover:bg-black/30">
                <span className="block text-sm font-semibold">{ev.title}</span>
                <TakenFormalized ev={ev} dark />
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-sm text-panel-muted">No curated events in this period yet.</p>
      )}
      {stats && era !== "present" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <List title="Grew most" items={stats.gained.slice(0, 5).map((c) => ({ n: renamed(c), detail: `+${formatArea(c.to - c.from, unit)}` }))} />
          <List title="Shrank most" items={stats.lost.slice(0, 5).map((c) => ({ n: renamed(c), detail: `−${formatArea(c.from - c.to, unit)}` }))} />
          <List title="Appeared" items={stats.appeared.slice(0, 5).map((c) => ({ n: c.n, detail: formatArea(c.a, unit) }))} />
          <List title="Gone" items={stats.vanished.slice(0, 5).map((c) => ({ n: c.n, detail: formatArea(c.a, unit) }))} />
        </div>
      ) : null}
      <p className="mt-3 text-xs text-panel-muted">
        Area changes compare two snapshots; some reflect better mapping, not history.{" "}
        <Link href={`/eras/${eraSlug(era)}`} className="font-semibold text-accent underline">
          Full {era === "present" ? "present-day" : meta?.label} page
        </Link>
      </p>
    </section>
  );
}
