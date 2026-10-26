// Rate limits for the POST routes (forms, scores, streaks), shared by every server instance through Redis, so they
// hold when Vercel runs several copies or a cold start wipes memory. The network address only goes to Redis as a code
// made with a server-only secret (like the leaderboard's spam protection), and expires with the window.
// Without Redis, or if it can't be reached, the limit falls back to this instance's memory.
import { createHmac } from "node:crypto";
import { rateLimited } from "./submissions";
import { unsubscribeSecret } from "./leaderboard";

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

/** True when `ip` has used `name` more than `limit` times in the last `windowMs` (a fixed window). */
export async function limited(name: string, ip: string, limit: number, windowMs = 10 * 60_000): Promise<boolean> {
  // this instance's own count first: it answers floods without a Redis call
  if (rateLimited(`${name}:${ip}`, limit, windowMs)) return true;
  if (!url || !token) return false;
  const code = createHmac("sha256", unsubscribeSecret()).update(`rl:${ip}`).digest("hex").slice(0, 16);
  const key = `rl:${name}:${code}:${Math.floor(Date.now() / windowMs)}`;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["PEXPIRE", key, String(windowMs)],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const [count] = (await res.json()) as { result?: number }[];
    return (count?.result ?? 0) > limit;
  } catch {
    return false;
  }
}
