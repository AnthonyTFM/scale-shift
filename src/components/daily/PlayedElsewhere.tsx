"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import { dailyCopy as t } from "@/content/daily";

/** Before playing, for signed-out players: sign in to bring today's result over from another device instead of replaying. */
export function PlayedElsewhere() {
  const { isLoaded, isSignedIn } = useAuth();
  // hold the strip's space while sign-in loads, so the game doesn't jump down when it appears
  if (!isLoaded) return <p aria-hidden="true" className="mb-2 h-8 sm:mb-3 sm:h-9" />;
  if (isSignedIn) return null;
  return (
    <p className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl bg-white px-3 py-1.5 sm:mb-3 sm:py-2 text-sm text-ink-soft ring-1 ring-line">
      <span>
        <span className="sm:hidden">{t.playedElsewhereShort}</span>
        <span className="hidden sm:inline">{t.playedElsewhere}</span>
      </span>
      <SignInButton mode="modal" withSignUp forceRedirectUrl="/daily" signUpForceRedirectUrl="/daily">
        <button type="button" className="font-semibold text-link hover:underline">
          <span className="sm:hidden">{t.signInToSeeShort}</span>
          <span className="hidden sm:inline">{t.signInToSee}</span> →
        </button>
      </SignInButton>
    </p>
  );
}
