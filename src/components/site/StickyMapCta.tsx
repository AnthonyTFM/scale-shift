"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Phone-only "open the map" bar. Hidden on the daily challenge so it never covers the game. */
export function StickyMapCta() {
  if (usePathname() === "/daily") return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 p-3 backdrop-blur md:hidden">
      <Link href="/map" className="flex h-12 items-center justify-center rounded-lg bg-accent font-bold text-panel">
        Open the interactive map
      </Link>
    </div>
  );
}
