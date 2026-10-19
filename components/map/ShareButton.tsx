"use client";

import { useState } from "react";
import { site } from "@/content/site";
import { track } from "@/lib/analytics";

interface Props {
  getQuery: () => string;
  title: string;
  variant?: "solid" | "ghost";
}

export function ShareButton({ getQuery, title, variant = "solid" }: Props) {
  const [status, setStatus] = useState<"idle" | "copied" | "manual">("idle");
  const [url, setUrl] = useState("");

  const share = async () => {
    const link = `${window.location.origin}/?${getQuery()}`;
    setUrl(link);
    track("share_clicked");
    const nav = window.navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    if (coarse && nav.share) {
      try {
        await nav.share({ title, url: link });
        return;
      } catch {
        // user closed the sheet; fall through to copying
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2200);
    } catch {
      setStatus("manual");
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={share}
        className={variant === "solid" ? "btn btn-accent" : "btn btn-ghost"}
        aria-describedby={status !== "idle" ? "share-status" : undefined}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 10V2M4.5 5L8 1.5 11.5 5M3 9v4.5h10V9" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="max-sm:sr-only">{site.map.shareLabel}</span>
      </button>
      <div id="share-status" role="status" aria-live="polite" className="absolute right-0 top-[calc(100%+8px)] z-50">
        {status === "copied" && (
          <p className="toast-in whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-sm text-paper shadow-lg">{site.map.shareCopied}</p>
        )}
        {status === "manual" && (
          <div className="toast-in w-[min(320px,80vw)] rounded-lg bg-paper p-3 text-sm text-ink shadow-lg ring-1 ring-paper-3">
            <label className="grid gap-1">
              <span>{site.map.shareFallback}</span>
              <input className="field text-sm" readOnly value={url} onFocus={(e) => e.currentTarget.select()} autoFocus />
            </label>
            <button type="button" className="mt-2 text-ink-soft underline" onClick={() => setStatus("idle")}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
