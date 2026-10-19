import erasData from "@/data/eras.json";
import { events, type TerritoryEvent } from "@/content/events";

export type EraMeta = {
  key: string;
  year: number | "present";
  label: string;
  count: number;
  precision: number;
  bytes: number;
};

export const eras = erasData as EraMeta[];

/** The "Present" layer is Natural Earth (current borders); events after the last snapshot belong to it. */
export const PRESENT_SORT_YEAR = 9999;

export const eraYear = (e: EraMeta) => (e.year === "present" ? PRESENT_SORT_YEAR : e.year);
export const eraIndex = (key: string) => eras.findIndex((e) => e.key === key);
export const eraByKey = (key: string) => eras.find((e) => e.key === key);
export const eraSlug = (key: string) => key.replace(/bce$/, "-bce");
export const keyFromSlug = (slug: string) => slug.replace(/-bce$/, "bce");

/** "The world in 1914" / "The world today" */
export const eraTitle = (e: EraMeta) => (e.key === "present" ? "The world today" : `The world in ${e.label}`);
/** "1914" / "today" for use mid-sentence */
export const eraPhrase = (e: EraMeta) => (e.key === "present" ? "today" : e.label);

export function formatYear(y: number, approx = false) {
  const base = y < 0 ? `${-y} BCE` : y < 1000 ? `${y} CE` : `${y}`;
  return approx ? `c. ${base}` : base;
}

/** First snapshot at or after a year — the earliest map that should reflect an event. */
export function eraForYear(year: number): EraMeta {
  return eras.find((e) => eraYear(e) >= year) ?? eras[eras.length - 1];
}

/** Curated events whose "taken" year falls after the previous snapshot and up to this one. */
export function eventsForEra(key: string): TerritoryEvent[] {
  const i = eraIndex(key);
  if (i < 0) return [];
  const to = eraYear(eras[i]);
  const from = i > 0 ? eraYear(eras[i - 1]) : -Infinity;
  return events.filter((ev) => ev.taken > from && ev.taken <= to).sort((a, b) => a.taken - b.taken);
}

export function eventsForPolity(names: string[]): TerritoryEvent[] {
  const set = new Set(names);
  return events.filter((ev) => ev.polities.some((p) => set.has(p))).sort((a, b) => a.taken - b.taken);
}

export function settleTime(ev: TerritoryEvent): string {
  if (ev.formalized === null) return ev.status === "disputed" ? "Never formally settled" : "Never formalized";
  const gap = ev.formalized - ev.taken;
  if (gap === 0) return "Formalized the same year";
  if (gap < 0) return `Agreed ${-gap} year${gap === -1 ? "" : "s"} before control changed hands`;
  return `${gap} year${gap === 1 ? "" : "s"} from control to formal recognition`;
}

/** Read a typed year: "1453", "300 BC", "300 BCE", "-300", "AD 79", "79 CE". Returns null if it isn't a year. */
export function parseYear(text: string): number | null {
  const t = text.trim().toUpperCase().replace(/\./g, "").replace(/,/g, "");
  const m = t.match(/^(AD|CE)?\s*(-)?\s*(\d{1,4})\s*(BCE|BC|CE|AD)?$/);
  if (!m) return null;
  const n = Number(m[3]);
  if (!n) return null;
  const bce = !!m[2] || m[4] === "BC" || m[4] === "BCE";
  if (bce && (m[1] || m[4] === "AD" || m[4] === "CE")) return null;
  return bce ? -n : n;
}

/** Year the "Present" map stands for, when matching a typed year to a snapshot. */
export const PRESENT_MAP_YEAR = 2020;

/** The snapshot to show for a typed year: the last map drawn at or before it. */
export function snapshotForYear(year: number): EraMeta {
  let best = eras[0];
  for (const e of eras) {
    const y = e.year === "present" ? PRESENT_MAP_YEAR : e.year;
    if (y <= year) best = e;
  }
  return best;
}
