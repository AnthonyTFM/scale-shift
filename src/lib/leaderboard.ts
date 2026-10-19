// Public Daily Challenge leaderboard (server only).
//
// Storage, picked automatically:
//   Redis   if UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set (or Vercel's KV_REST_API_URL + KV_REST_API_TOKEN).
//           Free at upstash.com, or one click in Vercel → Storage. Use this when the site is live.
//   JSON    otherwise: data/leaderboard.json. Zero setup for running on your computer.
//           On Vercel without Redis this falls back to /tmp, which is wiped regularly, so scores won't last.
//
// Scores are never trusted from the browser: the server rebuilds the day's questions and marks the answers itself.
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import pool from "@/data/daily-pool.json";
import { buildQuestions, shiftDate, type PoolEntry } from "./daily";
import { isOffensive } from "./name-filter";
import type { AllTimeBoard, AllTimeRow, DayBoard, DayRow } from "./leaderboard-types";

// ---------- validation ----------

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isPlayerId = (v: unknown): v is string => typeof v === "string" && ID.test(v);

export const isDateKey = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/** The puzzle date must be "today" somewhere on Earth: within a day of the server's UTC date. */
export function isPlayableDate(date: string, now = new Date()) {
  const utc = now.toISOString().slice(0, 10);
  return date === utc || date === shiftDate(utc, -1) || date === shiftDate(utc, 1);
}

export function checkName(raw: unknown): { name: string; error?: string } {
  const name = (typeof raw === "string" ? raw : "").normalize("NFKC").replace(/\s+/g, " ").trim();
  if (name.length < 3 || name.length > 16) return { name, error: "Use 3 to 16 characters." };
  if (!/^[\p{L}\p{N}][\p{L}\p{N} _.-]*$/u.test(name)) return { name, error: "Use letters, numbers, spaces, dots, dashes or underscores." };
  if (isOffensive(name)) return { name, error: "Please pick a different nickname." };
  return { name };
}

/** Marks a day's answers on the server. Returns null if the answers aren't a valid set of five picks. */
export function scoreAnswers(date: string, choices: unknown): number | null {
  const questions = buildQuestions(pool as PoolEntry[], date);
  if (!Array.isArray(choices) || choices.length !== questions.length || !choices.every((c) => c === 0 || c === 1)) return null;
  return choices.filter((c, i) => questions[i].answer === c).length;
}

// ---------- storage ----------

type DayEntry = { s: number; t: number };

interface Store {
  /** false if this player already has a score for this date (the first one counts) */
  submit(date: string, id: string, score: number, at: number): Promise<boolean>;
  setName(id: string, name: string): Promise<void>;
  /** has this player already posted a score for this date? */
  has(date: string, id: string): Promise<boolean>;
  /** reserve a nickname (case-insensitive) for this player; false if someone else already owns it */
  claimName(nameKey: string, id: string): Promise<boolean>;
  /** count one more new player from this network today; returns the new count */
  bumpNetwork(date: string, netKey: string): Promise<number>;
  day(date: string): Promise<{ id: string; name: string; s: number; t: number }[]>;
  allTime(limit: number, me: string | null): Promise<{ total: number; top: { id: string; name: string; points: number; days: number }[]; me: { name: string; points: number; days: number; above: number } | null }>;
}

