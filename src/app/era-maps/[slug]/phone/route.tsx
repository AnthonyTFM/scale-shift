import sharp from "sharp";
import { eraByKey, eras, eraSlug, keyFromSlug } from "@/lib/eras";
import { equalAreaMapSvg } from "@/lib/og-map";

export function generateStaticParams() {
  return eras.map((e) => ({ slug: eraSlug(e.key) }));
}

// a phone shows the map about 360 px wide: drawn wide enough for a sharp picture on a 3× screen
const WIDTH = 1080;

/**
 * The era map as a picture for phones. The vector map (../map) is around 200 KB with thousands of outlines, which a
 * phone takes seconds to draw; this is a fraction of that and shows at once. Cached, so it's made at build time.
 */
async function eraPhoneMap(key: string) {
  "use cache";
  const { svg } = equalAreaMapSvg(key, WIDTH);
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
