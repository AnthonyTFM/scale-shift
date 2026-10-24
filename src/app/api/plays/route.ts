import { connection } from "next/server";
import { isDateKey, isPlayableDate } from "@/lib/leaderboard";
import { daysBetween, LAUNCH, QUESTIONS_PER_DAY } from "@/lib/daily";
import { dayCounts, playsEnabled, recordPlay } from "@/lib/plays";

const ipOf = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
const isCount = (v: unknown, max: number): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;

// Flood guard, kept apart from the form and leaderboard limits. Generous, since a whole school or a phone network can
// share one address. Addresses only live in this server's memory, for ten minutes at most, and are never stored.
const WINDOW = 10 * 60_000;
const LIMIT = 200;
const hits = new Map<string, number[]>();
function flooding(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
  recent.push(now);
  if (hits.size > 5000) hits.clear();
  hits.set(ip, recent);
  return recent.length > LIMIT;
}

/**
 * POST /api/plays { date, score, first }: one finished daily puzzle, counted anonymously (see src/lib/plays.ts).
 * `first` is how many days ago this player first finished a daily puzzle (0 = today is their first).
 */
export async function POST(request: Request) {
  await connection();
  if (!playsEnabled()) return Response.json({ ok: false }, { status: 503 });
  if (flooding(ipOf(request))) return Response.json({ ok: false }, { status: 429 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (!body || typeof body !== "object") return Response.json({ ok: false }, { status: 400 });
  const { date, score, first } = body as { date?: unknown; score?: unknown; first?: unknown };
  if (!isDateKey(date) || !isPlayableDate(date) || !isCount(score, QUESTIONS_PER_DAY) || !isCount(first, daysBetween(LAUNCH, date) + 1)) {
    return Response.json({ ok: false }, { status: 400 });
  }
  try {
    await recordPlay(date, score, first);
  } catch (e) {
    console.error("[plays] could not record", e);
    return Response.json({ ok: false }, { status: 503 });
  }
  return Response.json({ ok: true });
}

/** GET /api/plays?date=2026-10-24: that day's player count and score spread (the same for everyone). */
export async function GET(request: Request) {
  await connection();
  const date = new URL(request.url).searchParams.get("date");
  if (!isDateKey(date)) return Response.json({ error: "Pass ?date=YYYY-MM-DD" }, { status: 400 });
  try {
    const { n, scores } = playsEnabled() ? await dayCounts(date) : { n: 0, scores: [0, 0, 0, 0, 0, 0] };
    return Response.json({ n, scores }, { headers: { "Cache-Control": "no-store", "Vercel-CDN-Cache-Control": "max-age=30, stale-while-revalidate=30" } });
  } catch (e) {
    console.error("[plays] could not read", e);
    return Response.json({ error: "Counts unavailable" }, { status: 503 });
  }
}
