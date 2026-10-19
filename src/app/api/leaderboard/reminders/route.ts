import { getStore, isPlayerId } from "@/lib/leaderboard";
import { rateLimited } from "@/lib/submissions";

const ipOf = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";

/** POST { player, on } → turn daily-challenge reminder emails on or off. Only for players who signed up with an email. */
export async function POST(request: Request) {
  const fail = (error: string, status: number) => Response.json({ ok: false, error }, { status });
  if (rateLimited(`lb-remind:${ipOf(request)}`, 20)) return fail("Too many tries. Please wait a few minutes.", 429);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request.", 400);
  }
  if (!isPlayerId(body.player) || typeof body.on !== "boolean") return fail("Invalid request.", 400);
  try {
    const store = getStore();
    if (!(await store.emailOf(body.player))) return fail("Join the leaderboard with your email first.", 422);
    await store.setReminders(body.player, body.on, Date.now());
    return Response.json({ ok: true, on: body.on });
  } catch (e) {
    console.error("[leaderboard] reminders failed", e);
    return fail("We couldn't save that. Please try again in a minute.", 503);
  }
}
