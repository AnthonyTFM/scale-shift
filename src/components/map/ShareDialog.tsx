"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { track } from "@/lib/analytics";

type Props = { open: boolean; url: string; title: string; onClose: () => void; onDownload: () => Promise<void> };

export function ShareDialog({ open, url, title, onClose, onDownload }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    }
    if (!open && d.open) d.close();
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.getElementById("share-url") as HTMLInputElement | null;
      input?.select();
      document.execCommand?.("copy");
    }
    setCopied(true);
    track("share", { method: "copy" });
    setTimeout(() => setCopied(false), 2000);
  };

  const text = `${title}: see the real size on ${site.name}`;
  const enc = encodeURIComponent;
  const links = [
    { label: "X / Twitter", href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { label: "Reddit", href: `https://www.reddit.com/submit?url=${enc(url)}&title=${enc(text)}` },
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(`${text} ${url}`)}` },
    { label: "Email", href: `mailto:?subject=${enc(text)}&body=${enc(url)}` },
  ];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="share-title"
      className="m-auto w-[min(92vw,440px)] rounded-2xl bg-white p-0 text-ink shadow-float backdrop:bg-slate-900/50"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="share-title" className="font-display text-2xl">
              Share this map
            </h2>
            <p className="mt-1 text-sm text-muted">The link opens exactly what you see: era, shapes, positions and rotation.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-lg hover:bg-slate-100">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <label htmlFor="share-url" className="sr-only">
            Link to this map
          </label>
          <input
            id="share-url"
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            className="h-11 min-w-0 flex-1 rounded-lg border border-line px-3 text-sm"
          />
          <button type="button" onClick={copy} className="h-11 rounded-lg bg-panel px-4 text-sm font-bold text-white hover:bg-slate-800">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p role="status" className="sr-only">
          {copied ? "Link copied to clipboard" : ""}
        </p>
        {canNativeShare ? (
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.share({ title: text, url });
                track("share", { method: "native" });
              } catch {
                /* user cancelled */
              }
            }}
            className="mt-3 h-11 w-full rounded-lg bg-accent text-sm font-bold text-panel hover:bg-accent-strong"
          >
            Share…
          </button>
        ) : null}
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {links.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("share", { method: l.label })}
                className="flex h-10 items-center justify-center rounded-lg border border-line text-sm font-semibold hover:bg-slate-50"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await onDownload();
                setBusy(false);
                track("share", { method: "png" });
              }}
              className="flex h-10 w-full items-center justify-center rounded-lg border border-line text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Download PNG"}
            </button>
          </li>
        </ul>
      </div>
    </dialog>
  );
}
