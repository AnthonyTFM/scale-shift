"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { menu } from "@/content/site";
import { Wordmark } from "./Wordmark";
import { MapIcon, TargetIcon, TrophyIcon } from "./Icons";

const ICONS = { map: MapIcon, target: TargetIcon, trophy: TrophyIcon } as const;

/**
 * The "three lines" menu. variant="map" is the floating button on the map page (always visible);
 * variant="header" is the mobile button in the content-page header.
 */
export function SiteMenu({ variant }: { variant: "map" | "header" }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // close when the route changes
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
      if (e.key === "Tab" && panel) {
        const items = [...panel.querySelectorAll<HTMLElement>("a, button")];
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const close = () => setOpen(false);
  const here = (href: string) => (pathname === href ? "page" : undefined);

  return (
    <div className={variant === "header" ? "ml-auto md:hidden" : ""}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className={
          variant === "map"
            ? "grid size-11 place-items-center rounded-xl bg-panel text-panel-text shadow-float hover:bg-panel-2"
            : "grid size-11 place-items-center rounded-xl text-ink hover:bg-white"
        }
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2">
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open
        ? createPortal(
        <div className="fixed inset-0 z-[100]">
          <button type="button" aria-label="Close menu" tabIndex={-1} onClick={close} className="absolute inset-0 bg-ink/40" />
          <div
            id="site-menu"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 right-0 flex w-[min(88vw,340px)] flex-col overflow-y-auto rounded-l-[28px] bg-paper px-5 py-5 text-ink shadow-float"
          >
            <div className="flex items-center justify-between">
              <Wordmark />
              <button type="button" onClick={close} aria-label="Close menu" className="grid size-11 place-items-center rounded-xl hover:bg-white">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <nav aria-label="Site" className="mt-5">
              <ul className="space-y-2">
                {menu.main.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      aria-current={here(item.href)}
                      className="press-card flex items-center gap-3 rounded-[20px] px-3 py-3 hover:bg-white aria-[current=page]:border-primary aria-[current=page]:[--press-shadow:var(--color-primary)]"
                    >
                      <MenuIcon name={item.icon} />
                      <span className="min-w-0">
                        <span className="block font-display text-lg leading-tight">
                          {item.href === "/map" && pathname === "/map" ? menu.backToMap : item.label}
                        </span>
                        <span className="block text-sm text-muted">{item.blurb}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-7 px-1 text-xs font-bold uppercase tracking-wide text-muted">{menu.historyTitle}</p>
              <ul className="mt-2 grid grid-cols-3 gap-2">
                {menu.history.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      aria-current={here(item.href)}
                      className="press-card flex h-full min-h-12 items-center justify-center rounded-2xl px-2 py-2 text-center text-sm font-bold leading-tight aria-[current=page]:border-primary aria-[current=page]:text-primary"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="About" className="mt-auto border-t border-line pt-4">
              <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
                {menu.more.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} onClick={close} aria-current={here(item.href)} className="hover:text-primary hover:underline aria-[current=page]:font-semibold aria-[current=page]:text-primary">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>,
            document.body,
          )
        : null}
    </div>
  );
}

/** The drawn icon on a main menu row. */
function MenuIcon({ name }: { name: keyof typeof ICONS }) {
  const Icon = ICONS[name];
  return (
    <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-tile">
      <Icon className="size-7" />
    </span>
  );
}
