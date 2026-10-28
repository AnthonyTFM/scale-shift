"use client";

import { useId, useRef, useState } from "react";
import { isOffensive } from "@/lib/name-filter";
import { accountCopy } from "@/content/account";
import { MarkIcon } from "@/components/site/Icons";
import { Sheet } from "./JoinDialog";

const A = accountCopy.welcome;
const KEY = "bd-welcomed";

/** Has this browser already shown the welcome pop-up to this player? (It shows once: after that, it's the account page.) */
export function wasWelcomed(id: string) {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]).includes(id);
  } catch {
    // storage blocked: don't nag on every visit
    return true;
  }
}

function markWelcomed(id: string) {
  try {
    const seen = JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
    if (!seen.includes(id)) localStorage.setItem(KEY, JSON.stringify([...seen, id].slice(-20)));
  } catch {
    /* storage blocked */
  }
}

/**
 * Right after signing up: "You're in!", then a username and the reminder emails in one pop-up, both optional. It shows
 * once per player; both can be changed later on the account page (menu → Your account).
 */
export function WelcomeSheet({
  player,
  onSaveName,
  onSaveReminders,
  onClose,
}: {
  /** the player to welcome; null keeps it closed */
  player: string | null;
  /** resolve to an error message, or "" once saved */
  onSaveName: (name: string) => Promise<string>;
  onSaveReminders: (on: boolean) => Promise<string>;
  onClose: () => void;
}) {
  const titleId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [remind, setRemind] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    if (player) markWelcomed(player);
    setError("");
    onClose();
  };

  const done = async () => {
    const name = nameRef.current?.value.trim() ?? "";
    if (name && name.length < 3) return setError("Use 3 to 16 characters.");
    if (name && isOffensive(name)) return setError("Please pick a different username.");
    setBusy(true);
    setError("");
    const failed = (name ? await onSaveName(name) : "") || (remind ? await onSaveReminders(true) : "");
    setBusy(false);
    if (failed) return setError(failed);
    close();
  };

  return (
    <Sheet step={player ? 1 : null} titleId={titleId} onClose={close}>
      {player ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            done();
          }}
        >
          <div className="flex items-center gap-3 pr-10">
            <MarkIcon right className="size-9" />
            <h2 id={titleId} className="font-display text-3xl leading-tight">
              {A.title}
            </h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{A.lead}</p>
          <label htmlFor="welcome-name" className="mt-4 block font-display text-lg text-ink">
            {A.nameLabel}
          </label>
          <input
            id="welcome-name"
            data-start
            ref={nameRef}
            maxLength={16}
            autoComplete="nickname"
            enterKeyHint="done"
            placeholder="e.g. MapWizard"
            aria-describedby="welcome-name-hint"
            aria-invalid={error ? true : undefined}
            className="mt-1.5 h-12 w-full rounded-xl border-2 border-line bg-white px-3 text-lg text-ink focus:border-primary"
          />
          <p id="welcome-name-hint" className="mt-1 text-xs text-muted">
            {A.nameHint}
          </p>
          <label className="mt-4 flex min-h-11 items-start gap-2 text-sm text-ink">
            <input type="checkbox" checked={remind} onChange={(e) => setRemind(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-primary" />
            <span>
              {A.remind} <span className="block text-xs text-muted">{A.remindHint}</span>
            </span>
          </label>
          <div aria-live="polite">
            {error ? (
              <p role="alert" className="mt-3 text-sm font-semibold text-danger">
                {error}
              </p>
            ) : null}
          </div>
          <button type="submit" disabled={busy} className="btn btn-gold btn-lg mt-5 w-full">
            {busy ? A.saving : A.done}
          </button>
          <button type="button" onClick={close} className="mx-auto mt-1 flex min-h-11 items-center px-4 text-sm font-semibold text-muted hover:text-ink">
            {A.skip}
          </button>
          <p className="mt-1 text-center text-xs text-muted">{A.later}</p>
        </form>
      ) : null}
    </Sheet>
  );
}
