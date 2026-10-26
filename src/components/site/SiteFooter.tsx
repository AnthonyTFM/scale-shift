import Link from "next/link";
import { footerNav, nav, site } from "@/content/site";
import { Wordmark } from "./Wordmark";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-white pb-24 text-ink md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <Link href="/" aria-label={`${site.name} home`} className="inline-flex min-h-11 items-center rounded-lg">
            <Wordmark />
          </Link>
          <p className="mt-3 max-w-xs text-sm text-muted">{site.tagline}</p>
          <Link href="/map" className="btn btn-primary mt-5 h-11 text-sm">
            Open the map
          </Link>
        </div>
        <nav aria-label="Explore">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Explore</p>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 text-sm md:grid-cols-1">
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="inline-flex min-h-11 items-center font-medium text-ink-soft hover:text-primary hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="About">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">About</p>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 text-sm md:grid-cols-1">
            {footerNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="inline-flex min-h-11 items-center font-medium text-ink-soft hover:text-primary hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted">
          © {site.copyrightHolder}. Historical borders: to 1783, historical-basemaps by André Ourednik (GPL-3.0); 1800 to 1960: Cliopatria,
          Seshat Global History Databank (CC BY 4.0), and OpenHistoricalMap (CC0; some lines CC BY 4.0, see the data license); Europe from
          1815 to 1914: HistoGIS, Austrian Academy of Sciences (CC BY 4.0). 1994 to today: Natural Earth (public domain). Non-commercial
          educational project.
        </p>
      </div>
    </footer>
  );
}

/** Mobile-only sticky bar that keeps the main action one tap away. */

export { StickyMapCta } from "./StickyMapCta";
