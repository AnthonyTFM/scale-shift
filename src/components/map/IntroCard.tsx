"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { appCopy } from "@/content/site";
import { presetCategories, presets, type Preset } from "@/content/presets";

/** `byKeyboard`: closed with the Escape key, or a button pressed from the keyboard (or a screen reader) rather than tapped */
type Props = { onClose: (byKeyboard: boolean) => void; onPreset: (p: Preset, byKeyboard: boolean) => void };

const picks = {
  surprising: presets.filter((p) => p.category === "surprising").slice(0, 4),
  controversial: presets.filter((p) => p.category === "controversial").slice(0, 3),
};

export function IntroCard({ onClose, onPreset }: Props) {
  // a modal dialog over the map: keyboard and screen-reader users start in it, Tab stays in it, Escape closes it, and
  // the map behind can't be reached while it's open. Until the page's script runs it shows as a plain card (not-open:),
  // so first-time visitors see it in the first paint
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  // only a real Escape key press counts as the keyboard: Android's back gesture closes the dialog too
  const escPressed = useRef(false);
  // opens whenever the page is shown and closes quietly when it's hidden or left: with Cache Components, Next keeps /map
  // alive (hidden) after you navigate away, and a dialog left open would stay "open" on every other page
  useLayoutEffect(() => {
    const d = ref.current;
    // returning visitors: the root layout's script hides the intro before paint, so never make the page modal behind it
    if (!d || !d.getClientRects().length) return;
    // a close event queued by an earlier hide can arrive after the dialog is open again: ignore it
    const closed = () => {
      if (!d.open) onCloseRef.current(escPressed.current);
    };
    d.addEventListener("close", closed);
    if (!d.open) d.showModal();
    // focus the card itself rather than its first button
    d.focus({ preventScroll: true });
    return () => {
      d.removeEventListener("close", closed);
      if (d.open) d.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      tabIndex={-1}
      aria-labelledby="intro-title"
      // only Escape or the phone's back gesture close the dialog itself; the buttons close it by unmounting it
      onKeyDown={(e) => {
        if (e.key === "Escape") escPressed.current = true;
      }}
      // no focus ring on the card itself (the global :focus-visible rule would draw one on open, even for touch users);
      // the buttons inside keep theirs
      style={{ outline: "none" }}
      className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl bg-card p-5 text-ink shadow-float not-open:relative not-open:block backdrop:bg-transparent"
    >
      <h2 id="intro-title" className="font-display text-2xl leading-tight">
        {appCopy.introTitle}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{appCopy.introBody}</p>
      {(Object.keys(picks) as (keyof typeof picks)[]).map((cat) => (
        <div key={cat} className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{presetCategories[cat].title}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {picks[cat].map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={(e) => onPreset(p, e.detail === 0)}
                  title={p.hook}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                    cat === "controversial"
                      ? "border-rose-200 bg-rose-50 hover:border-rose-400"
                      : "border-amber-200 bg-amber-50 hover:border-amber-400"
                  }`}
                >
                  {p.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <button type="button" onClick={(e) => onClose(e.detail === 0)} className="mt-5 h-11 w-full rounded-lg bg-panel text-sm font-bold text-white hover:bg-panel-2">
        {appCopy.introCta}
      </button>
    </dialog>
  );
}
