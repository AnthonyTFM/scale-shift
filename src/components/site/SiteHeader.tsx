import Link from "next/link";
import { site } from "@/content/site";
import { HeaderNav } from "./HeaderNav";
import { SiteMenu } from "./SiteMenu";
import { Wordmark } from "./Wordmark";

export function SiteHeader() {
  return (
    // on phones held sideways the header scrolls away with the page, leaving the short screen to the content
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 text-ink backdrop-blur-md [@media(max-height:500px)]:static">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/" aria-label={`${site.name} home`} className="inline-flex min-h-11 shrink-0 items-center rounded-lg">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="hidden flex-1 md:block">
          <HeaderNav />
        </nav>
        <Link href="/map" className="btn btn-primary ml-auto mb-0 hidden h-11 text-sm md:inline-flex">
          Open the map
        </Link>
        <SiteMenu variant="header" />
      </div>
    </header>
  );
}
