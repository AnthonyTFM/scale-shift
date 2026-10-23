import { disputes } from "@/content/disputes";
import { locatorGlobeSvg } from "@/lib/og-map";

export function generateStaticParams() {
  return disputes.map((d) => ({ id: d.id }));
}

/** A small globe pinned on the disputed place, as vector art. Cached, so it's made at build time. */
async function locator(id: string) {
  "use cache";
  const d = disputes.find((x) => x.id === id)!;
  return locatorGlobeSvg(d.lon, d.lat);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // unknown names would each be drawn and cached on demand
  if (!disputes.some((d) => d.id === id)) return new Response(null, { status: 404 });
  return new Response(await locator(id), {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
  });
}