// --- Redis (Upstash REST) ---
function redisStore(url: string, token: string): Store {
  const run = async (commands: (string | number)[][]) => {
    const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands.map((c) => c.map(String))),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Redis responded ${res.status}`);
    const out = (await res.json()) as { result?: unknown; error?: string }[];
    const err = out.find((o) => o.error);
    if (err) throw new Error(err.error);
    return out.map((o) => o.result);
  };
  const pairs = (flat: unknown) => {
    const a = (flat as string[]) ?? [];
    const m: Record<string, string> = {};
    for (let i = 0; i < a.length; i += 2) m[a[i]] = a[i + 1];
    return m;
  };
  return {
    async submit(date, id, score, at) {
      const [added] = await run([["HSETNX", `lb:day:${date}`, id, JSON.stringify({ s: score, t: at })]]);
      if (Number(added) !== 1) return false;
      await run([
        ["ZINCRBY", "lb:points", score, id],
        ["HINCRBY", "lb:days", id, 1],
      ]);
      return true;
    },
    async setName(id, name) {
      await run([["HSET", "lb:names", id, name]]);
    },
    async has(date, id) {
      const [r] = await run([["HEXISTS", `lb:day:${date}`, id]]);
      return Number(r) === 1;
    },
    async claimName(nameKey, id) {
      const [, owner] = await run([
        ["HSETNX", "lb:owners", nameKey, id],
        ["HGET", "lb:owners", nameKey],
      ]);
      return owner === id;
    },
    async bumpNetwork(date, netKey) {
      const key = `lb:net:${date}:${netKey}`;
      const [n] = await run([
        ["INCR", key],
        ["EXPIRE", key, 3 * 86400],
      ]);
      return Number(n);
    },
    async day(date) {
      const [raw] = await run([["HGETALL", `lb:day:${date}`]]);
      const entries = Object.entries(pairs(raw)).map(([id, v]) => ({ id, ...(JSON.parse(v) as DayEntry) }));
      if (!entries.length) return [];
      const [names] = await run([["HMGET", "lb:names", ...entries.map((e) => e.id)]]);
      return entries.map((e, i) => ({ ...e, name: (names as (string | null)[])[i] ?? "Player" }));
    },
    async allTime(limit, me) {
      const [top, total] = await run([["ZREVRANGE", "lb:points", 0, limit - 1, "WITHSCORES"], ["ZCARD", "lb:points"]]);
      const list = (top as string[]) ?? [];
      const ids: string[] = [];
      const pts: number[] = [];
      for (let i = 0; i < list.length; i += 2) {
        ids.push(list[i]);
        pts.push(Number(list[i + 1]));
      }
      const want = me && !ids.includes(me) ? [...ids, me] : ids;
      const cmds: (string | number)[][] = [];
      if (want.length) cmds.push(["HMGET", "lb:names", ...want], ["HMGET", "lb:days", ...want]);
      if (me) cmds.push(["ZSCORE", "lb:points", me]);
      const res = cmds.length ? await run(cmds) : [];
      const n = (want.length ? res[0] : []) as (string | null)[];
      const d = (want.length ? res[1] : []) as (string | null)[];
      const mine = me ? res[res.length - 1] : null;
      let meRow = null;
      if (me && mine !== null && mine !== undefined) {
        const points = Number(mine);
        const [above] = await run([["ZCOUNT", "lb:points", `(${points}`, "+inf"]]);
        const j = want.indexOf(me);
        meRow = { name: n[j] ?? "You", points, days: Number(d[j] ?? 0), above: Number(above) };
      }
      return {
        total: Number(total),
        top: ids.map((id, i) => ({ id, name: n[i] ?? "Player", points: pts[i], days: Number(d[i] ?? 0) })),
        me: meRow,
      };
    },
  };
}

// --- JSON file ---
type FileData = {
  names: Record<string, string>;
  days: Record<string, Record<string, DayEntry>>;
  owners?: Record<string, string>;
  nets?: Record<string, number>;
};

function fileStore(file: string): Store {
  let queue: Promise<unknown> = Promise.resolve();
  const read = async (): Promise<FileData> => {
    try {
      const d = JSON.parse(await fs.readFile(file, "utf8"));
      return { names: d.names ?? {}, days: d.days ?? {}, owners: d.owners ?? {}, nets: d.nets ?? {} };
    } catch {
      return { names: {}, days: {}, owners: {}, nets: {} };
    }
  };
  // serialize writes so two players finishing at once can't overwrite each other
  const write = <T>(fn: (d: FileData) => T): Promise<T> => {
    const job = queue.then(async () => {
      const d = await read();
      const out = fn(d);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(`${file}.tmp`, JSON.stringify(d));
      await fs.rename(`${file}.tmp`, file);
      return out;
    });
    queue = job.catch(() => {});
    return job;
  };
  return {
    submit: (date, id, score, at) =>
      write((d) => {
        const day = (d.days[date] ??= {});
        if (day[id]) return false;
        day[id] = { s: score, t: at };
        return true;
      }),
    setName: (id, name) =>
      write((d) => {
        d.names[id] = name;
      }),
    async has(date, id) {
      return !!(await read()).days[date]?.[id];
    },
    claimName: (nameKey, id) =>
      write((d) => {
        const owners = (d.owners ??= {});
        owners[nameKey] ??= id;
        return owners[nameKey] === id;
      }),
    bumpNetwork: (date, netKey) =>
      write((d) => {
        const nets = (d.nets ??= {});
        const k = `${date}:${netKey}`;
        nets[k] = (nets[k] ?? 0) + 1;
        return nets[k];
      }),
    async day(date) {
      const d = await read();
      return Object.entries(d.days[date] ?? {}).map(([id, e]) => ({ id, ...e, name: d.names[id] ?? "Player" }));
    },
    async allTime(limit, me) {
      const d = await read();
      const totals = new Map<string, { points: number; days: number }>();
      for (const day of Object.values(d.days))
        for (const [id, e] of Object.entries(day)) {
          const t = totals.get(id) ?? { points: 0, days: 0 };
          t.points += e.s;
          t.days += 1;
          totals.set(id, t);
        }
      const all = [...totals].map(([id, t]) => ({ id, name: d.names[id] ?? "Player", ...t })).sort((a, b) => b.points - a.points || a.days - b.days);
      const mine = me ? all.find((r) => r.id === me) : undefined;
      return {
        total: all.length,
        top: all.slice(0, limit),
        me: mine ? { name: mine.name, points: mine.points, days: mine.days, above: all.filter((r) => r.points > mine.points).length } : null,
      };
    },
  };
}

let store: Store | null = null;

/** Which storage is in use: "redis" when the Redis settings are present, otherwise "file". */
export const storeKind = () =>
  (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) && (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)
    ? "redis"
    : "file";

export function getStore(): Store {
  if (store) return store;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (url && token) store = redisStore(url, token);
  else {
    if (process.env.VERCEL) console.warn("[leaderboard] No Redis configured: scores go to /tmp and will be lost. Add Upstash Redis (see README).");
    store = fileStore(process.env.VERCEL ? "/tmp/leaderboard.json" : path.join(process.cwd(), "data", "leaderboard.json"));
  }
  return store;
}

// ---------- boards ----------

/** Competition ranking: equal scores share a rank (1, 2, 2, 4). */
function rankBy<T>(rows: T[], key: (r: T) => number) {
  let rank = 0;
  return rows.map((r, i) => {
    if (i === 0 || key(r) !== key(rows[i - 1])) rank = i + 1;
    return { r, rank };
  });
}

/** Nicknames are unique ignoring case, spaces and punctuation ("Map Wizard" = "mapwizard"). */
export const nameKey = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** One-way hash of the visitor's network address plus the date, so no IP address is ever stored. */
export function networkKey(ip: string, date: string) {
  return createHash("sha256").update(`${ip}|${date}|scale-shift`).digest("hex").slice(0, 16);
}

/** New players allowed per network per day (a household or friends on one Wi-Fi). */
export const NEW_PLAYERS_PER_NETWORK = 5;

export async function dayBoard(date: string, limit: number, me: string | null): Promise<DayBoard> {
  const entries = (await getStore().day(date)).filter((e) => !isOffensive(e.name)).sort((a, b) => b.s - a.s || a.t - b.t);
  const ranked = rankBy(entries, (e) => e.s);
  const toRow = ({ r, rank }: (typeof ranked)[number]): DayRow => ({ rank, name: r.name, score: r.s, ...(r.id === me ? { me: true } : {}) });
  const mine = me ? ranked.find((x) => x.r.id === me) : undefined;
  return { date, total: entries.length, rows: ranked.slice(0, limit).map(toRow), me: mine ? toRow(mine) : null };
}

export async function allTimeBoard(limit: number, me: string | null): Promise<AllTimeBoard> {
  const { total: stored, top: all, me: mine } = await getStore().allTime(limit, me);
  // names saved before the filter was tightened are hidden until someone removes them from the store
  const top = all.filter((t) => !isOffensive(t.name));
  const total = stored - (all.length - top.length);
  const rows: AllTimeRow[] = rankBy(top, (t) => t.points).map(({ r, rank }) => ({
    rank,
    name: r.name,
    points: r.points,
    days: r.days,
    average: r.days ? Math.round((r.points / r.days) * 10) / 10 : 0,
    ...(r.id === me ? { me: true } : {}),
  }));
  const meRow: AllTimeRow | null = mine
    ? { rank: mine.above + 1, name: mine.name, points: mine.points, days: mine.days, average: mine.days ? Math.round((mine.points / mine.days) * 10) / 10 : 0, me: true }
    : null;
  return { total, rows, me: meRow };
}
