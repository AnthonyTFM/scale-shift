// Daily Challenge: 5 "which is bigger?" questions per day, the same for everyone on the same date.
// The shape pool comes from scripts/build-daily.mjs (public/data/daily/index.json).

export type PoolEntry = {
  id: string;
  /** display name */
  n: string;
  /** name in the map data, for "see it on the map" links */
  src: string;
  /** map era key ("present", "us", "1914", "200bce"...) */
  era: string;
  kind: "country" | "state" | "history";
  /** short label under the name: "today", "US state", "in 200 CE" */
  sub: string;
  /** real area, km² */
  a: number;
  /** area as drawn on a web map (Mercator, equator scale), km² */
  m: number;
  lat: number;
  /** first date (YYYY-MM-DD) this shape can appear in a daily puzzle; shapes added later never change past days */
  since?: string;
};

export type Question = {
  kind: QuestionKind;
  prompt: string;
  options: [PoolEntry, PoolEntry];
  /** index of the bigger shape in options */
  answer: 0 | 1;
};

type QuestionKind = "trap" | "close" | "state" | "history" | "history2";

/** Day 1 of the challenge. Day numbers count from here. */
export const LAUNCH = "2026-10-19";

/** The five slots, in order. Easy-ish first, hardest last. */
const SLOTS: QuestionKind[] = ["trap", "state", "history", "close", "history2"];

const PROMPTS: Record<QuestionKind, string> = {
  trap: "Which country is bigger in real life?",
  close: "Close call: which country is bigger?",
  state: "Which is bigger?",
  history: "Then vs. now: which is bigger?",
  history2: "Empire vs. empire: which was bigger?",
};

// ---------- dates ----------

