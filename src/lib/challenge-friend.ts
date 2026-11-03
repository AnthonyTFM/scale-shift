import { challengePath, tidyName } from "@/lib/challenge";
import { dayNumber, localDateKey } from "@/lib/daily";
import { isOffensive } from "@/lib/name-filter";
import { loadPlayer } from "@/lib/player";

export type ShareMessage = { kind: "score"; text: string; url: string };

// the first name a player (not signed in) shares under, asked once and kept in this browser; "" means they skipped
const NAME_KEY = "atlas-share-name";

/** The name a shared link carries: the account's username, else the name given when first sharing. */
export function shareName(): string {
  const player = loadPlayer()?.name;
  if (player) return player;
  try {
    return tidyName(localStorage.getItem(NAME_KEY) ?? "");
  } catch {
    return "";
  }
}

/** True until the player has an account name or has answered the one-time name question (a skip counts). */
export function needsShareName() {
  if (loadPlayer()?.name) return false;
  try {
    return localStorage.getItem(NAME_KEY) === null;
  } catch {
    return false;
  }
}

/** Keeps the name for next time ("" when skipped, so the question isn't asked again). Returns what was kept. */
export function rememberShareName(raw: string) {
  const name = tidyName(raw);
  const kept = name && !isOffensive(name) ? name : "";
  try {
    localStorage.setItem(NAME_KEY, kept);
  } catch {
    /* storage blocked: asked again next time */
  }
  return kept;
}

/** The link with your score in it (today's unless a date is given): a friend who opens it sees the score to beat. */
export function challengeUrl(score: number, date = localDateKey()) {
  return `${location.origin}${challengePath(dayNumber(date), score, shareName())}`;
}

/** Phones open their own share sheet. Returns false when the caller should show the share box instead. */
export async function nativeShare(text: string): Promise<boolean> {
  if (!navigator.share || !matchMedia("(pointer: coarse)").matches) return false;
  try {
    await navigator.share({ text });
    return true;
  } catch (e) {
    // closing the share sheet is a choice, not a failure
    return e instanceof DOMException && e.name === "AbortError";
  }
}
