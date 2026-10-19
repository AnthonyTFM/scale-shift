import Link from "next/link";
import { footerNav, nav, site } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-panel pb-24 text-panel-text md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl font-bold">{site.name}</p>
          <p className="mt-2 max-w-xs text-sm text-panel-muted">{site.tagline}</p>
          <Link href="/map" className="mt-4 inline-flex h-11 items-center rounded-lg bg-accent px-4 text-sm font-bold text-panel hover:bg-accent-strong">
            Open the map
          </Link>
        </div>
        <nav aria-label="Explore">
          <p className="text-xs font-semibold uppercase tracking-wide text-panel-muted">Explore</p>
          <ul className="mt-3 space-y-2 text-sm">
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="About">
          <p className="text-xs font-semibold uppercase tracking-wide text-panel-muted">About</p>
          <ul className="mt-3 space-y-2 text-sm">
            {footerNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-panel-muted">
          © {site.copyrightHolder}. Historical borders: historical-basemaps by André Ourednik (GPL-3.0). Present-day borders: Natural Earth (public
          domain). Non-commercial educational project.
        </p>
      </div>
    </footer>
  );
}

/** Mobile-only sticky bar that keeps the main action one tap away. */

export { StickyMapCta } from "./StickyMapCta";
