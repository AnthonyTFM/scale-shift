"use client";

import { useEffect, useRef, useState } from "react";
import { shareCopy as t } from "@/content/share";
import { track } from "@/lib/analytics";
import { nativeShare, type ShareMessage } from "@/lib/challenge-friend";

/**
 * Share a daily score or challenge. Phones get their own share sheet; computers get this box,
 * which copies the message straight away and offers a few apps to send it with.
 */
export function useShareBox() {
  const [msg, setMsg] = useState<ShareMessage | null>(null);
  const [copied, setCopied] = useState(false);

  const share = async (m: ShareMessage, from: string) => {
    track(m.kind === "challenge" ? "daily_challenge_friend" : "daily_share", { from });
    if (await nativeShare(m.text)) return;
    let ok = true;
    try {
      await navigator.clipboard.writeText(m.text);
    } catch {
      ok = false;
    }
    setCopied(ok);
    setMsg(m);
  };

  const box = <ShareBox msg={msg} copied={copied} onCopied={() => setCopied(true)} onClose={() => setMsg(null)} />;
  return { share, box };
}

function ShareBox({ msg, copied, onCopied, onClose }: { msg: ShareMessage | null; copied: boolean; onCopied: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [smsOk, setSmsOk] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (msg && !d.open) {
      d.showModal();
      setCanNativeShare(typeof navigator.share === "function");
      // only Apple and Android devices have something that opens sms: links
      setSmsOk(/Mac|iPhone|iPad|Android/.test(navigator.userAgent));
    }
    if (!msg && d.open) d.close();
  }, [msg]);

  const dialogClass = "m-auto w-[min(92vw,440px)] rounded-2xl bg-white p-0 text-ink shadow-float backdrop:bg-slate-900/50";
  if (!msg) return <dialog ref={ref} className={dialogClass} />;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg.text);
    } catch {
      (document.getElementById("share-box-text") as HTMLTextAreaElement | null)?.select();
      document.execCommand?.("copy");
    }
    onCopied();
    track("share", { method: "copy", kind: msg.kind });
  };

  const enc = encodeURIComponent;
  const links = [
    ...(smsOk ? [{ label: t.sms, href: `sms:?&body=${enc(msg.text)}` }] : []),
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(msg.text)}` },
    { label: "X / Twitter", href: `https://twitter.com/intent/tweet?text=${enc(msg.text)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(msg.url)}` },
    { label: "Email", href: `mailto:?subject=${enc(t.emailSubject)}&body=${enc(msg.text)}` },
  ];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="share-box-title"
      className={dialogClass}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 id="share-box-title" className="font-display text-2xl">
            {msg.kind === "challenge" ? t.challengeTitle : t.scoreTitle}
          </h2>
          <button type="button" onClick={onClose} aria-label={t.close} className="grid size-9 place-items-center rounded-lg hover:bg-slate-100">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <p role="status" className={`mt-3 rounded-lg px-3 py-2 text-sm font-bold ${copied ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
          {copied ? `✓ ${t.copied}` : t.notCopied}
        </p>
        <label htmlFor="share-box-text" className="sr-only">
          Message
        </label>
        <textarea
          id="share-box-text"
          readOnly
          rows={3}
          value={msg.text}
          onFocus={(e) => e.target.select()}
          className="mt-3 w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-sm"
        />
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={copy} className="h-11 flex-1 rounded-lg bg-panel text-sm font-bold text-white hover:bg-slate-800">
            {copied ? t.copiedButton : t.copy}
          </button>
          {canNativeShare ? (
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.share({ text: msg.text });
                  track("share", { method: "native", kind: msg.kind });
                } catch {
                  /* closed */
                }
              }}
              className="h-11 flex-1 rounded-lg bg-accent text-sm font-bold text-panel hover:bg-accent-strong"
            >
              {t.more}
            </button>
          ) : null}
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {links.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                target={l.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                onClick={() => track("share", { method: l.label, kind: msg.kind })}
                className="flex h-10 items-center justify-center rounded-lg border border-line text-sm font-semibold hover:bg-slate-50"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}
