import { eraByKey, eras, eraSlug, keyFromSlug } from "@/lib/eras";
import { equalAreaMapSvg } from "@/lib/og-map";

export function generateStaticParams() {
  return eras.map((e) => ({ slug: eraSlug(e.key) }));
}

/** The era's borders on an equal-area map, as vector art: sharp on any screen. Cached, so it's made at build time. */
async function eraMap(key: string) {
  "use cache";
  return equalAreaMapSvg(key).svg;
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const era = eraByKey(keyFromSlug(slug));
  // unknown names would each be drawn and cached on demand
  if (!era) return new Response(null, { status: 404 });
  return new Response(await eraMap(era.key), {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
  });
}
