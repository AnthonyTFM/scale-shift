import { checkName, getStore, isPlayerId, nameKey, networkKey, NEW_PLAYERS_PER_NETWORK } from "@/lib/leaderboard";
import { playerFor, signInEnabled, verifiedUser } from "@/lib/account";
import { limited } from "@/lib/rate-limit";

const ipOf = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";

/**
 * POST { player, name } → pick or change the signed-in player's nickname (the one on the Best streaks board). The board
 * reads names live, so a change shows everywhere at once. A nickname belongs to the first player who uses it, and a
 * renamed player keeps their old one reserved (no one else can take it and pass as them), so renames are capped at a few
 * a day per player. A first name counts against the same cap on new players per network as the games.
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
    const old = await store.nameOf(player);
    if (old === name) return Response.json({ ok: true, player: { id: player, name } }, { headers: { "Cache-Control": "no-store" } });
    // each rename keeps the old name reserved: a few a day, so no one can hoard names
    if (old && (await limited("lb-rename", player, 5, 24 * 60 * 60_000))) return fail("That's enough renames for today. Try again tomorrow.", 429);
    if (!(await store.claimName(nameKey(name), player))) return fail("That nickname is taken. Please pick another.", 422);
    // a brand-new name on the board: the same cap on new players per network as the daily and endless (both skip a
    // player who already has a name)
    if (!old) {
      const today = new Date().toISOString().slice(0, 10);
      if (!(await store.has(today, player))) {
        const n = await store.bumpNetwork(today, networkKey(ipOf(request), today));
        if (n > NEW_PLAYERS_PER_NETWORK) return fail("Too many new players from this network today. Try again tomorrow.", 429);
      }
    }
    await store.setName(player, name);
    return Response.json({ ok: true, player: { id: player, name } }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[leaderboard] name failed", e);
    return fail("We couldn't save that. Please try again in a minute.", 503);
  }
}
