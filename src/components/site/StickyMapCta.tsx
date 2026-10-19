"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { home } from "@/content/home";

/** Phone-only "open the map" bar. Hidden on the daily challenge so it never covers the game, and on the homepage
 * until you scroll past the hero, which has its own map button. */
export function StickyMapCta() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (path !== "/") return;
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [path]);
  if (path === "/daily" || (path === "/" && !scrolled)) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 p-3 backdrop-blur md:hidden">
      <Link href="/map" className="flex h-12 items-center justify-center rounded-lg bg-accent font-bold text-panel">
        {home.stickyCta}
      </Link>
    </div>
  );
}
