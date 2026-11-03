import { endlessCopy as t } from "@/content/endless";
import { OG_SIZE, pairImage } from "@/lib/og-shapes";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "How far can you go? Two countries as a normal map draws them, and at their real size";

/** Endless mode's preview: Russia and Brazil (a normal map draws Russia 9× Brazil; really 2×). */
export default async function Image() {
  return pairImage({ ids: ["russia-present", "brazil-present"], eyebrow: t.eyebrow, title: t.title, line: t.og });
}
