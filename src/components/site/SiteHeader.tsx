import Link from "next/link";
import { site } from "@/content/site";
import { HeaderNav } from "./HeaderNav";
import { SiteMenu } from "./SiteMenu";
import { Wordmark } from "./Wordmark";
import { PersonIcon } from "./Icons";
import { accountCopy } from "@/content/account";
import { signInOn } from "@/lib/sign-in";

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
        <Link href="/map" className="btn btn-primary ml-auto mb-0 hidden h-11 text-sm lg:inline-flex">
          Open the map
        </Link>
        <SiteMenu variant="header" />
        {/* wide screens have no menu button: the account sits in its place, top right */}
        {signInOn ? (
          <Link href="/account" aria-label={accountCopy.headerSr} title={accountCopy.headerSr} className="hidden size-11 place-items-center rounded-xl hover:bg-white xl:grid">
            <PersonIcon className="size-8" />
          </Link>
        ) : null}
      </div>
    </header>
  );
}
