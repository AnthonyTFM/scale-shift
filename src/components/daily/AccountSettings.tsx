"use client";

import { useEffect, useState } from "react";
import { isOffensive } from "@/lib/name-filter";
import { signInOn } from "@/lib/sign-in";
import { accountCopy } from "@/content/account";
import { account as L } from "@/content/legal";
import { PersonIcon } from "@/components/site/Icons";
import { useAccount } from "./SignInProvider";
import { useAccountInfo } from "./useAccountInfo";
import { clearJoinFlow, SignInSheet } from "./JoinDialog";
import { DeleteData } from "./AccountBar";

const A = accountCopy.page;
const card = "rounded-[24px] border-2 border-line bg-white p-5 shadow-[0_6px_0_0_var(--color-line)] sm:p-6";

/** The account page: sign in, or change your username and reminder emails, sign out and delete your data. */
export function AccountSettings() {
  const { isLoaded, isSignedIn, openSignIn, opening, openFailed } = useAccount();
  const { info, failed, refresh, saveName, saveReminders } = useAccountInfo();
  const [open, setOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);
  // between "Continue" and the sign-in window, and whether that window failed to open
  const [awaiting, setAwaiting] = useState(false);
  const [signInFailed, setSignInFailed] = useState(false);

  // the sign-in window never opened (blocked or offline): bring the pop-up back with a retry
  useEffect(() => {
    if (!awaiting || !openFailed) return;
    clearJoinFlow();
    queueMicrotask(() => {
      setAwaiting(false);
      setSignInFailed(true);
      setOpen(true);
    });
  }, [awaiting, openFailed]);

  if (!signInOn) return <p className="text-ink-soft">{A.signedOutLead}</p>;
  if (isSignedIn && failed)
    return (
      <p role="alert" className={`${card} font-semibold text-danger`}>
        {accountCopy.errors.load}{" "}
        <button type="button" onClick={refresh} className="inline-flex min-h-11 items-center text-primary hover:underline">
          {accountCopy.errors.retry}
        </button>
      </p>
    );
  if (!isLoaded || (isSignedIn && info === undefined))
    return (
      <p role="status" className={`${card} text-muted`}>
        {A.loading}
      </p>
    );

  if (!isSignedIn)
    return (
      <div className={card}>
        {deleted ? (
          <p role="status" className="mb-4 font-semibold text-ink">
            {L.deleted}
          </p>
        ) : null}
        <div className="flex items-center gap-3">
          <PersonIcon className="size-10" />
          <h2 className="font-display text-2xl leading-tight text-ink">{A.signedOutTitle}</h2>
        </div>
        <p className="mt-2 text-ink-soft">{A.signedOutLead}</p>
        <button
          type="button"
          aria-haspopup="dialog"
          disabled={awaiting && opening}
          onClick={() => {
            setSignInFailed(false);
            setAwaiting(false);
            setOpen(true);
          }}
          className="btn btn-gold btn-lg mt-5 w-full sm:w-auto sm:px-8"
        >
          {awaiting && opening ? A.opening : A.signIn}
        </button>
        <SignInSheet
          open={open}
          title={A.signedOutTitle}
          lead={A.signedOutLead}
          failed={signInFailed}
          onClose={() => setOpen(false)}
          onContinue={() => {
            setSignInFailed(false);
            // close first: the sign-in window can't take focus over a modal pop-up
            setOpen(false);
            requestAnimationFrame(() => {
              openSignIn("/account");
              setAwaiting(true);
            });
          }}
        />
      </div>
    );

  return (
    <div className="space-y-5">
      <NameCard name={info?.name ?? null} onSave={saveName} />
      <RemindCard on={info?.reminders ?? false} onSave={saveReminders} />
      <SignedInCard onDeleted={() => setDeleted(true)} />
    </div>
  );
}

function NameCard({ name, onSave }: { name: string | null; onSave: (name: string) => Promise<string> }) {
  const [value, setValue] = useState(name ?? "");
  const [saved, setSaved] = useState(name);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form
      className={card}
      onSubmit={async (e) => {
        e.preventDefault();
        const v = value.trim().replace(/\s+/g, " ");
        if (v === saved) return setNote({ ok: true, text: A.nameSame });
        if (v.length < 3) return setNote({ ok: false, text: accountCopy.errors.nameLength });
        if (isOffensive(v)) return setNote({ ok: false, text: accountCopy.errors.nameOffensive });
        setBusy(true);
        const error = await onSave(v);
        setBusy(false);
        if (!error) {
          setSaved(v);
          setValue(v);
        }
        setNote(error ? { ok: false, text: error } : { ok: true, text: A.nameSaved });
      }}
    >
      <label htmlFor="account-name" className="font-display text-xl text-ink">
        {A.nameTitle}
      </label>
      <p className="text-sm text-muted">{saved ? A.nameLead : A.nameLeadNone}</p>
      <div className="mt-3 flex gap-2">
        <input
          id="account-name"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setNote(null);
          }}
          maxLength={16}
          autoComplete="nickname"
          placeholder={A.namePlaceholder}
          aria-describedby="account-name-note"
          aria-invalid={note && !note.ok ? true : undefined}
          className="h-12 min-w-0 flex-1 rounded-xl border-2 border-line bg-white px-3 text-lg text-ink focus:border-primary"
        />
        <button type="submit" disabled={busy} className="btn btn-primary h-12 shrink-0 px-5">
          {busy ? accountCopy.welcome.saving : A.nameSave}
        </button>
      </div>
      <p id="account-name-note" role="status" className={`mt-2 min-h-5 text-sm ${note?.ok ? "font-semibold text-ink" : "font-semibold text-danger"}`}>
        {note?.text ?? ""}
      </p>
    </form>
  );
}

function RemindCard({ on, onSave }: { on: boolean; onSave: (on: boolean) => Promise<string> }) {
  const [checked, setChecked] = useState(on);
  const [note, setNote] = useState("");
  return (
    <div className={card}>
      <h2 className="font-display text-xl text-ink">{A.emailsTitle}</h2>
      <label className="mt-2 flex min-h-11 items-start gap-2 text-ink">
        <input
          type="checkbox"
          checked={checked}
          onChange={async (e) => {
            const v = e.target.checked;
            setChecked(v);
            setNote("");
            const error = await onSave(v);
            if (error) setChecked(!v);
            setNote(error || (v ? A.remindOn : A.remindOff));
          }}
          className="mt-0.5 size-5 shrink-0 accent-primary"
        />
        <span>{A.remind}</span>
      </label>
      <p role="status" className="min-h-5 text-sm text-muted">
        {note}
      </p>
    </div>
  );
}

function SignedInCard({ onDeleted }: { onDeleted: () => void }) {
  const { signOut } = useAccount();
  return (
    <div className={card}>
      <h2 className="font-display text-xl text-ink">{A.dangerTitle}</h2>
      <p className="mt-1 flex flex-wrap items-center gap-x-4 text-sm text-ink-soft">
        <span>{A.signedInAs}</span>
        <button type="button" onClick={() => signOut("/account")} className="inline-flex min-h-11 items-center font-semibold text-link hover:underline">
          {A.signOut}
        </button>
        <DeleteData
          onDeleted={() => {
            onDeleted();
            signOut("/account");
          }}
        />
      </p>
    </div>
  );
}
