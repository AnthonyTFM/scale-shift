"use client";

import { useEffect, useId, useRef, useState } from "react";
import { isOffensive } from "@/lib/name-filter";
import { accountCopy } from "@/content/account";
import { MarkIcon } from "@/components/site/Icons";
import { Sheet } from "./JoinDialog";

const A = accountCopy.welcome;
/**
 * Right after signing up: "You're in!", then a username and the reminder emails in one pop-up, both optional. It shows
 * once per player (the caller marks it seen on the server as it opens); both can be changed later on the account page
 * (menu → Your account).
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
  // whether it's still open: a save that finishes after "Skip" mustn't act on a closed pop-up
  const live = useRef(false);
  useEffect(() => {
    live.current = !!player;
  }, [player]);

  const close = () => {
    if (!live.current) return;
    live.current = false;
    setError("");
    onClose();
  };

  const done = async () => {
    const name = nameRef.current?.value.trim() ?? "";
    if (name && name.length < 3) return setError(accountCopy.errors.nameLength);
    if (name && isOffensive(name)) return setError(accountCopy.errors.nameOffensive);
    setBusy(true);
    setError("");
    const failed = (name ? await onSaveName(name) : "") || (remind ? await onSaveReminders(true) : "");
    setBusy(false);
    if (!live.current) return;
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
            placeholder={accountCopy.page.namePlaceholder}
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
          <button type="button" onClick={close} disabled={busy} className="mx-auto mt-1 flex min-h-11 items-center px-4 text-sm font-semibold text-muted hover:text-ink">
            {A.skip}
          </button>
          <p className="mt-1 text-center text-xs text-muted">{A.later}</p>
        </form>
      ) : null}
    </Sheet>
  );
}
