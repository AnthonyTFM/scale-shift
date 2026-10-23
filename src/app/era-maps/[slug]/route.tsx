import sharp from "sharp";
import { eras, eraSlug } from "@/lib/eras";
import { eraImage } from "@/lib/og-era";

export function generateStaticParams() {
  return eras.map((e) => ({ slug: eraSlug(e.key) }));
}

/** The social image as WebP (about 40 KB instead of a 170 KB PNG). Cached, so it's made once at build time. */
async function eraWebp(slug: string) {
  "use cache";
  const png = Buffer.from(await eraImage(slug).arrayBuffer());
  return new Uint8Array(await sharp(png).webp({ quality: 72 }).toBuffer());
}

/** The era page's hero map. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return new Response(await eraWebp(slug), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
  });
}
