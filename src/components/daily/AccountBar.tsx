"use client";

import { useEffect, useState } from "react";
import { SignInButton, SignOutButton, useAuth } from "@clerk/nextjs";
import { rememberPlayer } from "@/lib/player";
import { signInOn } from "@/lib/sign-in";

/** Leaderboard page, with sign-in on: who you're signed in as, or a way to sign in. Nothing when sign-in is off. */
export function AccountBar() {
  return signInOn ? <Bar /> : null;
}

function Bar() {
  const { isLoaded, isSignedIn } = useAuth();
  const [name, setName] = useState<string | null | undefined>(undefined);

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
    <p className="mb-4 flex flex-wrap items-center gap-x-2 text-sm text-ink-soft">
      {isSignedIn ? (
        <>
          <span>{name ? <>Signed in as <strong className="text-ink">{name}</strong>.</> : name === null ? "Signed in. Play today's challenge to join the board." : "Signed in."}</span>
          <SignOutButton>
            <button type="button" className="font-semibold text-link hover:underline">
              Sign out
            </button>
          </SignOutButton>
        </>
      ) : (
        <>
          <span>Same nickname on every device:</span>
          <SignInButton mode="modal">
            <button type="button" className="font-semibold text-link hover:underline">
              Sign in →
            </button>
          </SignInButton>
        </>
      )}
    </p>
  );
}
