// Today's countries for the "How big is X really?" pages (/size) and the /teachers tables. Server only: it reads the
// puzzle pool (shapes and how much a web map stretches them) and the map's search index (today's areas).
import pool from "@/data/daily-pool.json";
import polities from "../../public/data/polities.json";

type PoolRow = { id: string; n: string; src: string; era: string; kind: string; sub: string; a: number; m: number; lat: number };
type Polity = { n: string; y: (number | string)[]; a: number[]; us?: number };

export type SizeCountry = {
  slug: string;
  /** pool id, also the shape file name in public/data/daily/shapes */
  id: string;
  n: string;
  /** name on the map */
  src: string;
  /** km², today's area as the era pages and the map show it */
  a: number;
  /** how many times too big a normal web map draws it (area-weighted over the whole shape) */
  stretch: number;
  lat: number;
  /** 1 = largest */
  rank: number;
  /** map snapshots it appears in under this name (era keys, oldest first) */
  eras: (number | string)[];
};

const rows = pool as PoolRow[];
const named = new Map((polities as Polity[]).filter((p) => !p.us && p.y.at(-1) === "present").map((p) => [p.n, p] as const));

// Antarctica is left out until its outline reaches the pole (issue #89): today it reads ~12.3M km², not ~14.2M
export const sizeCountries: SizeCountry[] = rows
  .filter((r) => r.kind === "country" && r.era === "present" && r.sub === "today")
  .map((r) => {
    const p = named.get(r.src);
    return {
      slug: r.id.replace(/-present$/, ""),
      id: r.id,
      n: r.n,
      src: r.src,
      a: p ? p.a[p.a.length - 1] : r.a,
      stretch: r.m / r.a,
      lat: r.lat,
      rank: 0,
      eras: p?.y ?? ["present"],
    };
  })
  .sort((x, y) => y.a - x.a)
  .map((c, i) => ({ ...c, rank: i + 1 }));

export const sizeBySlug = new Map(sizeCountries.map((c) => [c.slug, c] as const));

/** US states, for comparisons American readers know (Texas, California). */
export const usStates = new Map(
  rows.filter((r) => r.era === "us").map((r) => [r.n, { id: r.id, n: r.n, a: r.a, stretch: r.m / r.a, lat: r.lat }] as const),
);

/** The countries closest in area, nearest first. */
export function sameSize(c: SizeCountry, count = 5) {
  return sizeCountries
    .filter((o) => o.slug !== c.slug)
    .sort((x, y) => Math.abs(Math.log(x.a / c.a)) - Math.abs(Math.log(y.a / c.a)))
    .slice(0, count);
}

/**
 * The country to draw next to it: about the same size but stretched very differently by a web map, so the picture
 * shows the trick (Greenland next to Mexico). Countries near the equator get a far-north partner, and the other way
 * round; failing that, the nearest in size.
 */
export function partnerFor(c: SizeCountry) {
  const near = sizeCountries
    .filter((o) => o.slug !== c.slug && o.a / c.a > 0.5 && o.a / c.a < 2)
    .sort((x, y) => Math.abs(Math.log(x.a / c.a)) - Math.abs(Math.log(y.a / c.a)));
  const contrast = c.stretch >= 1.5 ? near.find((o) => o.stretch < 1.3) : near.find((o) => o.stretch >= 2);
  return contrast ?? near[0] ?? sameSize(c, 1)[0];
}

/** "1.9×" / "16×" */
export const timesText = (x: number) => (x >= 10 ? Math.round(x).toString() : x.toFixed(1)).replace(/\.0$/, "");

/** "13th" */
export function ordinal(n: number) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${s}`;
}
