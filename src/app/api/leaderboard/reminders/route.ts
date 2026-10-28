import { getStore, isPlayerId } from "@/lib/leaderboard";
import { playerFor, signInEnabled, verifiedUser } from "@/lib/account";
import { limited } from "@/lib/rate-limit";

const ipOf = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";

/** POST { player, on } → turn daily-challenge reminder emails on or off. Only for players who signed up with an email. */
export async function POST(request: Request) {
  const fail = (error: string, status: number) => Response.json({ ok: false, error }, { status });
  if (await limited("lb-remind", ipOf(request), 20)) return fail("Too many tries. Please wait a few minutes.", 429);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("Something went wrong. Reload the page and try again.", 400);
  }
  if (typeof body.on !== "boolean") return fail("Something went wrong. Reload the page and try again.", 400);
  try {
    const store = getStore();
    let player: string;
    if (signInEnabled()) {
      // with sign-in on, only the signed-in person can change their own reminders
      const user = await verifiedUser();
      if (!user) return fail("Sign in first.", 401);
      // a brand-new account becomes a player here, so the welcome pop-up can set reminders before any score is saved
      player = await playerFor(user, body.player);
    } else {
      if (!isPlayerId(body.player)) return fail("Something went wrong. Reload the page and try again.", 400);
      player = body.player;
      if (!(await store.emailOf(player))) return fail("Join the leaderboard with your email first.", 422);
    }
    await store.setReminders(player, body.on, Date.now());
    return Response.json({ ok: true, on: body.on });
  } catch (e) {
    console.error("[leaderboard] reminders failed", e);
    return fail("We couldn't save that. Please try again in a minute.", 503);
  }
}
