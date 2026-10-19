import {
  fillInChoices,
  getStore,
  isDateKey,
  isPlayableDate,
  isPlayerId,
  LINK_TTL_SECONDS,
  makeLinkCode,
  playerHistory,
  readLinkCode,
} from "@/lib/leaderboard";
import type { LinkResult } from "@/lib/leaderboard-types";
import { rateLimited } from "@/lib/submissions";

const ipOf = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";

/**
 * Play on another device as the same leaderboard player.
 *   POST { action: "create", player, today, days: { date: picks } } → { code, expiresIn }   (on the device that joined)
 *   POST { action: "redeem", code, today }                          → { player, days }      (on the new device)
 * The new device gets the player's ID, nickname and recent results. The email is never sent.
 */
export async function POST(request: Request) {
  const fail = (error: string, status: number) => Response.json({ ok: false, error } satisfies LinkResult, { status });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request.", 400);
  }
  const today = isDateKey(body.today) && isPlayableDate(body.today) ? body.today : new Date().toISOString().slice(0, 10);
  const ip = ipOf(request);

  try {
    const store = getStore();
    if (body.action === "create") {
      if (rateLimited(`lb-link-make:${ip}`, 10)) return fail("Too many codes. Please wait a few minutes.", 429);
      if (!isPlayerId(body.player) || !(await store.emailOf(body.player))) return fail("Join the leaderboard on this device first.", 422);
      await fillInChoices(body.player, today, body.days);
      for (let i = 0; i < 3; i++) {
        const code = makeLinkCode();
        if (await store.saveLink(code, body.player, LINK_TTL_SECONDS)) return Response.json({ ok: true, code, expiresIn: LINK_TTL_SECONDS } satisfies LinkResult);
      }
      return fail("Couldn't make a code. Please try again.", 503);
    }

    if (body.action === "redeem") {
      // guessing codes is pointless (27^8 possibilities, 10 minutes each), but keep it slow anyway
      if (rateLimited(`lb-link-use:${ip}`, 10)) return fail("Too many tries. Please wait a few minutes.", 429);
      const code = readLinkCode(body.code);
      const id = code ? await store.takeLink(code) : null;
      if (!id) return fail("That code didn't work. Codes last 10 minutes and work once: make a new one on your other device.", 422);
      const [name, reminders, days] = await Promise.all([store.nameOf(id), store.remindersOn(id), playerHistory(id, today)]);
      return Response.json({ ok: true, player: { id, name: name ?? "Player", reminders }, days } satisfies LinkResult);
    }

    return fail("Invalid request.", 400);
  } catch (e) {
    console.error("[leaderboard] link failed", e);
    return fail("The leaderboard is unavailable right now. Please try again in a minute.", 503);
  }
}
