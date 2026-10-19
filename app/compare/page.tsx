import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/SiteChrome";
import { comparisons } from "@/content/comparisons";
import { getEntity, getIndex } from "@/lib/data-server";
import { areaAt, formatRatio } from "@/lib/format";

export const metadata: Metadata = {
  title: "True size comparisons: countries and empires side by side",
  description: "Greenland vs Africa, Rome vs the United States, the Mongol Empire vs Russia and more, compared at true size on one map.",
  alternates: { canonical: "/compare" },
};

export default function CompareIndex() {
  const ix = getIndex();
  return (
    <PageShell>
      <h1 className="font-display text-[2.6rem] leading-[1.05] sm:text-[3.4rem]">Comparisons</h1>
      <p className="mt-3 max-w-[60ch] text-lg text-ink-soft">
        Two shapes, one map, real sizes. Open any comparison, then drag the shapes yourself.
      </p>
      <ul className="mt-10 grid gap-x-10 md:grid-cols-2">
        {comparisons.map((c) => {
          const ea = getEntity(c.a.id);
          const eb = getEntity(c.b.id);
          const aa = ea ? areaAt(ea, ix.years, c.a.year) ?? 0 : 0;
          const ab = eb ? areaAt(eb, ix.years, c.b.year) ?? 0 : 0;
          const ratio = Math.max(aa, ab) / Math.max(1, Math.min(aa, ab));
          return (
            <li key={c.slug} className="border-b border-paper-3">
              <Link href={`/compare/${c.slug}`} className="block py-4 hover:underline">
                <span className="font-display block text-2xl leading-tight">{c.title}</span>
                <span className="mt-1 block text-sm text-ink-soft">
                  {c.intro} One is {formatRatio(ratio)} the other.
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}
