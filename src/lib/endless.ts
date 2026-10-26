// Endless mode: one "which is bigger?" matchup after another, each level a closer call than the last, until the first
// wrong answer. Uses the daily puzzle's shape pool. A run is fixed by its seed: round n is always the same matchup for
// the same seed, so a reload resumes the run where it was (and the server can re-mark a run from its seed and picks).
import { pick, ratio, rng, type PoolEntry, type Question, type QuestionKind } from "./daily";

/**
 * How hard each stretch of rounds is: the bigger shape is `min`–`max` times the smaller one. Level 1 is big gaps where
 * the web map points the wrong way (the trick the whole site is about); by level 5 the two are within about 10%.
 */
export const LEVELS = [
  { from: 1, min: 1.5, max: 4, trap: true },
  { from: 4, min: 1.3, max: 2 },
  { from: 8, min: 1.15, max: 1.5 },
  { from: 13, min: 1.08, max: 1.25 },
  { from: 21, min: 1.04, max: 1.12 },
] as const;

/** 0-based level for a 1-based round number. */
export function levelOf(round: number) {
  let l = 0;
  while (l + 1 < LEVELS.length && round >= LEVELS[l + 1].from) l++;
  return l;
}

type Pairing = { kind: QuestionKind; first: PoolEntry["kind"]; second: PoolEntry["kind"]; weight: number };

// what gets compared, and how often: mostly countries, with US states and historical states mixed in
const PAIRINGS: Pairing[] = [
  { kind: "close", first: "country", second: "country", weight: 45 },
  { kind: "state", first: "state", second: "country", weight: 15 },
  { kind: "history", first: "history", second: "country", weight: 25 },
  { kind: "history2", first: "history", second: "history", weight: 15 },
];

const PROMPTS: Record<QuestionKind, string> = {
  trap: "Which country is bigger in real life?",
  close: "Which country is bigger?",
  state: "Which is bigger?",
  history: "Then vs. now: which is bigger?",
  history2: "Empire vs. empire: which was bigger?",
};

/** A new run's seed: the date (which shapes are in the pool) and a random part. */
export function newSeed(date: string) {
  const rand = Array.from(crypto.getRandomValues(new Uint32Array(2)), (n) => n.toString(36)).join("");
  return `${date}.${rand}`;
}

/** The shapes a run can use: those in the daily pool on the date in its seed. */
function poolFor(all: PoolEntry[], seed: string) {
  const date = seed.slice(0, 10);
  return all.filter((e) => !e.since || e.since <= date);
}

const same = (e: PoolEntry) => e.n.replace(/^Contiguous /, "");

function fits(level: (typeof LEVELS)[number], x: PoolEntry, y: PoolEntry) {
  const r = ratio(x, y);
  if (r < level.min || r > level.max) return false;
  if (!("trap" in level)) return true;
  // the trap: the smaller one looks at least 20% bigger on a web map
  const [big, small] = x.a > y.a ? [x, y] : [y, x];
  return small.m / big.m >= 1.2;
}

/** One matchup at a level, or null if the pool has none left that fit (with these shapes already used). */
function tryLevel(pool: PoolEntry[], level: (typeof LEVELS)[number], r: () => number, used: Set<string>): Question | null {
  const pairings = "trap" in level ? [{ kind: "trap" as const, first: "country" as const, second: "country" as const, weight: 1 }] : PAIRINGS;
  const total = pairings.reduce((s, p) => s + p.weight, 0);
  for (let attempt = 0; attempt < 40; attempt++) {
    // a weighted pick of what to compare
    let w = r() * total;
    const pairing = pairings.find((p) => (w -= p.weight) < 0) ?? pairings[0];
    const first = pick(
      pool.filter((e) => e.kind === pairing.first && !used.has(e.id)),
      r,
    );
    if (!first) continue;
    // two eras of the same empire ("Roman Empire" in 1 CE and 200 CE), or the contiguous United States against the whole
    // country, would be a confusing matchup
    const partners = pool.filter(
      (e) => e.kind === pairing.second && e.id !== first.id && same(e) !== same(first) && !used.has(e.id) && fits(level, first, e),
    );
    if (!partners.length) continue;
    const second = pick(partners, r);
    const options: [PoolEntry, PoolEntry] = r() < 0.5 ? [first, second] : [second, first];
    const kind = pairing.kind;
    // Antarctica isn't a country: "Which country is bigger?" becomes "Which is bigger?"
    const prompt = options.some((o) => o.sub === "continent") ? PROMPTS[kind].replace(" country", "") : PROMPTS[kind];
    return { kind, prompt, options, answer: options[0].a > options[1].a ? 0 : 1 };
  }
  return null;
}

/**
 * Round `round` (1-based) of the run with this seed. `used` holds the shapes from the run's earlier rounds and gets this
 * round's two added, so no shape comes back within a run (until the pool runs dry, which takes well over 100 rounds).
 */
export function endlessQuestion(all: PoolEntry[], seed: string, round: number, used: Set<string>): Question {
  const pool = poolFor(all, seed);
  const r = rng(`atlas-endless:${seed}:${round}`);
  // the round's own level first, then easier ones if the pool has run out of pairs that close
  for (let l = levelOf(round); l >= 0; l--) {
    const q = tryLevel(pool, LEVELS[l], r, used) ?? (used.size ? tryLevel(pool, LEVELS[l], r, new Set()) : null);
    if (q) {
      for (const o of q.options) used.add(o.id);
      return q;
    }
  }
  throw new Error("No matchup fits");
}

/** The first `count` rounds of a run. */
export function endlessRun(all: PoolEntry[], seed: string, count: number): Question[] {
  const used = new Set<string>();
  return Array.from({ length: count }, (_, i) => endlessQuestion(all, seed, i + 1, used));
}

/** How many answers in a row were right (the run ends at the first wrong one). */
export function streakOf(questions: Question[], choices: number[]) {
  const miss = choices.findIndex((c, i) => questions[i]?.answer !== c);
  return miss === -1 ? choices.length : miss;
}

// ---------- saved progress (this browser only) ----------

/** best = longest run, runs = runs finished, run = the run in progress (or the last one, once over). */
export type EndlessSave = { v: 1; best: number; runs: number; run?: { seed: string; c: number[]; over?: boolean } };

const KEY = "atlas-endless-v1";

export function loadEndless(): EndlessSave {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw?.v === 1 && typeof raw.best === "number" && typeof raw.runs === "number") return raw;
  } catch {
    /* private window or blocked storage: play without saving */
  }
  return { v: 1, best: 0, runs: 0 };
}

export function writeEndless(save: EndlessSave) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* ignore */
  }
}
