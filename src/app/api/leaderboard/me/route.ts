import { connection } from "next/server";
import { existingPlayer, signInEnabled, verifiedUser } from "@/lib/account";
import { getStore, isDateKey, isPlayableDate, playerHistory } from "@/lib/leaderboard";

/**
 * GET → who is signed in: { signIn: false } when sign-in is off, { player: null } when signed out or not on the board yet,
 * or { player: { id, name, reminders } }. The email is never returned.
 * GET ?today=YYYY-MM-DD also returns days: { date: { c, s } }, their results, so another device shows the same ones.
 */
export async function GET(request: Request) {
  await connection();
  if (!signInEnabled()) return Response.json({ signIn: false });
  try {
    const user = await verifiedUser();
    const id = user ? await existingPlayer(user) : null;
    if (!id) return Response.json({ signIn: true, player: null }, { headers: { "Cache-Control": "no-store" } });
    const store = getStore();
    const today = new URL(request.url).searchParams.get("today");
    const [name, reminders, days] = await Promise.all([
      store.nameOf(id),
      store.remindersOn(id),
      isDateKey(today) && isPlayableDate(today) ? playerHistory(id, today) : null,
    ]);
    return Response.json({ signIn: true, player: { id, name, reminders }, ...(days ? { days } : {}) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[leaderboard] me failed", e);
    return Response.json({ error: "The leaderboard is unavailable right now." }, { status: 503 });
  }
}
