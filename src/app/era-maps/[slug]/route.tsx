import { eras, eraSlug } from "@/lib/eras";
import { eraImage } from "@/lib/og-era";

export function generateStaticParams() {
  return eras.map((e) => ({ slug: eraSlug(e.key) }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return eraImage(slug);
}
