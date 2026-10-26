import { connection } from "next/server";
import { checkEmail, checkName, endlessBoard, getStore, isDateKey, isPlayerId, nameKey, networkKey, NEW_PLAYERS_PER_NETWORK, storeKind } from "@/lib/leaderboard";
import type { EndlessSubmitResult } from "@/lib/leaderboard-types";
import { markRun } from "@/lib/endless-server";
import { rateLimited } from "@/lib/submissions";
import { playerFor, signInEnabled, verifiedUser } from "@/lib/account";

const ipOf = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";

/**
 * GET /api/endless?scope=day&date=2026-10-26&limit=50&player=<id>   one day's best streaks
 * GET /api/endless?scope=all&limit=50&player=<id>                   best streaks of all time
 */
export async function GET(request: Request) {
  await connection();
  if (rateLimited(`endless-get:${ipOf(request)}`, 240, 60_000)) return Response.json({ error: "Too many requests. Please wait a minute and try again." }, { status: 429 });
  const q = new URL(request.url).searchParams;
  const limit = Math.max(1, Math.min(100, Number(q.get("limit")) || 50));
  const player = q.get("player");
  const me = isPlayerId(player) ? player : null;
  // boards read without a player are the same for everyone: Vercel's CDN may serve them for up to 20 seconds
  const headers = { "Cache-Control": "no-store", "X-Leaderboard-Store": storeKind(), ...(me ? {} : { "Vercel-CDN-Cache-Control": "max-age=10, stale-while-revalidate=10" }) };
  try {
    if (q.get("scope") === "all") return Response.json(await endlessBoard(null, limit, me), { headers });
    const date = q.get("date");
    if (!isDateKey(date)) return Response.json({ error: "Use date=YYYY-MM-DD." }, { status: 400 });
    return Response.json(await endlessBoard(date, limit, me), { headers });
  } catch (e) {
    console.error("[endless] read failed", e);
    return Response.json({ error: "The leaderboard is unavailable right now." }, { status: 503 });
  }
}

/**
 * POST { player, name, email, seed, token, choices: [0|1 …], website } → the player's best streak of all time and its
 * rank. Each day's best streaks are still recorded, so a daily board could come back, but only all time is shown. The
 * server re-marks the run from its seed (see src/lib/endless-server.ts). Sign-in works as on the daily's
 * POST /api/leaderboard.
 */
export async function POST(request: Request) {
  const fail = (error: string, status: number, field?: "name" | "email") =>
    Response.json({ ok: false, error, ...(field ? { field } : {}) } satisfies EndlessSubmitResult, { status });
  if (rateLimited(`endless-post:${ipOf(request)}`, 60)) return fail("Too many tries. Please wait a few minutes.", 429);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("Something went wrong. Reload the page and try again.", 400);
  }
  if (body.website) return fail("Something went wrong. Reload the page and try again.", 400); // honeypot
  const accounts = signInEnabled();
  if (!accounts && !isPlayerId(body.player)) return fail("Something went wrong. Reload the page and try again.", 400);
  const { name, error } = checkName(body.name);
  if (error) return fail(error, 422, "name");
  let run: ReturnType<typeof markRun>;
  try {
    run = markRun(body.seed, body.token, body.choices);
  } catch (e) {
    console.error("[endless] marking failed", e);
    return fail("We couldn't check that run. Please try again in a minute.", 503);
  }
  if (!run.ok) return fail(run.error, 422);
  if (!run.streak) return fail("Get at least one right to post a streak.", 422);

  try {
    const store = getStore();
    let player: string;
    if (accounts) {
      const user = await verifiedUser();
      if (!user) return fail("Sign in to put your streak on the leaderboard.", 401);
      player = await playerFor(user, body.player);
    } else {
      player = body.player as string;
      if (!(await store.emailOf(player))) {
        const mail = checkEmail(body.email);
        if (mail.error) return fail(mail.error, 422, "email");
        if (!(await store.claimEmail(mail.key, player, mail.email))) return fail("That email is already signed up on another device or browser.", 422, "email");
      }
    }
    if (!(await store.claimName(nameKey(name), player))) return fail("That nickname is taken. Please pick another.", 422, "name");
    // a brand-new player: the same cap on new players per network as the daily
    if (!(await store.nameOf(player))) {
      const n = await store.bumpNetwork(run.date, networkKey(ipOf(request), run.date));
      if (n > NEW_PLAYERS_PER_NETWORK) return fail("Too many new players from this network today. Try again tomorrow.", 429);
    }
    // a run belongs to whoever posted it first; its streak can grow while it lasts, but once it has ended on a miss it
    // can't change
    const before = await store.endlessRun(body.seed as string, player, run.streak, run.over);
    if (before && (before.p !== player || run.streak < before.n || (before.over && run.streak !== before.n)))
      return fail("That run is already over. Start a new one.", 422);
    await store.setName(player, name);
    await store.endlessPost(run.date, player, run.streak, Date.now());
    const all = await endlessBoard(null, 0, player);
    return Response.json({
      ok: true,
      score: all.me?.score ?? run.streak,
      rank: all.me?.rank ?? all.total,
      total: all.total,
      // a better run from before is the one on the board
      duplicate: (all.me?.score ?? run.streak) > run.streak,
      player: { id: player, name },
    } satisfies EndlessSubmitResult);
  } catch (e) {
    console.error("[endless] write failed", e);
    return fail("We couldn't save your streak. Please try again in a minute.", 503);
  }
}
