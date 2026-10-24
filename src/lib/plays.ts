// Anonymous daily-game counts: how many finished each day's puzzle, their scores, and how long ago each player first
// finished one. Nothing identifies a player: no id, no cookie, no address is stored, only counters per day. That is
// enough to read retention: of the players new on day D (first = 0), those back on day D+1 send first = 1, so
// D1 return = count(D+1, first 1) ÷ count(D, first 0). Read it with `npm run plays`.
//
//   Redis (the leaderboard's Upstash settings)  one hash per day, "pl:day:<date>": n, s0…s5 (score), f0…f30 and fx (days
//                                                since first play; fx is more than 30)
//   no Redis, local                              data/plays.json
//   no Redis, on Vercel                          not counted: /tmp is per server and wiped, so the numbers would mislead
import { promises as fs } from "node:fs";
import path from "node:path";

/** Days-since-first-play buckets kept one by one; anything older shares "fx". */
export const FIRST_MAX = 30;

export type DayCounts = { n: number; scores: number[] };

const fields = (score: number, first: number) => ["n", `s${score}`, first > FIRST_MAX ? "fx" : `f${first}`];

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const FILE = path.join(process.cwd(), "data", "plays.json");

/** False on Vercel without Redis, where counts can't be kept. */
export const playsEnabled = () => !!(redisUrl && redisToken) || !process.env.VERCEL;

async function redis(endpoint: "pipeline" | "multi-exec", commands: string[][]) {
  const res = await fetch(`${redisUrl!.replace(/\/$/, "")}/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis responded ${res.status}`);
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  const err = out.find((o) => o.error);
  if (err) throw new Error(err.error);
  return out.map((o) => o.result);
}

type FileData = Record<string, Record<string, number>>;
let queue: Promise<unknown> = Promise.resolve();
const readFile = async (): Promise<FileData> => {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as FileData;
  } catch (e) {
    // only a missing file starts afresh: a file that can't be read must not be overwritten with nothing
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw e;
  }
};

/** Counts one finished daily puzzle. */
export async function recordPlay(date: string, score: number, first: number) {
  if (redisUrl && redisToken) {
    // all three counters or none, so a day's totals always add up
    await redis(
      "multi-exec",
      fields(score, first).map((f) => ["HINCRBY", `pl:day:${date}`, f, "1"]),
    );
    return;
  }
  // serialize writes so two players finishing at once can't overwrite each other
  const run = queue.then(async () => {
    const data = await readFile();
    const day = (data[date] ??= {});
    for (const f of fields(score, first)) day[f] = (day[f] ?? 0) + 1;
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(`${FILE}.tmp`, JSON.stringify(data));
    await fs.rename(`${FILE}.tmp`, FILE);
  });
  queue = run.catch(() => {});
  return run;
}

/** One day's player count and score spread (all zero when nobody has played it). */
export async function dayCounts(date: string): Promise<DayCounts> {
  let raw: Record<string, number>;
  if (redisUrl && redisToken) {
    const [flat] = await redis("pipeline", [["HGETALL", `pl:day:${date}`]]);
    const a = (flat as string[]) ?? [];
    raw = {};
    for (let i = 0; i < a.length; i += 2) raw[a[i]] = Number(a[i + 1]);
  } else raw = (await readFile())[date] ?? {};
  return { n: raw.n ?? 0, scores: [0, 1, 2, 3, 4, 5].map((s) => raw[`s${s}`] ?? 0) };
}
