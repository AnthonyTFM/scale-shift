import { cacheLife } from "next/cache";
import Link from "next/link";
import { presets, type Preset } from "@/content/presets";
import { mapUrl } from "@/lib/share";

const DAY = 86_400_000;
/** Weeks start on Monday (UTC). 1970-01-05 was a Monday. */
const MONDAY_EPOCH = Date.UTC(1970, 0, 5);

/** Picks `n` items for a given week, walking through the list so every item gets its turn before any repeats. */
function rotate<T>(list: T[], n: number, week: number) {
  return Array.from({ length: Math.min(n, list.length) }, (_, i) => list[(week * n + i) % list.length]);
}

/** Weeks since 1970 (Monday to Monday, UTC). Cached and refreshed every few hours, so a new week shows up soon after it starts. */
async function currentWeek() {
  "use cache";
  cacheLife("hours");
  return Math.floor((Date.now() - MONDAY_EPOCH) / (7 * DAY));
}

/** "Jump straight in": three surprising and three controversial comparisons, changing every Monday. */
export async function WeeklyPicks() {
  const week = await currentWeek();
  const monday = new Date(MONDAY_EPOCH + week * 7 * DAY);
  const picks: Preset[] = [
    ...rotate(
      presets.filter((p) => p.category === "surprising"),
      3,
      week,
    ),
    ...rotate(
      presets.filter((p) => p.category === "controversial"),
      3,
      week,
    ),
  ];
  const label = monday.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });

  return (
    <>
      <p className="mt-1 text-ink-soft">
        This week&apos;s picks (new every Monday; this set since {label}). Each one opens the map with the comparison already set up.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {picks.map((p) => (
          <li key={p.id}>
            <Link
              href={mapUrl({ era: p.baseEra, shapes: p.shapes.map((s, i) => ({ ...s, color: i })), at: p.at })}
              className={`block h-full rounded-xl p-4 ring-1 transition hover:ring-2 ${
                p.category === "controversial" ? "bg-rose-50 ring-rose-200 hover:ring-rose-400" : "bg-amber-50 ring-amber-200 hover:ring-amber-400"
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                {p.category === "controversial" ? "Controversial" : "Surprising"}
              </span>
              <span className="mt-0.5 block font-bold text-ink">{p.title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-ink-soft">{p.hook}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
