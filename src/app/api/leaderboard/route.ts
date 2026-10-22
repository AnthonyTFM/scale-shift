import { connection } from "next/server";
import {
  allTimeBoard,
  checkEmail,
  checkName,
  dayBoard,
  getStore,
  isDateKey,
  isPlayableDate,
  isPlayerId,
  nameKey,
  networkKey,
  NEW_PLAYERS_PER_NETWORK,
  scoreAnswers,
  storeKind,
  weekBoard,
} from "@/lib/leaderboard";
import type { SubmitResult } from "@/lib/leaderboard-types";
import { rateLimited } from "@/lib/submissions";
import { playerFor, signInEnabled, verifiedUser } from "@/lib/account";

const ipOf = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";

/**
 * GET /api/leaderboard?scope=day&date=2026-10-20&limit=50&player=<id>
 * GET /api/leaderboard?scope=all&limit=50&player=<id>
 * GET /api/leaderboard?scope=week&date=2026-10-20&limit=50&player=<id>   (the Monday–Sunday week containing date)
 */
export async function GET(request: Request) {
  await connection();
  if (rateLimited(`lb-get:${ipOf(request)}`, 240, 60_000)) return Response.json({ error: "Too many requests. Please wait a minute and try again." }, { status: 429 });
  const q = new URL(request.url).searchParams;
  const limit = Math.max(1, Math.min(100, Number(q.get("limit")) || 50));
  const player = q.get("player");
  const me = isPlayerId(player) ? player : null;
  try {
    if (q.get("scope") === "all") return Response.json(await allTimeBoard(limit, me), { headers: { "Cache-Control": "no-store", "X-Leaderboard-Store": storeKind() } });
    const date = q.get("date");
    if (!isDateKey(date)) return Response.json({ error: "Use date=YYYY-MM-DD." }, { status: 400 });
    if (q.get("scope") === "week")
      return Response.json(await weekBoard(date, limit, me), { headers: { "Cache-Control": "no-store", "X-Leaderboard-Store": storeKind() } });
    return Response.json(await dayBoard(date, limit, me), { headers: { "Cache-Control": "no-store", "X-Leaderboard-Store": storeKind() } });
  } catch (e) {
    console.error("[leaderboard] read failed", e);
    return Response.json({ error: "The leaderboard is unavailable right now." }, { status: 503 });
  }
}

/**
 * POST { player, name, email, date, choices: [0|1 ×5], website } → your score and rank for the day.
 * With sign-in on, the player is whoever is signed in (their verified email), and `player` is only a hint for a brand-new
 * one. Without it, the email is needed once per player.
 */
export async function POST(request: Request) {
  const fail = (error: string, status: number, field?: "name" | "email") => Response.json({ ok: false, error, ...(field ? { field } : {}) } satisfies SubmitResult, { status });
  if (rateLimited(`lb-post:${ipOf(request)}`, 30)) return fail("Too many tries. Please wait a few minutes.", 429);

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
  if (!isDateKey(body.date) || !isPlayableDate(body.date)) return fail("Only today's challenge can go on the leaderboard.", 422);
  const score = scoreAnswers(body.date, body.choices);
  if (score === null) return fail("Those answers don't match today's questions.", 422);

  try {
    const store = getStore();
    let player: string;
    if (accounts) {
      // only a verified email can post, and it always posts as the same player on every device
      const user = await verifiedUser();
      if (!user) return fail("Sign in to put your score on the leaderboard.", 401);
      player = await playerFor(user, body.player);
    } else {
      player = body.player as string;
      // joining needs an email (kept private): one player per inbox
      if (!(await store.emailOf(player))) {
        const mail = checkEmail(body.email);
        if (mail.error) return fail(mail.error, 422, "email");
        if (!(await store.claimEmail(mail.key, player, mail.email))) {
          return fail("That email is already signed up on another device or browser.", 422, "email");
        }
      }
    }
    // a nickname belongs to the first player who used it, so a second browser can't post under the same name
    if (!(await store.claimName(nameKey(name), player))) return fail("That nickname is taken. Please pick another.", 422, "name");
    // a brand-new score for today: cap how many different players one network can add per day
    if (!(await store.has(body.date, player))) {
      const n = await store.bumpNetwork(body.date, networkKey(ipOf(request), body.date));
      if (n > NEW_PLAYERS_PER_NETWORK) return fail("Too many new players from this network today. Try again tomorrow.", 429);
    }
    await store.setName(player, name);
    const choices = body.choices as number[];
    const fresh = await store.submit(body.date, player, score, Date.now(), choices);
    // posted before picks were kept: add them, if they give the score already on the board (the first try still counts)
    if (!fresh) {
      const [first] = await store.records(player, [body.date]);
      if (first && !first.c && first.s === score) await store.addChoices(body.date, player, choices);
    }
    const board = await dayBoard(body.date, 0, player);
    // a repeat submission keeps the first score; report that one
    const mine = board.me;
    return Response.json({
      ok: true,
      score: mine?.score ?? score,
      rank: mine?.rank ?? board.total,
      total: board.total,
      duplicate: !fresh,
      player: { id: player, name },
    } satisfies SubmitResult);
  } catch (e) {
    console.error("[leaderboard] write failed", e);
    return fail("We couldn't save your score. Please try again in a minute.", 503);
  }
}
