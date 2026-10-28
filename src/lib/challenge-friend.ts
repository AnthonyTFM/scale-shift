import { challengeHash } from "@/lib/challenge";
import { dayNumber, localDateKey } from "@/lib/daily";
import { loadPlayer } from "@/lib/player";

export type ShareMessage = { kind: "score"; text: string; url: string };

/** The daily's link with your score in it (today's unless a date is given): a friend who opens it sees the score to beat. */
export function challengeUrl(score: number, date = localDateKey()) {
  return `${location.origin}/daily${challengeHash(dayNumber(date), score, loadPlayer()?.name ?? null)}`;
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
