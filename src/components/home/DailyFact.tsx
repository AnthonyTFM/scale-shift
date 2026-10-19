import { cacheLife } from "next/cache";
import Link from "next/link";
import pool from "@/data/daily-pool.json";
import { home } from "@/content/home";
import { presets, type Preset } from "@/content/presets";
import { mapUrl } from "@/lib/share";
import { PALETTE } from "@/lib/palette";

const DAY = 86_400_000;
type PoolRow = { n: string; era: string; a: number; m: number };

/** Two-shape "surprising" comparisons we have both areas for: real (a) and how big a normal map draws it (m). */
const facts = presets
  .filter((p) => p.category === "surprising" && p.shapes.length === 2)
  .map((p) => {
    const rows = p.shapes.map((s) => (pool as PoolRow[]).find((r) => r.n === s.name && r.era === s.era));
    return rows.every(Boolean) ? { preset: p, rows: rows as PoolRow[] } : null;
  })
  .filter((f): f is { preset: Preset; rows: PoolRow[] } => f !== null);

/** Days since 1970 (UTC). Cached for an hour so the fact flips soon after midnight UTC. */
async function currentDay() {
  "use cache";
  cacheLife("hours");
  return Math.floor(Date.now() / DAY);
}

const fmt = (km2: number) => `${(km2 / 1e6).toFixed(km2 < 1e6 ? 2 : 1)}M km²`;

/** Map-size bars have no numbers: they only show how the stretch distorts, the real-size bars give the areas. */
function Bars({ label, rows, field }: { label: string; rows: PoolRow[]; field: "a" | "m" }) {
  const max = Math.max(...rows.map((r) => r[field]));
  return (
    <span className="mt-3 block">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      <span className="mt-1 block space-y-1.5">
        {rows.map((r, i) => (
          <span key={r.n} className="flex items-center gap-2 text-sm">
            <span className="w-28 shrink-0 truncate font-semibold sm:w-32">{r.n}</span>
            <span className="h-3 flex-1 overflow-hidden rounded-full bg-paper">
              <span className="block h-full rounded-full" style={{ width: `${(r[field] / max) * 100}%`, background: PALETTE[i] }} />
            </span>
            {field === "a" ? <span className="shrink-0 whitespace-nowrap text-right font-mono text-xs text-ink-soft">{fmt(r[field])}</span> : null}
          </span>
        ))}
      </span>
    </span>
  );
}

/** "See it to believe it": a different true-size comparison every day, with map size vs real size. */
export async function DailyFact() {
  const day = await currentDay();
  const { preset, rows } = facts[day % facts.length];
  const href = mapUrl({ era: preset.baseEra, shapes: preset.shapes.map((s, i) => ({ ...s, color: i })), at: preset.at });
  return (
    <Link
      href={href}
      className="grid items-center gap-x-8 gap-y-1 rounded-card bg-white p-5 text-ink shadow-sm ring-1 ring-line transition hover:-translate-y-0.5 hover:ring-amber-300 md:grid-cols-[1fr_1.3fr] md:px-7"
    >
      <span className="block">
        <span className="block text-xs font-bold uppercase tracking-wide text-link">{home.fact.eyebrow}</span>
        <span className="mt-1 block font-display text-2xl leading-tight">{preset.title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-ink-soft">{preset.hook}</span>
        <span className="mt-3 hidden font-bold text-link md:block">{home.fact.cta}</span>
      </span>
      <span className="block md:-mt-3">
        <Bars label={home.fact.mapLabel} rows={rows} field="m" />
        <Bars label={home.fact.realLabel} rows={rows} field="a" />
        <span className="mt-4 block font-bold text-link md:hidden">{home.fact.cta}</span>
      </span>
    </Link>
  );
}
