import sharp from "sharp";
import { cacheLife } from "next/cache";
import { eraByKey, eras, eraSlug, keyFromSlug } from "@/lib/eras";
import { equalAreaMapSvg } from "@/lib/og-map";

export function generateStaticParams() {
  return eras.map((e) => ({ slug: eraSlug(e.key) }));
}

// a phone held sideways shows the map about 810 px wide: drawn wide enough to stay sharp on its 3× screen
const WIDTH = 2160;

/**
 * The era map as a picture for phones held sideways (wide but short screens); upright phones use ../phone, and tablets
 * and computers the vector map (../map), which a phone takes seconds to draw. Made at build time, and kept until the
 * next deploy (it can only change with the map data).
 */
async function eraWideMap(key: string) {
  "use cache";
  cacheLife("max");
  const { svg } = equalAreaMapSvg(key, WIDTH);
  // quality 80, as the upright picture: light, with the hairline borders still sharp
  return new Uint8Array(await sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer());
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const era = eraByKey(keyFromSlug(slug));
  if (!era) return new Response(null, { status: 404 });
  return new Response(await eraWideMap(era.key), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
  });
}
