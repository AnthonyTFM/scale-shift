import Link from "next/link";
import { nav, site } from "@/content/site";
import { SiteMenu } from "./SiteMenu";
import { Wordmark } from "./Wordmark";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 text-ink backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/" aria-label={`${site.name} home`} className="shrink-0 rounded-lg">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="hidden flex-1 md:block">
          <ul className="flex gap-1">
            {nav.slice(1).map((item) => (
              <li key={item.href} className={item.from === "xl" ? "hidden xl:block" : item.from === "lg" ? "hidden lg:block" : undefined}>
                <Link href={item.href} className="rounded-xl px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-white hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Link href="/map" className="btn btn-primary ml-auto mb-0 hidden h-11 text-sm md:inline-flex">
          Open the map
        </Link>
        <SiteMenu variant="header" />
      </div>
    </header>
  );
}
