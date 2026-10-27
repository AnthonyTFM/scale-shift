"use client";

import Link from "next/link";
import { geoDistance } from "d3-geo";
import { disputes, type Dispute } from "@/content/disputes";
import { events } from "@/content/events";
import { appCopy } from "@/content/site";
import type { PolityFeature, RulersGrid } from "@/lib/data";
import { rulersAt } from "@/lib/data";
import { eras, eraByKey, formatYear } from "@/lib/eras";
import { formatArea, type AreaUnit } from "@/lib/format";
import { EARTH_RADIUS_KM, type LonLat } from "@/lib/geo";
import { TakenFormalized } from "@/components/EventCard";
import { claims as allClaims, claimsAt, claimsForEra, treatyInForce, TREATY_YEAR, unclaimed } from "@/lib/antarctica";

export type Info = { at: LonLat; feature: PolityFeature | null; era: string };

type Props = {
  info: Info;
  grid: RulersGrid | null;
  unit: AreaUnit;
  currentEra: string;
  onClose: () => void;
  onAdd: (name: string, era: string) => void;
  onEra: (key: string) => void;
};

/** Disputes for a click: the one you clicked on first, then any others involving that country. */
export function disputesFor(at: LonLat, feature: PolityFeature | null) {
  const near = disputes
    .map((d) => ({ d, km: geoDistance([d.lon, d.lat], at) * EARTH_RADIUS_KM }))
    .filter((x) => x.km < 350 || x.d.id === feature?.props.d)
    .sort((a, b) => (a.d.id === feature?.props.d ? -1 : b.d.id === feature?.props.d ? 1 : a.km - b.km))
    .map((x) => x.d);
  const related = feature ? disputes.filter((d) => d.polities.includes(feature.props.n) && !near.includes(d)) : [];
  return [...near, ...related];
}

