import { dailyCopy as t } from "@/content/daily";
import { challengeFromParam } from "@/lib/challenge";
import { OG_SIZE, pairImage } from "@/lib/og-shapes";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "A friend's score on the daily challenge, beside two countries as a normal map draws them and at their real size";

/**
 * The preview for a "beat my score" link: the friend's score, over the proof pair (never the day's real pair: that
 * would give away an answer).
 */
export default async function Image({ params }: { params: Promise<{ c: string }> }) {
  const c = challengeFromParam((await params).c);
  const ids: [string, string] = ["greenland-present", "india-present"];
  if (!c) return pairImage({ ids, eyebrow: t.eyebrow, title: t.title, line: t.og });
  return pairImage({ ids, eyebrow: t.challenge.ogEyebrow(c.day), title: t.challenge.ogTitle(c.name, c.score), line: t.challenge.ogLine });
}
