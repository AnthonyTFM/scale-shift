import { connection } from "next/server";
import Link from "next/link";
import pool from "@/data/daily-pool.json";
import { home } from "@/content/home";
import { presets, type Preset } from "@/content/presets";
import { mapUrl } from "@/lib/share";
import { PALETTE } from "@/lib/palette";
import { nameInSentence } from "@/lib/daily";

const DAY = 86_400_000;
type PoolRow = { n: string; src: string; era: string; kind: "country" | "state" | "history"; a: number; m: number };
type Fact = { preset: Pick<Preset, "title" | "hook" | "baseEra" | "shapes" | "at">; rows: PoolRow[] };

/** Two-shape "surprising" comparisons we have both areas for: real (a) and how big a normal map draws it (m). */
const curated: Fact[] = presets
  .filter((p) => p.category === "surprising" && p.shapes.length === 2)
  .map((p) => {
    const rows = p.shapes.map((s) => (pool as PoolRow[]).find((r) => r.n === s.name && r.era === s.era));
    return rows.every(Boolean) ? { preset: p, rows: rows as PoolRow[] } : null;
  })
  .filter((f): f is { preset: Preset; rows: PoolRow[] } => f !== null);

const times = (x: number) => (x >= 10 ? Math.round(x).toString() : x.toFixed(1).replace(/\.0$/, ""));

/**
 * More comparisons made from the puzzle shapes: pairs of well-known countries and US states where a normal map gets the
 * order wrong (A drawn clearly bigger, B really bigger). The most surprising ones first.
 */
const generated: Fact[] = (() => {
  const known = (pool as PoolRow[]).filter((r) => (r.kind === "country" && r.a >= 300_000) || (r.kind === "state" && r.a >= 150_000));
  const pairs: { a: PoolRow; b: PoolRow; surprise: number }[] = [];
  for (const a of known)
    for (const b of known) {
      const looks = a.m / b.m; // how much bigger A is drawn
      const really = b.a / a.a; // how much bigger B really is
      if (looks >= 1.3 && really >= 1.05 && really <= 6) pairs.push({ a, b, surprise: looks * really });
    }
  const seen = new Set<string>();
  return pairs
    .sort((x, y) => y.surprise - x.surprise || x.a.n.localeCompare(y.a.n))
    .filter(({ a, b }) => {
      // each shape at most three times, so the rotation stays varied
      const k = [a.n, b.n];
      const count = (n: string) => [...seen].filter((s) => s.split("|").includes(n)).length;
      if (k.some((n) => count(n) >= 3)) return false;
      seen.add(k.join("|"));
      return true;
    })
    .slice(0, 150)
    .map(({ a, b }) => ({
      preset: {
        title: `${a.n} vs ${b.n}`,
        hook: `On a normal map, ${nameInSentence(a)} looks ${times(a.m / b.m)}× bigger than ${nameInSentence(b)}. In reality, ${nameInSentence(b)} is ${
          b.a / a.a < 1.2 ? `${Math.round((b.a / a.a - 1) * 100)}% bigger` : `${times(b.a / a.a)}× the size of ${nameInSentence(a)}`
        }.`,
        baseEra: "present",
        shapes: [
          { era: a.era, name: a.src },
          { era: b.era, name: b.src },
        ],
      },
      rows: [a, b],
    }));
})();

// a hand-picked comparison every fourth day, the generated ones in between
const facts: Fact[] = [];
for (let i = 0, c = 0; i < generated.length || c < curated.length; i++) {
  if (i % 4 === 0 && c < curated.length) facts.push(curated[c++]);
  if (i < generated.length) facts.push(generated[i]);
}

/**
 * Days since 1970 (UTC), read when the page is requested. Not "use cache": a timed cache made Vercel regenerate the
 * homepage in the background, and those regenerated copies are recorded as "/index", which broke hydration on "/".
 */
async function currentDay() {
  await connection();
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
      className="grid items-center gap-x-8 gap-y-1 rounded-card bg-white p-5 text-ink shadow-sm ring-1 ring-line transition hover:-translate-y-0.5 hover:ring-primary md:grid-cols-[1fr_1.3fr] md:px-7"
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
