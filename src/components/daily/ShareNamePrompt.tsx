"use client";

import { useEffect, useId, useRef, useState } from "react";
import { dailyCopy } from "@/content/daily";
import { needsShareName, rememberShareName } from "@/lib/challenge-friend";
import { isOffensive } from "@/lib/name-filter";
import { NAME_MAX, tidyName } from "@/lib/challenge-link";

const t = dailyCopy.challenge;

/**
 * Asked once, the first time a player without an account shares a score: a first name for the link, so the friend
 * who opens it knows whose score to beat. Kept in this browser; skipping is remembered too, so it's never asked twice.
 */
export function useShareName() {
  const [pending, setPending] = useState<(() => void) | null>(null);

  /** Runs `then` straight away, or after the name question when it's still to be asked. */
  const withName = (then: () => void) => {
    if (needsShareName()) setPending(() => then);
    else then();
  };

  const done = (name: string) => {
    rememberShareName(name);
    const then = pending;
    setPending(null);
    then?.();
  };

  const prompt = <NamePrompt open={pending !== null} onDone={done} onClose={() => setPending(null)} />;
  return { withName, prompt };
}

function NamePrompt({ open, onDone, onClose }: { open: boolean; onDone: (name: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [bad, setBad] = useState(false);
  const titleId = useId();
  const hintId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      input.current?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = tidyName(input.current?.value ?? "");
    // an empty box is a skip; a name that isn't plain letters, or isn't fit for a link, asks again
    if (name === "" ? (input.current?.value ?? "").trim() !== "" : isOffensive(name)) return setBad(true);
    onDone(name);
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby={titleId}
      className="m-auto w-[min(92vw,400px)] rounded-[28px] border-2 border-line bg-white p-0 text-ink shadow-float backdrop:bg-ink/50"
    >
      <form onSubmit={submit} className="p-5">
        <h2 id={titleId} className="font-display text-2xl leading-tight">
          {t.askTitle}
        </h2>
        <p className="mt-2 text-sm text-ink-soft">{t.askLead}</p>
        <label htmlFor="share-name" className="sr-only">
          {t.askLabel}
        </label>
        <input
          id="share-name"
          ref={input}
          maxLength={NAME_MAX}
          autoComplete="given-name"
          enterKeyHint="send"
          placeholder={t.askPlaceholder}
          aria-invalid={bad || undefined}
          aria-describedby={bad ? hintId : undefined}
          onChange={() => setBad(false)}
          className="mt-4 h-12 w-full rounded-xl border-2 border-line bg-white px-3 text-lg text-ink focus:border-primary"
        />
        {bad ? (
          <p id={hintId} role="alert" className="mt-1 text-xs font-semibold text-red">
            {t.askBad}
          </p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <button type="submit" className="btn btn-primary h-12 flex-1">
            {t.askShare}
          </button>
          <button type="button" onClick={() => onDone("")} className="btn btn-white h-12 px-5">
            {t.askSkip}
          </button>
        </div>
      </form>
    </dialog>
  );
}
