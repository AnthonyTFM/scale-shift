// Antarctic territorial claims: which apply in a given era, and who claims a given spot.
import type { MultiPolygon } from "geojson";
import content from "@/content/antarctic-claims.json";
import dataVersion from "@/data/data-version.json";
import { eraByKey } from "./eras";

export type Claim = (typeof content.claims)[number];

export const claims: Claim[] = content.claims;
export const unclaimed = content.unclaimed;
export const TREATY_YEAR = content.treatyYear;

/** Year an era stands for ("present" comes after every snapshot). */
function eraYearOf(eraKey: string) {
  const e = eraByKey(eraKey);
  if (!e) return -Infinity;
  return e.year === "present" ? Infinity : e.year;
}

/** Claims that had been made by the year of this era. */
export function claimsForEra(eraKey: string) {
  const y = eraYearOf(eraKey);
  return claims.filter((c) => c.year <= y);
}

export const treatyInForce = (eraKey: string) => eraYearOf(eraKey) >= TREATY_YEAR;

const inRanges = (lon: number, ranges: number[][]) => ranges.some(([w, e]) => lon >= w && lon <= e);

/** Who claims this point in this era (empty if it isn't in Antarctica's claim zone or nobody had claimed it yet). */
export function claimsAt(lon: number, lat: number, eraKey: string) {
  if (lat > -60) return null;
  const list = claimsForEra(eraKey).filter((c) => inRanges(lon, c.ranges));
  return { list, unclaimedZone: inRanges(lon, unclaimed.ranges) };
}

let shapes: Promise<Record<string, MultiPolygon>> | null = null;
export function loadClaimShapes() {
  shapes ??= fetch(`/data/antarctic-claims.json?v=${dataVersion.v}`).then((r) => {
    if (!r.ok) throw new Error("claims");
    return r.json();
  });
  return shapes;
}
