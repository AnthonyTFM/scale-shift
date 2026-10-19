import { connection } from "next/server";
import { existingPlayer, signInEnabled, verifiedUser } from "@/lib/account";
import { getStore } from "@/lib/leaderboard";

/**
 * GET → who is signed in: { signIn: false } when sign-in is off, { player: null } when signed out or not on the board yet,
 * or { player: { id, name, reminders } }. The email is never returned.
 */
export async function GET() {
  await connection();
  if (!signInEnabled()) return Response.json({ signIn: false });
  try {
    const user = await verifiedUser();
    const id = user ? await existingPlayer(user) : null;
    if (!id) return Response.json({ signIn: true, player: null }, { headers: { "Cache-Control": "no-store" } });
    const store = getStore();
    const [name, reminders] = await Promise.all([store.nameOf(id), store.remindersOn(id)]);
    return Response.json({ signIn: true, player: { id, name, reminders } }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[leaderboard] me failed", e);
    return Response.json({ error: "The leaderboard is unavailable right now." }, { status: 503 });
  }
}
