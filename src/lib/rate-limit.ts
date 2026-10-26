// Rate limits for the POST routes (forms, scores, streaks), shared by every server instance through Redis, so they
// hold when Vercel runs several copies or a cold start wipes memory. The network address only goes to Redis as a code
// made with a server-only secret (like the leaderboard's spam protection), and expires with the window.
// Without Redis, or if it can't be reached, the limit falls back to this instance's memory.
import { createHmac } from "node:crypto";
import { rateLimited } from "./submissions";
import { unsubscribeSecret } from "./leaderboard";

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

/**
 * Who a request counts as: the address, or for IPv6 its /64 network (one home or server line gets a whole /64, so it
 * could otherwise take a fresh address for every request).
 */
function who(ip: string) {
  if (!ip.includes(":")) return ip;
  // expand "::" so the first four groups are the network
  const [head, tail = ""] = ip.toLowerCase().split("::");
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  const groups = ip.includes("::") ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill("0"), ...t] : h;
  return `${groups.slice(0, 4).join(":")}::/64`;
}

/** True when `ip` has used `name` more than `limit` times in the last `windowMs` (a fixed window). */
export async function limited(name: string, ip: string, limit: number, windowMs = 10 * 60_000): Promise<boolean> {
  const client = who(ip);
  // this instance's own count first: it answers floods without a Redis call
  if (rateLimited(`${name}:${client}`, limit, windowMs)) return true;
  if (!url || !token) return false;
  const code = createHmac("sha256", unsubscribeSecret()).update(`rl:${client}`).digest("hex").slice(0, 16);
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
      // a slow Redis mustn't hold up a player's post: give up and let the request through
      signal: AbortSignal.timeout(1000),
    });
    if (!res.ok) return false;
    const [count] = (await res.json()) as { result?: number }[];
    return (count?.result ?? 0) > limit;
  } catch {
    return false;
  }
}
