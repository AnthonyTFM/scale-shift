"use client";

import { useRef } from "react";

type Props = { rotation: number | null; onRotate: (deg: number) => void };

/** Compass rose: drag around it (or use arrow keys) to rotate the selected shape. Double-click resets. */
export function Compass({ rotation, onRotate }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const disabled = rotation === null;
  const angleFrom = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    return Math.round((Math.atan2(dx, -dy) * 180) / Math.PI);
  };
  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={disabled ? "Rotate (select a shape first)" : "Rotate selected shape"}
      aria-valuemin={-180}
      aria-valuemax={180}
      aria-valuenow={rotation ?? 0}
      aria-valuetext={`${rotation ?? 0} degrees`}
      aria-disabled={disabled}
      title={disabled ? "Select a shape, then drag the compass to rotate it" : "Drag to rotate · double-click to reset"}
      onPointerDown={(e) => {
        if (disabled) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        onRotate(angleFrom(e));
      }}
      onPointerMove={(e) => {
        if (disabled || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
        onRotate(angleFrom(e));
      }}
      onDoubleClick={() => !disabled && onRotate(0)}
      onKeyDown={(e) => {
        if (disabled) return;
        const step = e.shiftKey ? 15 : 5;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          e.preventDefault();
          onRotate(((rotation ?? 0) + step + 540) % 360 - 180);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          e.preventDefault();
          onRotate(((rotation ?? 0) - step + 540) % 360 - 180);
        } else if (e.key === "Home") onRotate(0);
      }}
      className={`relative size-20 touch-none select-none rounded-full ${disabled ? "opacity-50" : "cursor-grab"}`}
    >
      <svg viewBox="0 0 100 100" className="size-full drop-shadow" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="rgba(20,28,43,0.85)" stroke="rgba(255,255,255,0.25)" />
        <g transform={`rotate(${rotation ?? 0} 50 50)`}>
          <path d="M50 10 L57 50 L50 46 L43 50 Z" fill="#F5B83D" />
          <path d="M50 90 L57 50 L50 54 L43 50 Z" fill="#9AA8BD" />
          <path d="M10 50 L50 44 L46 50 L50 56 Z" fill="#9AA8BD" opacity="0.6" />
          <path d="M90 50 L50 44 L54 50 L50 56 Z" fill="#9AA8BD" opacity="0.6" />
          <text x="50" y="9" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" dy="-1">
            N
          </text>
        </g>
        <circle cx="50" cy="50" r="4" fill="#fff" />
      </svg>
    </div>
  );
}
