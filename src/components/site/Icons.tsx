// Small drawn icons used in place of emoji, so they look the same on every phone and match the brand colors.

type IconProps = { className?: string };

/** Gold trophy: leaderboard headings and the join card. */
export function TrophyIcon({ className = "size-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`shrink-0 ${className}`}>
      <path d="M7 3h10v5a5 5 0 0 1-10 0V3Z" fill="#FFC233" stroke="#C48E00" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 5H4v1.5A3.5 3.5 0 0 0 7.5 10M17 5h3v1.5a3.5 3.5 0 0 1-3.5 3.5" fill="none" stroke="#C48E00" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 13v4M8.5 21h7l-.8-3.5h-5.4L8.5 21Z" fill="#FFC233" stroke="#C48E00" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/** Flame: the streak count. */
export function FlameIcon({ className = "size-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`shrink-0 ${className}`}>
      <path d="M12 2.5c.6 3.2 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.6 1.4-4.3 2.6-5.4.2 1.7.9 2.8 2 3.4-.4-3.6.1-6.4.9-9Z" fill="#FF8A3D" stroke="#D93A2B" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M12 21c-1.8 0-3-1.3-3-3 0-1.5 1-2.6 2-3.4.2 1.2.8 1.9 1.6 2.2.2-1.3.4-2.1.8-2.8 1 1 1.6 2.3 1.6 3.9 0 1.8-1.2 3.1-3 3.1Z" fill="#FFC233" />
    </svg>
  );
}

/** Round green tick or red cross for a right or wrong answer. */
export function MarkIcon({ right, className = "size-5" }: IconProps & { right: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={`shrink-0 ${className}`}>
      <circle cx="10" cy="10" r="10" fill={right ? "#15803D" : "#D93A2B"} />
      <path
        d={right ? "M5.5 10.5l3 3 6-6.5" : "M6.5 6.5l7 7M13.5 6.5l-7 7"}
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Folded map: the map page. */
export function MapIcon({ className = "size-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`shrink-0 ${className}`}>
      <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z" fill="#9FCBE0" stroke="#1A47B0" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 4v13.5M15 6.5V20" fill="none" stroke="#1A47B0" strokeWidth="1.5" />
      {/* a red location pin in the middle panel */}
      <path d="M12 15.5s-2.6-2.7-2.6-4.6a2.6 2.6 0 0 1 5.2 0c0 1.9-2.6 4.6-2.6 4.6Z" fill="#FF5B4A" stroke="#D93A2B" strokeWidth="1.1" strokeLinejoin="round" />
      <circle cx="12" cy="10.9" r="0.95" fill="#fff" />
    </svg>
  );
}

/** Target: the daily challenge. */
export function TargetIcon({ className = "size-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`shrink-0 ${className}`}>
      <circle cx="12" cy="12" r="9.25" fill="#FF5B4A" stroke="#D93A2B" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="5.75" fill="#fff" />
      <circle cx="12" cy="12" r="2.75" fill="#FF5B4A" />
    </svg>
  );
}

/** Speaker with sound waves (on) or a cross (off). */
export function SpeakerIcon({ on, className = "size-5" }: IconProps & { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`shrink-0 ${className}`}>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="#2563EB" stroke="#1A47B0" strokeWidth="1.5" strokeLinejoin="round" />
      {on ? (
        <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="#1A47B0" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" fill="none" stroke="#D93A2B" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  );
}

const MEDAL = {
  1: { fill: "#FFC233", edge: "#C48E00" },
  2: { fill: "#D9DEE8", edge: "#8A93A6" },
  3: { fill: "#E8A46C", edge: "#A8612A" },
} as const;

/** Gold, silver and bronze medals for the top three on a leaderboard. */
export function MedalIcon({ place, className = "size-6" }: IconProps & { place: 1 | 2 | 3 }) {
  const m = MEDAL[place];
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`shrink-0 ${className}`}>
      <path d="M7 2h4l2 6H9L7 2Zm6 0h4l-2 6h-2.5Z" fill="#2563EB" stroke="#1A47B0" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="12" cy="15" r="7" fill={m.fill} stroke={m.edge} strokeWidth="1.5" />
      <text x="12" y="18.8" textAnchor="middle" fontSize="10" fontWeight="800" fill="#1D2140" className="font-display">
        {place}
      </text>
    </svg>
  );
}

/** A drawn tick or cross in the current text color, for answer tiles (text symbols vary from phone to phone). */
export function TickIcon({ right, className = "size-5" }: IconProps & { right: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={`shrink-0 ${className}`}>
      <path
        d={right ? "M4.5 10.5l3.5 3.5 7.5-8" : "M5.5 5.5l9 9M14.5 5.5l-9 9"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
