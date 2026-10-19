import { checkUnsubscribeToken, getStore, isPlayerId } from "@/lib/leaderboard";

// One-click unsubscribe from reminder emails: the link in each email (GET) and mail apps' unsubscribe button (POST).
async function unsubscribe(request: Request) {
  const q = new URL(request.url).searchParams;
  const id = q.get("p");
  const token = q.get("t") ?? "";
  const back = (ok: boolean) => Response.redirect(new URL(ok ? "/unsubscribed" : "/unsubscribed/error", request.url), 303);
  if (!isPlayerId(id) || !checkUnsubscribeToken(id, token)) return back(false);
  try {
    await getStore().setReminders(id, false, Date.now());
    return back(true);
  } catch (e) {
    console.error("[leaderboard] unsubscribe failed", e);
    return back(false);
  }
}

export const GET = unsubscribe;
export const POST = unsubscribe;
