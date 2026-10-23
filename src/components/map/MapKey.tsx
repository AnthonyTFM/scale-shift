"use client";

import { claimsForEra, treatyInForce, unclaimed, claims as allClaims } from "@/lib/antarctica";
import { eraByKey } from "@/lib/eras";
import { PALETTE, POLITICAL } from "./engine";

function Swatch({ children }: { children: React.ReactNode }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 36 20" className="h-5 w-9 shrink-0 overflow-visible rounded">
      {children}
    </svg>
  );
}

const hatch = (id: string, color: string) => (
  <defs>
    <pattern id={id} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
      <line x1="0" y1="0" x2="0" y2="5" stroke={color} strokeWidth="1.6" />
    </pattern>
  </defs>
);

export function MapKey({ era, onClose }: { era: string; onClose: () => void }) {
  const claims = claimsForEra(era);
  const label = eraByKey(era)?.label;
  const rows: [React.ReactNode, string, string?][] = [
    [
      <Swatch key="c">
        {POLITICAL.slice(0, 4).map((c, i) => (
          <rect key={c} x={i * 9} y="0" width="9" height="20" fill={c} />
        ))}
      </Swatch>,
      "Countries and empires",
      "Colors only tell neighbors apart. They don't mean anything else.",
    ],
    [
      <Swatch key="s">
        <rect width="36" height="20" fill={POLITICAL[0]} />
        <line x1="18" y1="0" x2="18" y2="20" stroke="rgba(88,60,46,0.8)" strokeWidth="1.5" />
      </Swatch>,
      "Precise border",
      "Fixed by treaty or well documented.",
    ],
    [
      <Swatch key="d">
        <rect width="36" height="20" fill={POLITICAL[2]} />
        <line x1="18" y1="0" x2="18" y2="20" stroke="rgba(88,60,46,0.8)" strokeWidth="1.5" strokeDasharray="3 3" />
      </Swatch>,
      "Approximate border",
      "A scholarly estimate. Most borders before about 1650 are like this.",
    ],
    [
      <Swatch key="u">
        <rect width="36" height="20" fill="#EFE3C8" stroke="rgba(88,60,46,0.3)" strokeDasharray="2 3" />
      </Swatch>,
      "No state shown",
      "Peoples without fixed borders, or land the source doesn't map.",
    ],
    [
      <Swatch key="o">
        {hatch("key-ov", PALETTE[0])}
        <rect x="2" y="2" width="32" height="16" rx="3" fill="rgba(232,54,107,0.3)" />
        <rect x="2" y="2" width="32" height="16" rx="3" fill="url(#key-ov)" opacity="0.6" stroke={PALETTE[0]} strokeWidth="2" />
      </Swatch>,
      "Your shapes",
      "Drawn at their real size wherever you drag them.",
    ],
    [
      <Swatch key="e">
        <rect width="36" height="20" fill="#9FCBE0" />
        <line x1="0" y1="10" x2="36" y2="10" stroke="rgba(122,62,30,0.6)" strokeWidth="1.5" strokeDasharray="5 4" />
      </Swatch>,
      "Equator",
      "Land is stretched more the farther it is from this line.",
    ],
  ];
  if (era === "present") {
    rows.splice(4, 0, [
      <Swatch key="h">
        {hatch("key-dis", "#B4235A")}
        <rect width="36" height="20" fill={POLITICAL[1]} />
        <rect width="36" height="20" fill="url(#key-dis)" opacity="0.7" />
      </Swatch>,
      "Disputed territory",
      "Click it to see who controls it and who claims it.",
    ]);
  }

  return (
    <section aria-labelledby="map-key-title" className="rounded-2xl bg-panel p-4 text-panel-text shadow-float">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-panel-muted">{label}</p>
          <h2 id="map-key-title" className="font-display text-xl">
            Map key
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close map key"
          className="grid size-9 place-items-center rounded-lg text-panel-muted hover:bg-white/10 hover:text-white"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <ul className="mt-3 space-y-3">
        {rows.map(([sw, title, body]) => (
          <li key={title} className="flex gap-3">
            {sw}
            <div className="min-w-0">
              <p className="text-sm font-semibold">{title}</p>
              {body ? <p className="text-xs leading-relaxed text-panel-muted">{body}</p> : null}
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 rounded-lg bg-white/5 p-2.5 text-xs leading-relaxed text-panel-muted">
        <span className="font-semibold text-panel-text">Tip:</span> rest your mouse near any edge of the map and it scrolls that way. Drag a
        shape to the edge and it travels with the map.
      </p>

      <h3 className="mt-5 text-sm font-bold">Antarctic claims</h3>
      {claims.length ? (
        <>
          <ul className="mt-2 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
            {claims.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <span aria-hidden="true" className="size-3 shrink-0 rounded-sm ring-1 ring-white/30" style={{ background: c.color }} />
                <span>
                  {c.claimant} <span className="text-panel-muted">({c.year})</span>
                </span>
              </li>
            ))}
            {claims.length === allClaims.length ? (
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="size-3 shrink-0 rounded-sm bg-[#7a6a5e] ring-1 ring-white/30" />
                <span>Unclaimed ({unclaimed.name})</span>
              </li>
            ) : null}
          </ul>
          <p className="mt-2 text-xs leading-relaxed text-panel-muted">
            Striped wedges show each claim; where stripes cross, claims overlap. Click Antarctica for details.
            {treatyInForce(era) ? " All claims have been frozen since the Antarctic Treaty of 1959." : ""}
          </p>
        </>
      ) : (
        <p className="mt-1 text-xs text-panel-muted">No country had claimed any of Antarctica yet. The first claim came from Britain in 1908.</p>
      )}
    </section>
  );
}
