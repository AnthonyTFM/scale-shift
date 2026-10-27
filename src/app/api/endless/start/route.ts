import { connection } from "next/server";
import { isDateKey, isPlayableDate } from "@/lib/leaderboard";
import { startRun } from "@/lib/endless-server";
import { limited } from "@/lib/rate-limit";

const ipOf = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";

/**
 * POST { date, seen } (the player's local date, and the shapes they saw in their last runs) → { seed, token }: a new
 * endless run that avoids those shapes and can go on the Best streaks board.
 */
export async function POST(request: Request) {
  await connection();
  if (await limited("endless-start", ipOf(request), 300)) return Response.json({ error: "Too many runs. Please wait a few minutes." }, { status: 429 });
  let date: unknown;
  let seen: unknown;
  try {
    ({ date, seen } = (await request.json()) as { date?: unknown; seen?: unknown });
  } catch {
    return Response.json({ error: "Send { date }." }, { status: 400 });
  }
  if (!isDateKey(date) || !isPlayableDate(date)) return Response.json({ error: "Use today's date." }, { status: 400 });
  return Response.json(startRun(date, seen), { headers: { "Cache-Control": "no-store" } });
}
