// Endless mode on the server: handing out runs and marking them for the Best streaks board.
//
// The server picks each run's seed and signs it with the time it was handed out, so a streak can only be posted for a
// run the server started, not one chosen (or replayed) to suit. Posting re-builds the run's rounds from the seed and
// marks the answers itself. A run can be posted again as it grows, but once it has ended on a miss its streak is fixed.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import pool from "@/data/daily-pool.json";
import type { PoolEntry } from "./daily";
import { avoidOf, endlessQuestion, SEEN_MAX } from "./endless";
import { isDateKey, isPlayableDate, unsubscribeSecret } from "./leaderboard";

/** How long after it starts a run can still be posted. */
const RUN_MAX_AGE = 24 * 3600_000;
/**
 * The fastest anyone can play a round: read two names, tap, watch the reveal, tap "Next round". A run posted faster
 * than this was played by a script.
 */
const MIN_MS_PER_ROUND = 2000;
/** No run is longer than this (the pool repeats long before). */
export const MAX_ROUNDS = 500;

const SEED = /^\d{4}-\d{2}-\d{2}\.[0-9a-f]{16}$/;

// signs the seed, when it was handed out and the recently seen shapes the run avoids (tokens from before that list
// existed have none, and are signed as they were)
const sign = (seed: string, at: number, avoid = "") =>
  createHmac("sha256", process.env.ENDLESS_SECRET || unsubscribeSecret())
    .update(avoid ? `endless:${seed}|${at}|${avoid}` : `endless:${seed}|${at}`)
    .digest("base64url")
    .slice(0, 32);

const IDS = new Set((pool as PoolEntry[]).map((e) => e.id));

/** The recently seen shapes a run may avoid: known shapes only, each once, at most SEEN_MAX, in the order sent. */
export function cleanSeen(seen: unknown): string[] {
  if (!Array.isArray(seen)) return [];
  const out: string[] = [];
  for (const id of seen) if (typeof id === "string" && IDS.has(id) && !out.includes(id) && out.length < SEEN_MAX) out.push(id);
  return out;
}

/**
 * A new run for a player whose local date is `date`: its seed, and the token that proves the server handed it out. The
 * token carries the shapes the player saw in their last runs (`seen`), so the run avoids them and can still be re-marked.
 */
export function startRun(date: string, seen: unknown = [], now = Date.now()) {
  const seed = `${date}.${randomBytes(8).toString("hex")}`;
  const avoid = cleanSeen(seen).join(",");
  return { seed, token: `${now}.${sign(seed, now, avoid)}${avoid ? `~${avoid}` : ""}` };
}

export type Marked = { ok: true; streak: number; over: boolean; date: string } | { ok: false; error: string };

/** Checks a run's seed, token and answers, and works out its streak. */
export function markRun(seed: unknown, token: unknown, choices: unknown, now = Date.now()): Marked {
  const fail = (error: string) => ({ ok: false, error }) as const;
  if (typeof seed !== "string" || !SEED.test(seed) || typeof token !== "string") return fail("That run can't be posted. Start a new one.");
  const [signed, avoidList = ""] = token.split("~");
  const [atRaw, sig] = signed.split(".");
  const at = Number(atRaw);
  const want = Buffer.from(Number.isFinite(at) ? sign(seed, at, avoidList) : "");
  const got = Buffer.from(sig ?? "");
  if (!want.length || want.length !== got.length || !timingSafeEqual(want, got)) return fail("That run can't be posted. Start a new one.");
  if (now - at > RUN_MAX_AGE || at > now + 60_000) return fail("That run is too old to post. Start a new one.");
  const date = seed.slice(0, 10);
  if (!isDateKey(date) || !isPlayableDate(date, new Date(at))) return fail("That run can't be posted. Start a new one.");
  if (!Array.isArray(choices) || !choices.length || choices.length > MAX_ROUNDS || !choices.every((c) => c === 0 || c === 1))
    return fail("Those answers don't match this run.");
  // mark round by round, stopping at the first miss: answers after it can't exist, as the run ends there
  const used = new Set<string>();
  let streak = 0;
  const avoid = avoidOf(token);
  while (streak < choices.length && endlessQuestion(pool as PoolEntry[], seed, streak + 1, used, avoid).answer === choices[streak]) streak++;
  if (streak < choices.length - 1) return fail("Those answers don't match this run.");
  if (now - at < streak * MIN_MS_PER_ROUND) return fail("That run was too fast to count.");
  return { ok: true, streak, over: streak < choices.length, date };
}
