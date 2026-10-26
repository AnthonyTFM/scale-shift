// Which area unit a visitor reads: the one they picked on the map (saved as "atlas-unit"), otherwise square miles where
// people use them day to day (the US, the UK, Liberia and Myanmar, going by the browser's language) and km² everywhere else.
import type { AreaUnit } from "./format";

const KEY = "atlas-unit";
const MILES = /-(US|GB|LR|MM)$/i;

export function preferredUnit(): AreaUnit {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "km2" || saved === "mi2") return saved;
  } catch {
    /* storage blocked: go by the language */
  }
  return typeof navigator !== "undefined" && MILES.test(navigator.language ?? "") ? "mi2" : "km2";
}
