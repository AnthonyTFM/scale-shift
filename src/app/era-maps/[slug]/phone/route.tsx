import sharp from "sharp";
import { cacheLife } from "next/cache";
import { eraByKey, eras, eraSlug, keyFromSlug } from "@/lib/eras";
import { equalAreaMapSvg } from "@/lib/og-map";

export function generateStaticParams() {
  return eras.map((e) => ({ slug: eraSlug(e.key) }));
}

// a phone shows the map about 360 px wide: drawn wide enough for a sharp picture on a 3× screen
const WIDTH = 1080;

/**
 * The era map as a picture for phones. The vector map (../map) is 300–500 KB with thousands of outlines, which a phone
 * takes seconds to draw; this is a fraction of that and shows at once. Made at build time, and kept until the next
 * deploy (it can only change with the map data).
 */
async function eraPhoneMap(key: string) {
  "use cache";
  cacheLife("max");
  const { svg } = equalAreaMapSvg(key, WIDTH);
  // quality 80: about 55 KB, which keeps a phone's first load under 2.5 s; the hairline borders were checked sharp at it
  // on a 3× screen (90 made it 80 KB, slow enough to put first load just over)
  return new Uint8Array(await sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer());
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const era = eraByKey(keyFromSlug(slug));
  if (!era) return new Response(null, { status: 404 });
  return new Response(await eraPhoneMap(era.key), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
  });
}
