// A familiar place to measure the two shapes against once the answer is in ("Goiás is about the size of California"),
// drawn as a dashed outline at the tiles' own scale. Picked from places the player is likely to know, going by the
// browser's language (en-US → US states, en-GB → the UK...): nothing is stored or sent anywhere.
import { dailyCopy } from "@/content/daily";
import { nameInSentence, type PoolEntry } from "./daily";

const copy = dailyCopy.reveal;

// pool ids, smallest to largest
const LISTS: Record<string, string[]> = {
  US: [
    "massachusetts-us",
    "new-york-us",
    "florida-us",
    "colorado-us",
    "california-us",
    "texas-us",
    "alaska-us",
    "contiguous-united-states-us",
  ],
  GB: ["united-kingdom-present"],
  CA: ["nova-scotia-adm1-can", "new-brunswick-adm1-can", "british-columbia-adm1-can", "ontario-adm1-can", "quebec-adm1-can", "canada-present"],
  AU: ["tasmania-adm1-aus", "victoria-adm1-aus", "new-south-wales-adm1-aus", "queensland-adm1-aus", "australia-present"],
  IN: ["kerala-adm1-ind", "maharashtra-adm1-ind", "rajasthan-adm1-ind", "india-present"],
  // everyone else, and anything the local list can't match within 3×
  world: [
    "belgium-present",
    "ireland-present",
    "united-kingdom-present",
    "italy-present",
    "germany-present",
    "japan-present",
    "spain-present",
    "egypt-present",
    "mexico-present",
    "india-present",
    "australia-present",
    "russia-present",
  ],
};

/** Which list fits this browser, from the region in its language settings ("en-US" → "US"). */
export function homeList(): string {
  if (typeof navigator === "undefined") return "world";
  for (const tag of navigator.languages?.length ? navigator.languages : [navigator.language]) {
    const region = /-([a-z]{2})$/i.exec(tag ?? "")?.[1]?.toUpperCase();
    if (region) return LISTS[region] ? region : "world";
  }
  return "world";
}

const gap = (a: number, b: number) => Math.abs(Math.log(a / b));

/**
 * The familiar place closest in size to the pair (by their geometric mean), never one of the two themselves, nor any
 * shape in `exclude`: the rest of the day's questions, or endless mode's next rounds (a yardstick that turns up later as
 * an option would give that round away).
 */
export function yardstickFor(
  options: readonly PoolEntry[],
  pool: readonly PoolEntry[],
  exclude: ReadonlySet<string> = new Set(),
  list = homeList(),
): PoolEntry | null {
  const byId = new Map(pool.map((e) => [e.id, e]));
  const target = Math.sqrt(options[0].a * options[1].a);
  const pick = (ids: string[]) =>
    ids
      .map((id) => byId.get(id))
      .filter((e): e is PoolEntry => !!e && !exclude.has(e.id) && !options.some((o) => o.id === e.id || o.n === e.n))
      .sort((x, y) => gap(x.a, target) - gap(y.a, target))[0];
  const local = pick(LISTS[list] ?? LISTS.world);
  if (local && gap(local.a, target) <= Math.log(3)) return local;
  const world = pick(LISTS.world);
  return !local || (world && gap(world.a, target) < gap(local.a, target)) ? (world ?? null) : local;
}

/** One place's size next to the yardstick, in words: "about the same size as", "about 2.4× the size of"... */
function roughly(r: number, name: string) {
  if (r >= 0.9 && r <= 1.11) return copy.scaleSame(name);
  if (r > 1.11) return copy.scaleTimes(r < 10 ? (Math.round(r * 10) / 10).toString() : Math.round(r).toString(), name);
  const [f, word] = copy.fractions.reduce((best, c) => (gap(r, c[0]) < gap(r, best[0]) ? c : best));
  return gap(r, f) <= 0.1 ? copy.scaleFraction(word, name) : copy.scalePercent(Math.round(r * 100), name);
}

/** The exact form, for when the rough one would read the same for both shapes: "about 93% the size of", "about 1.07×". */
function exactly(r: number, name: string) {
  return r < 1 ? copy.scalePercent(Math.round(r * 100), name) : copy.scaleTimes(r < 10 ? r.toFixed(2) : Math.round(r).toString(), name);
}

/** Both shapes' sizes next to the yardstick, in words; exact for both when the rough words would be the same. */
export function sizesAgainst(options: readonly PoolEntry[], y: PoolEntry): string[] {
  const name = nameInSentence(y);
  const rough = options.map((o) => roughly(o.a / y.a, name));
  return rough[0] === rough[1] ? options.map((o) => exactly(o.a / y.a, name)) : rough;
}
