"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav } from "@/content/site";

/** The desktop header links, with the current section marked (an era page counts as Eras). */
export function HeaderNav() {
  const path = usePathname();
  return (
    <ul className="flex gap-1">
      {nav.slice(1).map((item) => {
        const here = path === item.href || path.startsWith(`${item.href}/`);
        return (
          <li key={item.href} className={item.from === "xl" ? "hidden xl:block" : item.from === "lg" ? "hidden lg:block" : undefined}>
            <Link
              href={item.href}
              aria-current={here ? "page" : undefined}
              className="relative whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-white hover:text-ink aria-[current=page]:bg-white aria-[current=page]:text-ink aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-3 aria-[current=page]:after:-bottom-px aria-[current=page]:after:h-[3px] aria-[current=page]:after:rounded-full aria-[current=page]:after:bg-primary"
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
