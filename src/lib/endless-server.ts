// Endless mode on the server: handing out runs and marking them for the Best streaks board.
//
// The server picks each run's seed and signs it with the time it was handed out, so a streak can only be posted for a
// run the server started, not one chosen (or replayed) to suit. Posting re-builds the run's rounds from the seed and
// marks the answers itself. A run can be posted again as it grows, but once it has ended on a miss its streak is fixed.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import pool from "@/data/daily-pool.json";
import type { PoolEntry } from "./daily";
import { endlessRun, streakOf } from "./endless";
import { isDateKey, isPlayableDate, unsubscribeSecret } from "./leaderboard";

/** How long after it starts a run can still be posted. */
const RUN_MAX_AGE = 24 * 3600_000;
/** The fastest anyone can answer and move on, per round. A run posted faster than this was played by a script. */
const MIN_MS_PER_ROUND = 1000;
/** No run is longer than this (the pool repeats long before). */
export const MAX_ROUNDS = 500;

const SEED = /^\d{4}-\d{2}-\d{2}\.[0-9a-f]{16}$/;

const sign = (seed: string, at: number) =>
  createHmac("sha256", process.env.ENDLESS_SECRET || unsubscribeSecret())
    .update(`endless:${seed}|${at}`)
    .digest("base64url")
    .slice(0, 32);

/** A new run for a player whose local date is `date`: its seed, and the token that proves the server handed it out. */
export function startRun(date: string, now = Date.now()) {
  const seed = `${date}.${randomBytes(8).toString("hex")}`;
  return { seed, token: `${now}.${sign(seed, now)}` };
}

export type Marked = { ok: true; streak: number; over: boolean; date: string } | { ok: false; error: string };

/** Checks a run's seed, token and answers, and works out its streak. */
export function markRun(seed: unknown, token: unknown, choices: unknown, now = Date.now()): Marked {
  const fail = (error: string) => ({ ok: false, error }) as const;
  if (typeof seed !== "string" || !SEED.test(seed) || typeof token !== "string") return fail("That run can't be posted. Start a new one.");
  const [atRaw, sig] = token.split(".");
  const at = Number(atRaw);
  const want = Buffer.from(Number.isFinite(at) ? sign(seed, at) : "");
  const got = Buffer.from(sig ?? "");
  if (!want.length || want.length !== got.length || !timingSafeEqual(want, got)) return fail("That run can't be posted. Start a new one.");
  if (now - at > RUN_MAX_AGE || at > now + 60_000) return fail("That run is too old to post. Start a new one.");
  const date = seed.slice(0, 10);
  if (!isDateKey(date) || !isPlayableDate(date, new Date(at))) return fail("That run can't be posted. Start a new one.");
  if (!Array.isArray(choices) || !choices.length || choices.length > MAX_ROUNDS || !choices.every((c) => c === 0 || c === 1))
    return fail("Those answers don't match this run.");
  const questions = endlessRun(pool as PoolEntry[], seed, choices.length);
  const streak = streakOf(questions, choices);
  // answers after the miss can't exist: the run ends there
  if (streak < choices.length - 1) return fail("Those answers don't match this run.");
  if (now - at < streak * MIN_MS_PER_ROUND) return fail("That run was too fast to count.");
  return { ok: true, streak, over: streak < choices.length, date };
}
