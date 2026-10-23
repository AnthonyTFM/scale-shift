import { connection } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { existingPlayer, signInEnabled, verifiedUser } from "@/lib/account";
import { getStore, isDateKey, isPlayableDate, playerHistory } from "@/lib/leaderboard";
import { rateLimited } from "@/lib/submissions";

const ipOf = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";

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

/**
 * DELETE → deletes everything about the signed-in player: their scores, nickname, email, reminder choice and their
 * sign-in account. Signed-out visitors have nothing stored on the server beyond the anonymous network count.
 */
export async function DELETE(request: Request) {
  await connection();
  if (!signInEnabled()) return Response.json({ ok: false, error: "Sign-in is off, so there is nothing to delete." }, { status: 400 });
  if (rateLimited(`lb-del:${ipOf(request)}`, 10)) return Response.json({ ok: false, error: "Too many tries. Please wait a few minutes." }, { status: 429 });
  try {
    const user = await verifiedUser();
    if (!user) return Response.json({ ok: false, error: "Sign in first, then delete your data." }, { status: 401 });
    const id = await existingPlayer(user);
    if (id) await getStore().deletePlayer(id, user.accountId);
    await (await clerkClient()).users.deleteUser(user.accountId);
    // once more, in case another tab posted a score in between (it can't now: the account is gone)
    if (id) await getStore().deletePlayer(id, user.accountId);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[leaderboard] delete failed", e);
    return Response.json({ ok: false, error: "We couldn't delete your data just now. Please try again, or email us." }, { status: 503 });
  }
}
