import { eras, eraSlug } from "@/lib/eras";
import { eraImage, OG_SIZE } from "@/lib/og-era";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "World map of borders in this era";

export function generateStaticParams() {
  return eras.map((e) => ({ slug: eraSlug(e.key) }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return eraImage(slug);
}
