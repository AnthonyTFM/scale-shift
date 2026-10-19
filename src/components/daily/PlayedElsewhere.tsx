"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";

/** Before playing, for signed-out players: sign in to bring today's result over from another device instead of replaying. */
export function PlayedElsewhere() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded || isSignedIn) return null;
  return (
    <p className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl bg-white px-3 py-2 text-sm text-ink-soft ring-1 ring-line">
      <span>Played today on another device?</span>
      <SignInButton mode="modal" withSignUp forceRedirectUrl="/daily" signUpForceRedirectUrl="/daily">
        <button type="button" className="font-semibold text-link hover:underline">
          Sign in to see your result →
        </button>
      </SignInButton>
    </p>
  );
}
