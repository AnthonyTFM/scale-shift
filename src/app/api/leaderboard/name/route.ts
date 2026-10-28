import { checkName, getStore, isPlayerId, nameKey } from "@/lib/leaderboard";
import { playerFor, signInEnabled, verifiedUser } from "@/lib/account";
import { limited } from "@/lib/rate-limit";

const ipOf = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";

/**
 * POST { player, name } → pick or change the signed-in player's nickname (the one on the Best streaks board). The board
 * reads names live, so a change shows everywhere at once. A nickname belongs to the first player who uses it, and a
 * renamed player keeps their old one reserved (no one else can take it and pass as them).
 */
export async function POST(request: Request) {
  const fail = (error: string, status: number) => Response.json({ ok: false, error }, { status });
  if (await limited("lb-name", ipOf(request), 20)) return fail("Too many tries. Please wait a few minutes.", 429);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("Something went wrong. Reload the page and try again.", 400);
  }
  const { name, error } = checkName(body.name);
  if (error) return fail(error, 422);
  try {
    const store = getStore();
    let player: string;
    if (signInEnabled()) {
      // only the signed-in person can name themselves; a brand-new account becomes a player here
      const user = await verifiedUser();
      if (!user) return fail("Sign in first.", 401);
      player = await playerFor(user, body.player);
    } else {
      if (!isPlayerId(body.player)) return fail("Something went wrong. Reload the page and try again.", 400);
      player = body.player;
      if (!(await store.emailOf(player))) return fail("Join the leaderboard with your email first.", 422);
    }
    if (!(await store.claimName(nameKey(name), player))) return fail("That nickname is taken. Please pick another.", 422);
    await store.setName(player, name);
    return Response.json({ ok: true, player: { id: player, name } }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[leaderboard] name failed", e);
    return fail("We couldn't save that. Please try again in a minute.", 503);
  }
}
