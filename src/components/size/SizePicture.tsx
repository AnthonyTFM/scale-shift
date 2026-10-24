// A country next to its partner, as a normal web map draws them and at real size (server-rendered SVG, no script).
import fs from "node:fs";
import path from "node:path";
import { mainPart, type ShapeFile } from "@/lib/outline";

const W = 320;
const H = 170;
// shapes stand a little above the ground line, so a small island at the bottom never looks cut off by it
const GROUND = H - 6;
const COLORS = ["#2F6BFF", "#FF5B4A"];
const TEXT = ["text-[#1A47B0]", "text-[#A82A1E]"];

const readShape = (id: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/daily/shapes", `${id}.json`), "utf8")) as ShapeFile;

function Panel({ files, names, view, label }: { files: ShapeFile[]; names: string[]; view: "merc" | "ea"; label: string }) {
  // one scale for both shapes in a panel, so they compare fairly; each panel fills its own frame
  const parts = files.map((f) => mainPart(f[view]));
  const k = Math.min(...parts.map(({ b: [x0, y0, x1, y1] }) => Math.min((W / 2 - 12) / (x1 - x0), (H - 12) / (y1 - y0))));
  return (
    <figure className="rounded-xl bg-white p-3 ring-1 ring-line">
      <figcaption className="text-xs font-bold uppercase tracking-wide text-muted">{label}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" aria-hidden="true">
        <line x1="4" x2={W - 4} y1={H - 1} y2={H - 1} className="stroke-line" />
        {parts.map(({ d, b: [x0, y0, x1, y1] }, i) => {
          const cx = (W / 2) * i + W / 4;
          const tiny = Math.max(x1 - x0, y1 - y0) * k < 8;
          return (
            <g key={i}>
              <path
                d={d}
                transform={`translate(${cx} ${GROUND}) scale(${k}) translate(${-(x0 + x1) / 2} ${-y1})`}
                fill={COLORS[i]}
                fillOpacity={0.88}
                stroke={COLORS[i]}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                fillRule="evenodd"
                strokeLinejoin="round"
              />
              {/* too small to see at this scale: ring it, like the daily game does */}
              {tiny ? <circle cx={cx} cy={GROUND - ((y1 - y0) * k) / 2} r={7} fill="none" stroke={COLORS[i]} strokeWidth={1.2} /> : null}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 grid grid-cols-2 text-center text-sm font-semibold">
        {names.map((n, i) => (
          <span key={n} className={TEXT[i]}>
            {n}
          </span>
        ))}
      </div>
    </figure>
  );
}

export function SizePicture({ ids, names, labels, alt }: { ids: [string, string]; names: [string, string]; labels: { map: string; real: string }; alt: string }) {
  const files = ids.map(readShape);
  return (
    <div role="img" aria-label={alt} className="grid gap-3 sm:grid-cols-2">
      <Panel files={files} names={names} view="merc" label={labels.map} />
      <Panel files={files} names={names} view="ea" label={labels.real} />
    </div>
  );
}
