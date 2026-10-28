// Endless mode: one "which is bigger?" matchup after another, closer calls the further you go, until the first wrong
// answer. Uses the daily puzzle's shape pool. A run is fixed by its seed: round n is always the same matchup for
// the same seed, so a reload resumes the run where it was (and the server can re-mark a run from its seed and picks).
import { pick, ratio, rng, type PoolEntry, type Question, type QuestionKind } from "./daily";

/**
 * How hard each stretch of rounds is: the bigger shape is `min`–`max` times the smaller one. Level 1 is big gaps where
 * the web map points the wrong way (the trick the whole site is about); by level 5 the two are within about 10%.
 */
export const LEVELS = [
  { from: 1, min: 1.4, max: 4, trap: true },
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
  history: "Then vs now: which is bigger?",
  history2: "Back in history: which was bigger?",
};

/**
 * A new run's seed: the date (which shapes are in the pool) and a random part. Runs normally get theirs from the server
 * (POST /api/endless/start), which can then check them; this one is for when it can't be reached (the run still plays,
 * but can't be posted).
 */
export function newSeed(date: string) {
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(8)), (n) => n.toString(16).padStart(2, "0")).join("");
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
  // the trap: the smaller one looks at least 15% bigger on a web map
  const [big, small] = x.a > y.a ? [x, y] : [y, x];
  return small.m / big.m >= 1.15;
}

// the opening traps: mostly countries, with US states and historical states as the trick's other side (about 820
// openers from 286 shapes, where countries alone gave 200 from 105)
const TRAPS: Pairing[] = [
  { kind: "trap", first: "country", second: "country", weight: 50 },
  { kind: "trap", first: "state", second: "country", weight: 15 },
  { kind: "trap", first: "history", second: "country", weight: 25 },
  { kind: "trap", first: "history", second: "history", weight: 10 },
];

/** Every possible opening matchup (level 1), as pairs of ids: the server keeps enough of them free in every run. */
export function openerPairs(pool: PoolEntry[]): [string, string][] {
  const out: [string, string][] = [];
  for (const t of TRAPS)
    for (const x of pool)
      if (x.kind === t.first)
        for (const y of pool)
          // a pairing of one kind with itself lists each pair once
          if (y.kind === t.second && (t.first !== t.second || x.id < y.id) && same(x) !== same(y) && fits(LEVELS[0], x, y)) out.push([x.id, y.id]);
  return out;
}

/**
 * One matchup at a level, or null if the pool has none left that fit (with these shapes already used in the run, and
 * none of the ones this player saw in their last runs).
 */
function tryLevel(pool: PoolEntry[], level: (typeof LEVELS)[number], r: () => number, used: Set<string>, avoid?: ReadonlySet<string>): Question | null {
  const pairings = "trap" in level ? TRAPS : PAIRINGS;
  const free = (e: PoolEntry) => !used.has(e.id) && !avoid?.has(e.id);
  const total = pairings.reduce((s, p) => s + p.weight, 0);
  for (let attempt = 0; attempt < 40; attempt++) {
    // a weighted pick of what to compare
    let w = r() * total;
    const pairing = pairings.find((p) => (w -= p.weight) < 0) ?? pairings[0];
    const first = pick(
      pool.filter((e) => e.kind === pairing.first && free(e)),
      r,
    );
    if (!first) continue;
    // two eras of the same empire ("Roman Empire" in 1 CE and 200 CE), or the contiguous United States against the whole
    // country, would be a confusing matchup
    const partners = pool.filter(
      (e) => e.kind === pairing.second && e.id !== first.id && same(e) !== same(first) && free(e) && fits(level, first, e),
    );
    if (!partners.length) continue;
    const second = pick(partners, r);
    const options: [PoolEntry, PoolEntry] = r() < 0.5 ? [first, second] : [second, first];
    const kind = pairing.kind;
    // Antarctica, a US state or a historical state isn't a country: "Which country is bigger?" becomes "Which is bigger?"
    const prompt = options.some((o) => o.sub === "continent" || o.kind !== "country") ? PROMPTS[kind].replace(" country", "") : PROMPTS[kind];
    return { kind, prompt, options, answer: options[0].a > options[1].a ? 0 : 1 };
  }
  return null;
}

