"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount } from "./SignInProvider";
import { forgetPlayer, rememberPlayer } from "@/lib/player";
import { signInOn } from "@/lib/sign-in";
import { account as A } from "@/content/legal";
import { AgeCheck, useAgeOk } from "./AgeCheck";

const DELETED = "lb-deleted";

/** Leaderboard page, with sign-in on: who you're signed in as, or a way to sign in. Nothing when sign-in is off. */
export function AccountBar() {
  return signInOn ? <Bar /> : null;
}

function Bar() {
  const { isLoaded, isSignedIn, openSignIn, signOut, opening } = useAccount();
  const [name, setName] = useState<string | null | undefined>(undefined);
  const [ageOk, setAgeOk] = useAgeOk();
  const [askAge, setAskAge] = useState(false);
  // set just before the sign-out that follows "Delete my data", so the page can confirm it worked
  const [deleted, setDeleted] = useState(() => {
    try {
      return typeof window !== "undefined" && sessionStorage.getItem(DELETED) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.removeItem(DELETED);
    } catch {
      /* storage blocked */
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch("/api/leaderboard/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { player?: { id: string; name: string | null } | null } | null) => {
        const p = d?.player;
        if (p?.name) rememberPlayer({ id: p.id, name: p.name });
        setName(p?.name ?? null);
      })
      .catch(() => setName(null));
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) return <div className="mb-4 h-6" />;
  return (
    <div className="mb-4 text-sm text-ink-soft">
      <p className="flex flex-wrap items-center gap-x-3">
        {isSignedIn ? (
          <>
            <span>
              {name ? (
                <>
                  Signed in as <strong className="text-ink">{name}</strong>.
                </>
              ) : name === null ? (
                "Signed in. Finish an endless run to get on the board."
              ) : (
                "Signed in."
              )}
            </span>
            <button
              type="button"
              onClick={() => signOut("/leaderboard")}
              className="inline-flex min-h-11 items-center font-semibold text-link hover:underline"
            >
              Sign out
            </button>
            <DeleteData
              onDeleted={() => {
                try {
                  sessionStorage.setItem(DELETED, "1");
                } catch {
                  /* storage blocked: the line below still shows until the page reloads */
                }
                // sign-out returns to this same page without remounting it, so show the confirmation now
                setDeleted(true);
                signOut("/leaderboard");
              }}
            />
          </>
        ) : (
          <>
            <span>Keep your nickname on every device:</span>
            <button
              type="button"
              onClick={() => {
                if (!ageOk) {
                  setAskAge(true);
                  return requestAnimationFrame(() => document.getElementById("age-ok-bar")?.focus());
                }
                openSignIn("/leaderboard");
              }}
              disabled={opening}
              className="inline-flex min-h-11 items-center font-semibold text-link hover:underline"
            >
              {opening ? "Opening sign-in…" : "Sign in →"}
            </button>
          </>
        )}
      </p>
      {!isSignedIn && askAge ? <AgeCheck id="age-ok-bar" ok={ageOk} error={!ageOk} onChange={setAgeOk} /> : null}
      {deleted && !isSignedIn ? (
        <p role="status" className="mt-1 font-semibold text-ink">
          {A.deleted}
        </p>
      ) : null}
    </div>
  );
}

/** "Delete my data": a second tap confirms, then the server removes the player and the sign-in account. */
function DeleteData({ onDeleted }: { onDeleted: () => void }) {
  const [step, setStep] = useState<"idle" | "confirm" | "deleting" | "error">("idle");
  const [error, setError] = useState("");
  const keep = useRef<HTMLButtonElement>(null);
  const open = useRef<HTMLButtonElement>(null);
  const moved = useRef(false);
  // keyboard focus follows the confirmation: onto "Keep my data" when it opens, back to the button when cancelled
  useEffect(() => {
    if (step === "confirm") keep.current?.focus();
    else if (step === "idle" && moved.current) open.current?.focus();
    if (step !== "idle") moved.current = true;
  }, [step]);

  const run = async () => {
    setStep("deleting");
    try {
      const res = await fetch("/api/leaderboard/me", { method: "DELETE" });
      const d = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !d.ok) throw new Error(d.error || A.deleteFailed);
      forgetPlayer();
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : A.deleteFailed);
      setStep("error");
    }
  };

  if (step === "idle")
    return (
      <button
        ref={open}
        type="button"
        onClick={() => setStep("confirm")}
        className="inline-flex min-h-11 items-center font-semibold text-muted hover:text-ink hover:underline"
      >
        {A.delete}
      </button>
    );
  return (
    <span className="flex w-full flex-wrap items-center gap-x-3 rounded-xl bg-white p-3 ring-1 ring-line">
      <span role="alert" className="text-ink">
        {step === "error" ? error : A.deleteConfirm}
      </span>
      <button type="button" onClick={run} disabled={step === "deleting"} className="btn btn-red text-sm">
        {step === "deleting" ? A.deleting : A.deleteYes}
      </button>
      <button
        ref={keep}
        type="button"
        onClick={() => setStep("idle")}
        disabled={step === "deleting"}
        className="inline-flex min-h-11 items-center font-semibold text-link hover:underline"
      >
        {A.keep}
      </button>
    </span>
  );
}
