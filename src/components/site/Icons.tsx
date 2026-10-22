// Small drawn icons used in place of emoji, so they look the same on every phone and match the brand colours.

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
