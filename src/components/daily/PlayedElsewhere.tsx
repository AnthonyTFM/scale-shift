"use client";

import { useState } from "react";
import { useAccount } from "./SignInProvider";
import { AgeCheck, useAgeOk } from "./AgeCheck";
import { dailyCopy as t } from "@/content/daily";

/** Before playing, for signed-out players: sign in to bring today's result over from another device instead of replaying. */
export function PlayedElsewhere() {
  const { isLoaded, isSignedIn, openSignIn, opening } = useAccount();
  const [ageOk, setAgeOk] = useAgeOk();
  const [askAge, setAskAge] = useState(false);
  // hold the strip's space while sign-in loads, so the game doesn't jump down when it appears
  if (!isLoaded) return <p aria-hidden="true" className="mb-2 h-8 sm:mb-3 sm:h-9" />;
  if (isSignedIn) return null;
  return (
    <div className="mb-2 sm:mb-3">
      <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl bg-white px-3 py-1.5 sm:py-2 text-sm text-ink-soft ring-1 ring-line">
        <span>
          <span className="sm:hidden">{t.playedElsewhereShort}</span>
          <span className="hidden sm:inline">{t.playedElsewhere}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            // signing in can create a new account, so the age check comes first here too
            if (!ageOk) {
              setAskAge(true);
              return requestAnimationFrame(() => document.getElementById("age-ok-elsewhere")?.focus());
            }
            openSignIn("/daily");
          }}
          disabled={opening}
          className="inline-flex min-h-11 items-center font-bold text-primary hover:underline"
        >
          {opening ? (
            t.signInOpening
          ) : (
            <>
              <span className="sm:hidden">{t.signInToSeeShort}</span>
              <span className="hidden sm:inline">{t.signInToSee}</span> →
            </>
          )}
        </button>
      </p>
      {askAge ? <AgeCheck id="age-ok-elsewhere" ok={ageOk} error={!ageOk} onChange={setAgeOk} /> : null}
    </div>
  );
}