/** Local calendar date as YYYY-MM-DD (the puzzle changes at the player's midnight). */
export function localDateKey(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const dayIndex = (key: string) => Math.round(Date.parse(`${key}T00:00:00Z`) / 86_400_000);

export function dayNumber(key: string) {
  return dayIndex(key) - dayIndex(LAUNCH) + 1;
}

export function shiftDate(key: string, days: number) {
  return new Date((dayIndex(key) + days) * 86_400_000).toISOString().slice(0, 10);
}

// ---------- seeded random ----------

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- question building ----------

const ratio = (x: PoolEntry, y: PoolEntry) => Math.max(x.a, y.a) / Math.min(x.a, y.a);

/** Rules each question type must meet: [first pick, second pick, does the pair qualify?] */
const RULES: Record<QuestionKind, [(e: PoolEntry) => boolean, (e: PoolEntry) => boolean, (x: PoolEntry, y: PoolEntry) => boolean]> = {
  // the one that looks bigger on a web map is actually smaller
  trap: [
    (e) => e.kind === "country",
    (e) => e.kind === "country",
    (x, y) => {
      const r = ratio(x, y);
      const [big, small] = x.a > y.a ? [x, y] : [y, x];
      return r >= 1.15 && r <= 3 && small.m / big.m >= 1.2;
    },
  ],
  close: [(e) => e.kind === "country", (e) => e.kind === "country", (x, y) => ratio(x, y) >= 1.08 && ratio(x, y) <= 1.5],
  state: [(e) => e.kind === "state", (e) => e.kind === "country", (x, y) => ratio(x, y) >= 1.1 && ratio(x, y) <= 1.9],
  history: [(e) => e.kind === "history", (e) => e.kind === "country", (x, y) => ratio(x, y) >= 1.1 && ratio(x, y) <= 2.2],
  history2: [(e) => e.kind === "history", (e) => e.kind === "history", (x, y) => x.era !== y.era && ratio(x, y) >= 1.1 && ratio(x, y) <= 2],
};

function pick<T>(list: T[], r: () => number) {
  return list[Math.floor(r() * list.length)];
}

/** The day's five questions. `seed` is the date key, or anything else for a practice round. */
export function buildQuestions(allShapes: PoolEntry[], seed: string): Question[] {
  // a dated round only uses shapes that were in the pool that day (practice rounds use everything)
  const dated = /^\d{4}-\d{2}-\d{2}$/.test(seed);
  const pool = allShapes.filter((e) => !e.since || !dated || e.since <= seed);
  const r = rng(`atlas-daily:${seed}`);
  const used = new Set<string>();
  const out: Question[] = [];
  for (const kind of SLOTS) {
    const [firstOk, secondOk, pairOk] = RULES[kind];
    for (let attempt = 0; attempt < 60; attempt++) {
      const first = pick(
        pool.filter((e) => firstOk(e) && !used.has(e.id)),
        r,
      );
      if (!first) break;
      const partners = pool.filter((e) => e.id !== first.id && secondOk(e) && !used.has(e.id) && pairOk(first, e));
      if (!partners.length) continue;
      const second = pick(partners, r);
      used.add(first.id).add(second.id);
      const options: [PoolEntry, PoolEntry] = r() < 0.5 ? [first, second] : [second, first];
      // Antarctica isn't a country: "Which country is bigger?" becomes "Which is bigger?"
      const prompt = options.some((o) => o.sub === "continent") ? PROMPTS[kind].replace(" country", "") : PROMPTS[kind];
      out.push({ kind, prompt, options, answer: options[0].a > options[1].a ? 0 : 1 });
      break;
    }
  }
  return out;
}

// ---------- explanations ----------

const times = (r: number) => (r >= 10 ? r.toFixed(0) : r.toFixed(1));

/** How many times too big a shape is drawn on a web map. */
export const stretch = (e: PoolEntry) => e.m / e.a;

const NO_ARTICLE = /^(Alexander|Austria-Hungary|British North America|Kievan Rus)/;
const NEEDS_ARTICLE = /^(United |Central African|Dominican|Czech|Philippines|Netherlands|Republic of|Democratic|Gambia|Bahamas|Solomon)/;

/** Name as it reads mid-sentence: "the Roman Empire", "the United States", "Brazil". */
export function nameInSentence(e: PoolEntry) {
  const the = e.kind === "history" ? !NO_ARTICLE.test(e.n) : NEEDS_ARTICLE.test(e.n);
  return the ? `the ${e.n}` : e.n;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function explain(q: Question) {
  const big = q.options[q.answer];
  const small = q.options[1 - q.answer];
  const B = nameInSentence(big);
  const S = nameInSentence(small);
  const r = big.a / small.a;
  const lines = [r < 1.2 ? `${capitalize(B)} is bigger, by ${Math.round((r - 1) * 100)}%.` : `${capitalize(B)} is ${times(r)}× the size of ${S}.`];
  const looks = small.m / big.m;
  if (looks > 1.05) {
    lines.push(
      `On a normal web map ${S} looks ${times(looks)}× bigger, because land is stretched more the farther it is from the equator (${Math.abs(Math.round(small.lat))}° vs ${Math.abs(Math.round(big.lat))}°).`,
    );
  } else {
    // same 15% line as the "Map: 1.2× too big" chip on the cards, so the sentence never contradicts them
    const more = stretch(big) > stretch(small) ? big : small;
    const other = more === big ? small : big;
    if (stretch(other) >= 1.15)
      lines.push(`Web maps draw both too big (${nameInSentence(more)} ${times(stretch(more))}×, ${nameInSentence(other)} ${times(stretch(other))}×).`);
    else if (stretch(more) >= 1.15)
      lines.push(`Web maps draw ${nameInSentence(more)} ${times(stretch(more))}× too big, so the gap looks ${more === big ? "bigger" : "smaller"} than it really is.`);
    else lines.push("Both sit close to the equator, so web maps get these two roughly right.");
  }
  return lines;
}

// ---------- saved progress (this browser only) ----------

/** c = the option picked for each question so far; s = final score once all five are answered. */
export type DayRecord = { c: number[]; s?: number };
export type DailySave = { v: 1; days: Record<string, DayRecord> };

// v2: progress was reset on Oct 19 with the fresh leaderboard
const KEY = "atlas-daily-v2";

export function loadSave(): DailySave {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw?.v === 1 && raw.days && typeof raw.days === "object") return raw;
  } catch {
    /* private window or blocked storage: play without saving */
  }
  return { v: 1, days: {} };
}

export function writeSave(save: DailySave) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* ignore */
  }
}

/**
 * Results from the leaderboard for a signed-in player. Those are their official first tries, so they replace whatever
 * this browser has for the same days (e.g. a replay on a second device).
 */
export function mergeDays(days: Record<string, DayRecord>) {
  const save = loadSave();
  const merged = { ...save, days: { ...save.days, ...days } };
  writeSave(merged);
  return merged;
}

export type Stats = { played: number; average: number; streak: number; best: number };

export function stats(save: DailySave, today: string): Stats {
  const finished = Object.keys(save.days)
    .filter((d) => typeof save.days[d].s === "number")
    .sort();
  const set = new Set(finished);
  let streak = 0;
  for (let d = set.has(today) ? today : shiftDate(today, -1); set.has(d); d = shiftDate(d, -1)) streak++;
  let best = 0,
    run = 0,
    prev = "";
  for (const d of finished) {
    run = prev && shiftDate(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  const total = finished.reduce((sum, d) => sum + (save.days[d].s ?? 0), 0);
  return { played: finished.length, average: finished.length ? total / finished.length : 0, streak, best };
}

export const QUESTIONS_PER_DAY = SLOTS.length;
