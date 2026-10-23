// Preview-only pieces for the homepage mockups (F4d). Not linked from the site, not in the sitemap, noindex.
import { ViewTransition } from "react";
import Link from "next/link";
import pool from "@/data/daily-pool.json";
import { disputes } from "@/content/disputes";
import { events } from "@/content/events";
import { home } from "@/content/home";
import { eras } from "@/lib/eras";
import { GlobeLazy } from "@/components/home/GlobeLazy";
import { BookIcon, ColumnsIcon, DisputeIcon, MapIcon, TimelineIcon, TrophyIcon } from "@/components/site/Icons";

export const mockMeta = { robots: { index: false, follow: false } };

const OPTIONS = [
  ["a", "A · Trim"],
  ["b", "B · Yesterday leads"],
  ["c", "C · Launcher"],
] as const;

/** The strip on top of each mockup: which one this is, and links to the others and to today's homepage. */
export function MockupBar({ current, note }: { current: "a" | "b" | "c"; note: string }) {
  return (
    <div className="border-b-2 border-gold bg-gold-soft text-ink">
      <div className="mx-auto max-w-6xl px-4 py-2.5 text-sm">
        <p className="font-semibold">
          Homepage mockup, preview only. <span className="font-normal text-ink-soft">{note}</span>
        </p>
        <nav aria-label="Mockups" className="-mx-4 mt-1.5 flex gap-2 overflow-x-auto px-4 pb-0.5">
          {OPTIONS.map(([id, label]) => (
            <Link
              key={id}
              href={`/mockups/home-${id}`}
              aria-current={id === current ? "page" : undefined}
              className="inline-flex min-h-9 shrink-0 items-center rounded-full border-2 border-gold bg-white px-3 font-semibold aria-[current=page]:bg-ink aria-[current=page]:text-white"
            >
              {label}
            </Link>
          ))}
          <Link href="/" className="inline-flex min-h-9 shrink-0 items-center rounded-full border-2 border-line bg-white px-3 font-semibold text-muted">
            Today&apos;s homepage
          </Link>
        </nav>
      </div>
    </div>
  );
}

/** The slowly turning globe behind the hero (decorative, no dragging). */
export function HeroGlobe() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div className="globe-float absolute left-[calc(50%-min(60vw,310px))] top-[-4%] w-[120vw] max-w-[620px] opacity-30 lg:left-auto lg:right-[-6%] lg:top-[calc(48%-min(31vw,440px))] lg:w-[min(62vw,880px)] lg:max-w-none lg:opacity-70">
        <ViewTransition name="world" share="morph" default="none">
          <div>
            <GlobeLazy label="A slowly turning globe of today's countries." />
          </div>
        </ViewTransition>
      </div>
      <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,#fff8ec_0%,rgba(255,248,236,0.88)_38%,rgba(255,248,236,0)_62%)] lg:block" />
    </div>
  );
}

export function Title({ small = false }: { small?: boolean }) {
  return (
    <h1 className={`font-display leading-[1.05] text-ink ${small ? "text-3xl md:text-4xl" : "mt-3 text-4xl md:text-5xl lg:text-6xl"}`}>
      {home.title.split(home.titleAccent).flatMap((part, i) => (i ? [<span key={i} className="text-red">{home.titleAccent}</span>, part] : [part]))}
    </h1>
  );
}

export function Stats() {
  return (
    <dl className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted sm:gap-x-4 sm:text-sm">
      {[
        [String(eras.length), "map snapshots"],
        [String(events.length), "border events"],
        [String(pool.length), "places to compare"],
      ].map(([n, label]) => (
        <div key={label} className="flex items-baseline gap-1.5">
          <dt className="sr-only">{label}</dt>
          <dd>
            <span className="font-display text-base text-ink sm:text-lg">{n}</span> {label}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function MapCard() {
  return (
    <Link href="/map" transitionTypes={["to-map"]} className="press-card group flex items-center gap-4 rounded-card px-5 py-4 text-ink hover:border-primary">
      <MapIcon className="size-11" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold uppercase tracking-wide text-primary">{home.hub.mapEyebrow}</span>
        <span className="mt-0.5 block font-display text-xl leading-tight md:text-2xl">{home.hub.mapTitle}</span>
        <span className="mt-1 block text-sm text-muted">{home.hub.mapLead}</span>
      </span>
      <span className="hidden shrink-0 font-bold text-primary sm:inline">
        {home.hub.mapCta} <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}

export const places = [
  { href: "/leaderboard", Icon: TrophyIcon, title: "Leaderboard", line: "Today's best and all-time points" },
  { href: "/eras", Icon: ColumnsIcon, title: "Eras", line: `${eras.length} snapshots, 2000 BCE to today` },
  { href: "/timeline", Icon: TimelineIcon, title: "Timeline", line: `${events.length} times land changed hands` },
  { href: "/disputes", Icon: DisputeIcon, title: "Disputed borders", line: `${disputes.length} places, from Crimea to Antarctica` },
  { href: "/teachers", Icon: BookIcon, title: "For teachers", line: "Everything for the classroom" },
];

/** Compact directory: one row per page, icon, name and one line. */
export function PlaceList({ withMap = false }: { withMap?: boolean }) {
  const list = withMap ? [{ href: "/map", Icon: MapIcon, title: "The map", line: "Drag any country, 4,000 years of borders" }, ...places] : places;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {list.map(({ href, Icon, title, line }) => (
        <li key={href}>
          <Link href={href} className="press-card flex min-h-16 items-center gap-3 rounded-card px-4 py-3 hover:border-primary">
            <Icon className="size-8" />
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg leading-tight text-ink">{title}</span>
              <span className="block text-sm text-muted">{line}</span>
            </span>
            <span aria-hidden="true" className="font-bold text-primary">
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** How a round works, as three short numbered steps. */
export function Steps() {
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {home.hub.steps.map(([title, body], i) => (
        <li key={title} className="flex gap-3">
          <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-display text-white">
            {i + 1}
          </span>
          <span>
            <span className="block font-bold text-ink">{title}</span>
            <span className="block text-sm leading-relaxed text-ink-soft">{body}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
