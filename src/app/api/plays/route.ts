import { connection } from "next/server";
import { isDateKey, isPlayableDate } from "@/lib/leaderboard";
import { daysBetween, LAUNCH, QUESTIONS_PER_DAY } from "@/lib/daily";
import { dayCounts, recordPlay } from "@/lib/plays";
import { rateLimited } from "@/lib/submissions";

const ipOf = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
const isCount = (v: unknown, max: number): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;

/**
 * POST /api/plays { date, score, first }: one finished daily puzzle, counted anonymously (see src/lib/plays.ts).
 * `first` is how many days ago this browser first finished a daily puzzle (0 = today is its first).
 */
export async function POST(request: Request) {
  await connection();
  // the address is only held in this server's memory for a few minutes to stop floods; it is never stored
  if (rateLimited(`plays:${ipOf(request)}`, 20, 10 * 60_000)) return Response.json({ ok: false }, { status: 429 });
  let body: { date?: unknown; score?: unknown; first?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const { date, score, first } = body;
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
  const { n, scores } = await dayCounts(date);
  return Response.json(
    { n, scores },
    { headers: { "Cache-Control": "no-store", "Vercel-CDN-Cache-Control": "max-age=30, stale-while-revalidate=30" } },
  );
}
