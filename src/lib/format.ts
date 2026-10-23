export type AreaUnit = "km2" | "mi2";

export const KM2_PER_MI2 = 2.589988;

export function compactNumber(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2)}M`;
  if (n >= 1e4) return `${Math.round(n / 1e3)}K`;
  return Math.round(n).toLocaleString("en-US");
}

export function formatArea(km2: number, unit: AreaUnit, compact = true) {
  const value = unit === "km2" ? km2 : km2 / KM2_PER_MI2;
  const label = unit === "km2" ? "km²" : "sq mi";
  return `${compact ? compactNumber(value) : Math.round(value).toLocaleString("en-US")} ${label}`;
}

export function formatBoth(km2: number) {
  return `${Math.round(km2).toLocaleString("en-US")} km² (${Math.round(km2 / KM2_PER_MI2).toLocaleString("en-US")} sq mi)`;
}

/** "21.6M km² · 8.33M sq mi": both units, short, for phone rows. */
export function formatBothShort(km2: number) {
  return `${formatArea(km2, "km2")} · ${formatArea(km2, "mi2")}`;
}

export function ratioText(a: number, b: number) {
  if (!a || !b) return "";
  const r = a / b;
  if (r >= 0.95 && r <= 1.05) return "about the same size as";
  return r > 1 ? `${r.toFixed(r >= 10 ? 0 : 1)}× the size of` : `${(1 / r).toFixed(1 / r >= 10 ? 0 : 1)}× smaller than`;
}
