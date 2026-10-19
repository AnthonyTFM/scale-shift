import type { Entity, EntityKind } from "./types";

export const TODAY = 2026;

export function yearLabel(year: number): string {
  if (year >= TODAY) return "Today";
  if (year < 0) return `${-year} BC`;
  if (year < 1000) return `AD ${year}`;
  return String(year);
}

const nf = new Intl.NumberFormat("en-US");

export function formatKm2(km2: number): string {
  if (km2 >= 1_000_000) return `${(km2 / 1_000_000).toFixed(2)} million km²`;
  return `${nf.format(Math.round(km2))} km²`;
}

export function formatMi2(km2: number): string {
  const mi2 = km2 / 2.589988;
  if (mi2 >= 1_000_000) return `${(mi2 / 1_000_000).toFixed(2)} million sq mi`;
  return `${nf.format(Math.round(mi2))} sq mi`;
}

export function formatPopulation(p: number): string {
  if (p >= 1_000_000_000) return `${(p / 1_000_000_000).toFixed(2)} billion`;
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(1)} million`;
  return nf.format(p);
}

export function formatRatio(r: number): string {
  if (r >= 10) return `${Math.round(r)}×`;
  return `${r.toFixed(1)}×`;
}

export const KIND_LABEL: Record<EntityKind, string> = {
  t: "Country, empire or people",
  r: "Power plus everything it claimed",
  s: "State or province",
  k: "Continent",
};

export const KIND_SHORT: Record<EntityKind, string> = {
  t: "Territory",
  r: "All claims",
  s: "State",
  k: "Continent",
};

export const PRECISION_LABEL: Record<number, string> = {
  1: "Approximate borders",
  2: "Moderately precise borders",
  3: "Precise borders",
};

export function yearsOf(e: Entity, years: number[]): number[] {
  return e.y.map((i) => years[i]);
}

export function spanLabel(e: Entity, years: number[]): string {
  const ys = yearsOf(e, years);
  if (ys.length === 1) return yearLabel(ys[0]);
  return `${yearLabel(ys[0])} to ${yearLabel(ys[ys.length - 1])}`;
}

export function areaAt(e: Entity, years: number[], year: number): number | undefined {
  const idx = years.indexOf(year);
  const j = e.y.indexOf(idx);
  return j === -1 ? undefined : e.a[j];
}

export function peakOf(e: Entity, years: number[]): { year: number; area: number } {
  let best = 0;
  for (let j = 1; j < e.a.length; j++) if (e.a[j] > e.a[best]) best = j;
  return { year: years[e.y[best]], area: e.a[best] };
}

/** Nearest year this entity is mapped, preferring the requested one. */
export function nearestYear(e: Entity, years: number[], year: number): number {
  const ys = yearsOf(e, years);
  let best = ys[0];
  for (const y of ys) if (Math.abs(y - year) < Math.abs(best - year)) best = y;
  return best;
}

export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
