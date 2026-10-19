import Link from "next/link";
import { nav, site } from "@/content/site";
import { SiteMenu } from "./SiteMenu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-panel text-panel-text">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="font-display text-2xl font-bold tracking-tight">
          {site.name}
        </Link>
        <nav aria-label="Main" className="hidden flex-1 md:block">
          <ul className="flex gap-1">
            {nav.slice(1).map((item) => (
              <li key={item.href} className={item.from === "xl" ? "hidden xl:block" : item.from === "lg" ? "hidden lg:block" : undefined}>
                <Link href={item.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-panel-text/90 hover:bg-white/10 hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Link
          href="/map"
          className="ml-auto hidden h-10 items-center rounded-lg bg-accent px-4 text-sm font-bold text-panel hover:bg-accent-strong md:inline-flex"
        >
          Open the map
        </Link>
        <SiteMenu variant="header" />
      </div>
    </header>
  );
}