function DisputeBody({ d }: { d: Dispute }) {
  return (
    <div className="space-y-2 text-sm">
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-rose-200/80">Controlled by</dt>
          <dd className="font-semibold">{d.controlledBy}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-rose-200/80">Since</dt>
          <dd className="font-semibold">{formatYear(d.taken)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[11px] uppercase tracking-wide text-rose-200/80">Claimed by</dt>
          <dd className="font-semibold">{d.claimedBy.join(", ")}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[11px] uppercase tracking-wide text-rose-200/80">Made official?</dt>
          <dd>{d.formalStatus}</dd>
        </div>
      </dl>
      <p className="text-panel-muted">{d.summary}</p>
    </div>
  );
}

function Close({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="grid size-9 shrink-0 place-items-center rounded-lg text-panel-muted hover:bg-white/10 hover:text-white"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  );
}

export function DataNote({ text }: { text: string }) {
  return (
    <p className="rounded-lg bg-amber-300/10 p-2.5 text-xs leading-relaxed text-amber-100 ring-1 ring-amber-300/30">
      <span className="font-bold">Data note: </span>
      {text}
    </p>
  );
}

/** Who claims this spot of Antarctica, as of the era on screen. */
function AntarcticClaims({ at, era }: { at: LonLat; era: string }) {
  const found = claimsAt(at[0], at[1], era);
  if (!found) return null;
  const label = eraByKey(era)?.label;
  // the "unclaimed" wedge only means something once every claim around it had been made
  const allMade = found.list.length === 0 && found.unclaimedZone && claimsForEra(era).length === allClaims.length;
  return (
    <div className="mb-3 rounded-xl bg-sky-400/10 p-3 ring-1 ring-sky-300/30">
      <p className="text-xs font-bold uppercase tracking-wide text-sky-200">Antarctic claims here · {label}</p>
      {found.list.length ? (
        <ul className="mt-2 space-y-2 text-sm">
          {found.list.map((c) => (
            <li key={c.id}>
              <p className="flex items-center gap-2 font-semibold">
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                {c.claimant} · {c.name}
              </p>
              <p className="text-xs text-panel-muted">
                {c.note}
              </p>
            </li>
          ))}
        </ul>
      ) : allMade ? (
        <p className="mt-2 text-sm">
          <span className="font-semibold">{unclaimed.name}: unclaimed.</span> <span className="text-panel-muted">{unclaimed.note}</span>
        </p>
      ) : (
        <p className="mt-2 text-sm text-panel-muted">No country had claimed this part of Antarctica by {label}.</p>
      )}
      {found.list.length > 1 ? <p className="mt-2 text-xs font-semibold text-rose-200">{found.list.length} countries claim this same spot.</p> : null}
      {treatyInForce(era) ? (
        <p className="mt-2 text-xs text-panel-muted">
          Since the Antarctic Treaty ({TREATY_YEAR}), all claims are frozen: no new claims, and the continent is for peaceful science only. Most
          countries do not recognize any of the claims.
        </p>
      ) : null}
    </div>
  );
}

export function InfoSheet({ info, grid, unit, currentEra, onClose, onAdd, onEra }: Props) {
  const f = info.feature;
  const isPresent = info.era === "present";
  const inAntarctica = info.at[1] < -60;
  // in Antarctica the claims box below replaces the general Antarctica dispute card
  const disputeList = isPresent ? disputesFor(info.at, f).filter((d) => !(inAntarctica && d.id === "antarctica")) : [];
  const [first, ...others] = disputeList;
  const rulers = grid ? rulersAt(grid, info.at[0], info.at[1]) : null;
  // collapse consecutive eras into ranges: "1783 – 1914: Russian Empire"
  const ranges: { from: number; to: number; name: string | null }[] = [];
  if (rulers) {
    rulers.forEach((r, i) => {
      const end = i < rulers.length - 1 ? rulers[i + 1].era - 1 : eras.length - 1;
      ranges.push({ from: r.era, to: end, name: r.name });
    });
  }
  const nearby = events
    .filter((ev) => geoDistance([ev.lon, ev.lat], info.at) * EARTH_RADIUS_KM < 700 || (f && ev.polities.includes(f.props.n)))
    .sort((a, b) => a.taken - b.taken)
    .slice(0, 6);
  const eraLabel = eraByKey(info.era)?.label;
  const reportHref = `/contact?topic=border&era=${encodeURIComponent(eraLabel ?? "")}&region=${encodeURIComponent(
    f?.props.n ?? `${info.at[1].toFixed(2)}, ${info.at[0].toFixed(2)}`,
  )}`;

  return (
    <section aria-label={f ? f.props.n : "Place details"} className="rounded-2xl bg-panel p-4 text-panel-text shadow-float">
      <div className="mb-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-panel-muted">{eraLabel}</p>
          <h2 className="font-display text-xl leading-tight">{f ? f.props.n : "No state mapped here"}</h2>
          {f ? (
            <p className="text-xs text-panel-muted">
              {f.props.s ? `Ruled by ${f.props.s} · ` : ""}
              {f.props.p ? `Part of ${f.props.p} · ` : ""}
              {appCopy.precision[f.props.b]}
            </p>
          ) : (
            <p className="text-xs text-panel-muted">Unclaimed land, peoples without fixed borders, or land our maps leave blank in this era.</p>
          )}
        </div>
        <Close onClose={onClose} />
      </div>

      {f ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">≈ {formatArea(f.props.a, unit)}</span>
          {f.props.e ? <span className="text-panel-muted">({formatArea(f.props.e, unit)} with lands it controlled)</span> : null}
          <button
            type="button"
            onClick={() => onAdd(f.props.n, info.era)}
            className="ml-auto rounded-lg bg-accent px-3 py-1.5 text-sm font-bold text-panel hover:bg-accent-strong"
          >
            Add it to the map
          </button>
        </div>
      ) : null}

      {f?.props.w ? (
        <div className="mb-3">
          <DataNote text={f.props.w} />
        </div>
      ) : null}

      <h3 className="mt-1 text-sm font-bold">{appCopy.whoRuledTitle}</h3>
      <p className="mb-2 text-xs text-panel-muted">Who ruled this spot on each of our maps (accurate to about 100 km).</p>
      {!grid ? <p className="text-sm text-panel-muted">Loading 4,000 years of history…</p> : null}
      {grid && ranges.length === 0 ? <p className="text-sm text-panel-muted">Open ocean: no rulers recorded.</p> : null}
      <ol className="max-h-56 space-y-1 overflow-auto pr-1 text-sm">
        {ranges.map((r) => {
          const current = eras.findIndex((e) => e.key === currentEra);
          const active = current >= r.from && current <= r.to;
          const from = eras[r.from].label;
          const to = eras[r.to].label;
          return (
            <li key={r.from}>
              <button
                type="button"
                onClick={() => onEra(eras[r.from].key)}
                className={`flex w-full gap-3 rounded-md px-2 py-1 text-left hover:bg-white/10 ${active ? "bg-white/10 ring-1 ring-accent/60" : ""}`}
              >
                <span className="w-32 shrink-0 text-panel-muted">{from === to ? from : `${from} – ${to}`}</span>
                <span className={r.name ? "font-semibold" : "italic text-panel-muted"}>{r.name ?? "no state recorded"}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* order: drag its real size, who ruled here, then any disputes */}
      <div className="mt-4 empty:hidden">
      <AntarcticClaims at={info.at} era={info.era} />

      {first ? (
        <div className="rounded-xl bg-rose-500/15 p-3 ring-1 ring-rose-300/40">
          <p className="text-xs font-bold uppercase tracking-wide text-rose-200">Disputed · {first.name}</p>
          <div className="mt-2">
            <DisputeBody d={first} />
          </div>
          {others.length ? (
            <div className="mt-3 space-y-1 border-t border-rose-300/20 pt-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-200/80">
                Other disputes involving {f?.props.n ?? "this area"}
              </p>
              {others.map((d) => (
                <details key={d.id} className="rounded-lg bg-black/15 px-2 py-1.5">
                  <summary className="cursor-pointer text-sm font-semibold">{d.name}</summary>
                  <div className="mt-2">
                    <DisputeBody d={d} />
                  </div>
                </details>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      </div>

      {nearby.length ? (
        <>
          <h3 className="mt-4 text-sm font-bold">When this land changed hands</h3>
          <ol className="mt-2 max-h-64 space-y-2 overflow-auto pr-1">
            {nearby.map((ev) => (
              <li key={ev.id} className="rounded-lg bg-black/20 p-3">
                <p className="text-sm font-semibold">{ev.title}</p>
                <TakenFormalized ev={ev} dark />
              </li>
            ))}
          </ol>
        </>
      ) : null}

      <p className="mt-3 text-xs text-panel-muted">
        Spotted a mistake?{" "}
        <Link href={reportHref} className="font-semibold text-accent underline">
          Report a border error
        </Link>
      </p>
    </section>
  );
}
