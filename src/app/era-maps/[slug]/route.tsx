import sharp from "sharp";
import { eraByKey, eras, eraSlug, keyFromSlug } from "@/lib/eras";
import { eraImage } from "@/lib/og-era";

export function generateStaticParams() {
  return eras.map((e) => ({ slug: eraSlug(e.key) }));
}

/** The social image as lossless WebP: the same pixels as the PNG, a third smaller. Cached, so it's made once at build time. */
async function eraWebp(slug: string) {
  "use cache";
  const png = Buffer.from(await eraImage(slug).arrayBuffer());
  return new Uint8Array(await sharp(png).webp({ lossless: true }).toBuffer());
}

/** The era page's hero map. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // unknown names would each be drawn and cached on demand
  if (!eraByKey(keyFromSlug(slug))) return new Response(null, { status: 404 });
  return new Response(await eraWebp(slug), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
  });
}
