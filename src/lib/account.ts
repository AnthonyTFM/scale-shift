// Signed-in leaderboard players (server only).
//
// Sign-in is done by Clerk (an email code or Google), and is only used to prove "this person owns this email".
// Everything else (the player, nickname, scores, reminders) stays in our own store, keyed by that verified email, so
// Clerk can be swapped for our own email codes later without anyone losing their spot: they sign in once more and the
// same email finds the same player.
//
// Until Clerk's keys are set in Vercel (Marketplace → Clerk), sign-in is off and the leaderboard works as before.
import { randomUUID } from "node:crypto";
import { auth, currentUser } from "@clerk/nextjs/server";
import { checkEmail, getStore, isPlayerId } from "./leaderboard";

export const signInEnabled = () => !!(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

/** The signed-in person and their verified email, or null if signed out (or the email isn't verified). */
export async function verifiedUser(): Promise<{ accountId: string; email: string } | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  const primary = user?.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
  if (!primary || primary.verification?.status !== "verified") return null;
  return { accountId: userId, email: primary.emailAddress };
}

/** The player this account already plays as: linked before, or the player who first joined with this email. */
export async function existingPlayer(user: { accountId: string; email: string }) {
  const store = getStore();
  const linked = await store.playerOfAccount(user.accountId);
  if (linked) return linked;
  const { key } = checkEmail(user.email);
  const byEmail = key ? await store.playerOfEmail(key) : null;
  return byEmail ? store.linkAccount(user.accountId, byEmail) : null;
}

/**
 * The player for this account, creating one on first sign-in. A new player keeps this browser's player ID when it's
 * free (so scores this browser already posted stay theirs); otherwise a fresh one.
 */
export async function playerFor(user: { accountId: string; email: string }, browserId: unknown) {
  const found = await existingPlayer(user);
  if (found) return found;
  const store = getStore();
  const mail = checkEmail(user.email);
  const fresh = isPlayerId(browserId) && !(await store.emailOf(browserId)) ? browserId : randomUUID();
  // another request may have claimed this email a moment ago: then use that player
  if (mail.key && !(await store.claimEmail(mail.key, fresh, mail.email))) return (await existingPlayer(user)) ?? fresh;
  return store.linkAccount(user.accountId, fresh);
}
