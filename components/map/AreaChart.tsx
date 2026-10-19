import type { Entity } from "@/lib/types";
import { formatKm2, peakOf, yearLabel } from "@/lib/format";

interface Props {
  entity: Entity;
  years: number[];
  current?: number;
  color?: string;
  width?: number;
  height?: number;
  /** larger type for the timeline pages */
  large?: boolean;
}

/** Area of one entity across every snapshot it appears in. Pure SVG so it renders on the server too. */
export function AreaChart({ entity, years, current, color = "var(--ink)", width = 300, height = 120, large = false }: Props) {
  const ys = entity.y.map((i) => years[i]);
  const peak = peakOf(entity, years);
  const pad = { l: 8, r: 8, t: large ? 22 : 18, b: large ? 26 : 22 };
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const x0 = ys[0];
  const x1 = ys[ys.length - 1];
  const span = Math.max(1, x1 - x0);
  const max = peak.area * 1.08 || 1;
  const px = (y: number) => (ys.length === 1 ? pad.l + iw / 2 : pad.l + ((y - x0) / span) * iw);
  const py = (a: number) => pad.t + ih - (a / max) * ih;
  const pts = ys.map((y, j) => [px(y), py(entity.a[j])] as const);
  const line = pts.map(([x, y], j) => `${j ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const fs = large ? 13 : 11;
  const summary = `${entity.n}: area on ${ys.length} map${ys.length === 1 ? "" : "s"} from ${yearLabel(x0)} to ${yearLabel(x1)}. Largest ${formatKm2(peak.area)} in ${yearLabel(peak.year)}.`;
  const peakX = px(peak.year);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={summary} className="block overflow-visible">
      <title>{summary}</title>
      <line x1={pad.l} x2={width - pad.r} y1={pad.t + ih} y2={pad.t + ih} stroke="var(--paper-3)" strokeWidth={1} />
      {ys.length > 1 && <path d={`${line}L${pts[pts.length - 1][0]},${pad.t + ih}L${pts[0][0]},${pad.t + ih}Z`} fill={color} opacity={0.12} />}
      {ys.length > 1 && <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />}
      {pts.map(([x, y], j) => {
        const isCurrent = ys[j] === current;
        return (
          <circle
            key={ys[j]}
            cx={x}
            cy={y}
            r={isCurrent ? 5 : 3}
            fill={isCurrent ? "var(--accent)" : color}
            stroke={isCurrent ? "var(--ink)" : "none"}
            strokeWidth={1.5}
          >
            <title>{`${yearLabel(ys[j])}: ${formatKm2(entity.a[j])}`}</title>
          </circle>
        );
      })}
      <text
        x={Math.min(Math.max(peakX, pad.l + 40), width - pad.r - 40)}
        y={pad.t - 6}
        textAnchor="middle"
        fontSize={fs}
        fill="var(--ink)"
        fontWeight={700}
      >
        {`Peak ${formatKm2(peak.area)}`}
      </text>
      <text x={pad.l} y={height - 6} fontSize={fs} fill="var(--ink-soft)">
        {yearLabel(x0)}
      </text>
      {ys.length > 1 && (
        <text x={width - pad.r} y={height - 6} fontSize={fs} fill="var(--ink-soft)" textAnchor="end">
          {yearLabel(x1)}
        </text>
      )}
    </svg>
  );
}
