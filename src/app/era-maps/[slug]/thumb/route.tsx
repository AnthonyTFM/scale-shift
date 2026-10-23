import sharp from "sharp";
import { eraByKey, eras, eraSlug, keyFromSlug } from "@/lib/eras";
import { equalAreaMapSvg } from "@/lib/og-map";

export function generateStaticParams() {
  return eras.map((e) => ({ slug: eraSlug(e.key) }));
}

// drawn at twice the size it shows on /eras (about 280 px wide), so it stays sharp on phone screens
const WIDTH = 600;

/** A small picture of the era map for the cards on /eras. Cached, so it's made at build time. */
async function eraThumb(key: string) {
  "use cache";
  const { svg } = equalAreaMapSvg(key, WIDTH);
  return new Uint8Array(await sharp(Buffer.from(svg)).webp({ quality: 85 }).toBuffer());
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const era = eraByKey(keyFromSlug(slug));
  if (!era) return new Response(null, { status: 404 });
  return new Response(await eraThumb(era.key), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
  });
}
