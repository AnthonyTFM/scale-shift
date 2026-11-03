import { sizes as t } from "@/content/sizes";
import { partnerFor, sizeBySlug, sizeCountries, timesText } from "@/lib/sizes";
import { OG_SIZE, pairImage } from "@/lib/og-shapes";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "A country as a normal map draws it, and at its real size";

export function generateStaticParams() {
  return sizeCountries.map((c) => ({ slug: c.slug }));
}

/** A country page's preview: the country and its size partner, as a normal map draws them and at real size. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = sizeBySlug.get(slug) ?? sizeCountries[0];
  const partner = partnerFor(c);
  return pairImage({
    ids: [c.id, partner.id],
    eyebrow: t.eyebrow,
    title: t.ogTitle(c.n),
    line: c.stretch >= 1.15 ? t.ogStretch(timesText(c.stretch), partner.n) : t.ogRight(partner.n),
  });
}
