import { dailyCopy as t } from "@/content/daily";
import { OG_SIZE, pairImage } from "@/lib/og-shapes";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Which is bigger? Two countries as a normal map draws them, and at their real size";

/** The daily game's preview: the proof pair (a normal map draws Greenland bigger than India; India is bigger). */
export default async function Image() {
  return pairImage({ ids: ["greenland-present", "india-present"], eyebrow: t.eyebrow, title: t.title, line: t.og });
}
