import Link from "next/link";
import { menu, site } from "@/content/site";
import { Wordmark } from "./Wordmark";

// the same three groups as the phone menu (src/content/site.ts), so nothing is listed twice and nothing is missing
const groups = [
  { title: menu.mainTitle, items: menu.main },
  { title: menu.historyTitle, items: menu.history },
  { title: menu.moreTitle, items: menu.more },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-white pb-24 text-ink md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="sm:col-span-3 md:col-span-1">
          <Link href="/" aria-label={`${site.name} home`} className="inline-flex min-h-11 items-center rounded-lg">
            <Wordmark />
          </Link>
          <p className="mt-3 max-w-xs text-sm text-muted">{site.tagline}</p>
        </div>
        {groups.map((g) => (
          <nav key={g.title} aria-label={g.title}>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">{g.title}</p>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 text-sm sm:grid-cols-1">
              {g.items.map((item) => (
                <li key={item.href}>
                  {/* not prefetched: on a short page (a game loading) the whole footer is in view, and prefetching every
                      page (the map alone is 50 KB of script) cost more than the odd tap saves */}
                  <Link href={item.href} prefetch={false} className="inline-flex min-h-11 items-center font-medium text-ink-soft hover:text-primary hover:underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted">
          © {site.copyrightHolder}. Historical borders: to 1783, historical-basemaps by André Ourednik (GPL-3.0), corrected with Cliopatria and OpenHistoricalMap; 1800 to 1960: Cliopatria,
          Seshat Global History Databank (CC BY 4.0), and OpenHistoricalMap (CC0; some lines CC BY 4.0, see the data license); Europe from
          1815 to 1914: HistoGIS, Austrian Academy of Sciences (CC BY 4.0). 1994 to today: Natural Earth (public domain). Non-commercial
          educational project.
        </p>
      </div>
    </footer>
  );
}