/**
 * Round `round` (1-based) of the run with this seed. `used` holds the shapes from the run's earlier rounds and gets this
 * round's two added, so no shape comes back within a run until the pool runs dry (after about 100 rounds); then it starts
 * over, so a shape still never comes back within about 100 rounds. `avoid` is the shapes this player saw in their last
 * runs: they're skipped too while there are others left, so starting again doesn't bring back the same matchups.
 */
export function endlessQuestion(all: PoolEntry[], seed: string, round: number, used: Set<string>, avoid?: ReadonlySet<string>): Question {
  const pool = poolFor(all, seed);
  const r = rng(`atlas-endless:${seed}:${round}`);
  // the round's own level first (without the recently seen shapes, then with them, then with every shape free again
  // once the unused ones have no pair left), then easier ones
  for (let l = levelOf(round); l >= 0; l--) {
    let q = tryLevel(pool, LEVELS[l], r, used, avoid);
    if (!q && avoid?.size) q = tryLevel(pool, LEVELS[l], r, used);
    if (!q && used.size) {
      // start over, keeping the last round's two (a Set keeps insertion order) so neither comes straight back
      const last = [...used].slice(-2);
      used.clear();
      for (const id of last) used.add(id);
      q = tryLevel(pool, LEVELS[l], r, used);
    }
    if (q) {
      for (const o of q.options) used.add(o.id);
      return q;
    }
  }
  throw new Error("No matchup fits");
}

/** The first `count` rounds of a run. */
export function endlessRun(all: PoolEntry[], seed: string, count: number, avoid?: ReadonlySet<string>): Question[] {
  const used = new Set<string>();
  return Array.from({ length: count }, (_, i) => endlessQuestion(all, seed, i + 1, used, avoid));
}

/** How many answers in a row were right (the run ends at the first wrong one). */
export function streakOf(questions: Question[], choices: number[]) {
  const miss = choices.findIndex((c, i) => questions[i]?.answer !== c);
  return miss === -1 ? choices.length : miss;
}

// ---------- saved progress (this browser only) ----------

/**
 * best = longest run, runs = runs started, run = the run in progress (or the last one, once over): its seed, its answers,
 * b (the best before it started, for "New best!" after a reload), t (the server's token, to post it on the Best streaks
 * board) and e (when it ended).
 */
export type EndlessSave = {
  v: 1;
  best: number;
  runs: number;
  run?: { seed: string; c: number[]; b?: number; t?: string; over?: boolean; e?: number };
};

const KEY = "atlas-endless-v1";

export function loadEndless(): EndlessSave {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw?.v === 1 && typeof raw.best === "number" && typeof raw.runs === "number") {
      // a damaged run would stop the game loading for good: drop it and start a new one
      const ok = typeof raw.run?.seed === "string" && Array.isArray(raw.run.c) && raw.run.c.every((c: unknown) => c === 0 || c === 1);
      return ok ? raw : { v: 1, best: raw.best, runs: raw.runs };
    }
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

// ---------- shapes seen in recent runs (this browser only) ----------

const SEEN = "atlas-endless-seen";
/** How many recent shapes a new run avoids: about the last dozen short runs. */
export const SEEN_MAX = 80;

/** The shapes this browser saw in its last runs, oldest first. */
export function loadSeen(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SEEN) ?? "[]");
    return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string").slice(-SEEN_MAX) : [];
  } catch {
    return [];
  }
}

/** Adds a round's two shapes to the recently seen list. */
export function rememberSeen(ids: string[]) {
  try {
    const seen = loadSeen().filter((id) => !ids.includes(id));
    localStorage.setItem(SEEN, JSON.stringify([...seen, ...ids].slice(-SEEN_MAX)));
  } catch {
    /* storage blocked: runs just can't avoid what was seen before */
  }
}

/**
 * The recently seen shapes a run avoids, from its token (`<time>.<signature>~<id>,<id>…`): the server signed them with
 * the seed, so the rounds can be rebuilt (and re-marked) exactly.
 */
export function avoidOf(token: string | undefined): Set<string> {
  const list = token?.split("~")[1];
  return new Set(list ? list.split(",") : []);
}

