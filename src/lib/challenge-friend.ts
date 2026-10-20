import { challengeHash } from "@/lib/challenge";
import { dayNumber, localDateKey } from "@/lib/daily";
import { loadPlayer } from "@/lib/player";
import { track } from "@/lib/analytics";
import { site } from "@/content/site";

/**
 * Shares (phones) or copies (desktop) a "beat my score" link to today's challenge, like the results screen does.
 * Returns a note to show, or null when the phone's share sheet handled it.
 */
export async function challengeFriend(score: number, total = 5): Promise<string | null> {
  const url = `${location.origin}/daily${challengeHash(dayNumber(localDateKey()), score, loadPlayer()?.name ?? null)}`;
  const text = `I got ${score}/${total} on today's ${site.name} challenge. Think you can beat me?\n${url}`;
  track("daily_challenge_friend", { score, from: "home" });
  try {
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      await navigator.share({ text });
      return null;
    }
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return text;
  }
}
