import { challengeHash } from "@/lib/challenge";
import { dayNumber, localDateKey } from "@/lib/daily";
import { loadPlayer } from "@/lib/player";
import { site } from "@/content/site";

export type ShareMessage = { kind: "challenge" | "score"; text: string; url: string };

/** The "beat my score" message for a daily challenge (today's unless a date is given). */
export function challengeMessage(score: number, total = 5, date = localDateKey()): ShareMessage {
  const url = `${location.origin}/daily${challengeHash(dayNumber(date), score, loadPlayer()?.name ?? null)}`;
  return { kind: "challenge", url, text: `I got ${score}/${total} on today's ${site.name} challenge. Think you can beat me?\n${url}` };
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
