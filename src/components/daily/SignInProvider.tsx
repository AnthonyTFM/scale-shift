"use client";

import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useRef, useState } from "react";
import { signInOn } from "@/lib/sign-in";

/** What the daily game and leaderboard need from sign-in, whether or not Clerk has loaded. */
export type Account = {
  /** false until we know whether this browser is signed in */
  isLoaded: boolean;
  isSignedIn: boolean;
  /** opens the sign-in window; `back` is the page to return to afterwards */
  openSignIn: (back: string) => void;
  signOut: (back: string) => void;
  /** true between a tap on "Sign in" and Clerk's window opening */
  opening: boolean;
};

const noop = () => {};
const AccountContext = createContext<Account>({ isLoaded: true, isSignedIn: false, openSignIn: noop, signOut: noop, opening: false });

/** Sign-in state for the daily game and the leaderboard. */
export const useAccount = () => useContext(AccountContext);

// Clerk (about 1.2MB of scripts) only downloads for players who are signed in or tap "Sign in"
const ClerkBridge = lazy(() => import("./ClerkBridge"));

/** Clerk sets this cookie to the time of the last sign-in, and to 0 when signed out. */
const maybeSignedIn = () => /(?:^|;\s*)__client_uat(?:_[^=]*)?=[1-9]/.test(document.cookie);

/**
 * Loads sign-in (Clerk) on the pages that post scores, only when it's needed: straight away for a returning signed-in
 * player, otherwise on the first tap of a sign-in button. Without Clerk's keys it renders the page as before.
 */
export function SignInProvider({ children }: { children: React.ReactNode }) {
  // why Clerk is loading: a signed-in player came back ("session"), or someone tapped "Sign in" ("tap")
  const [load, setLoad] = useState<"session" | "tap" | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [checked, setChecked] = useState(false);
  // a sign-in tapped before Clerk arrived, opened as soon as it's ready
  const pending = useRef<string | null>(null);
  const takePending = useCallback(() => {
    const back = pending.current;
    pending.current = null;
    return back;
  }, []);

  useEffect(() => {
    if (!signInOn) return;
    queueMicrotask(() => {
      if (maybeSignedIn()) setLoad("session");
      setChecked(true);
    });
  }, []);

  const value: Account = account ?? {
    // a likely signed-in player waits for Clerk; everyone else is signed out until they tap "Sign in"
    isLoaded: checked && load !== "session",
    isSignedIn: false,
    opening: load === "tap",
    openSignIn: (back) => {
      pending.current = back;
      setLoad((l) => l ?? "tap");
    },
    signOut: noop,
  };

  if (!signInOn) return <>{children}</>;
  return (
    <AccountContext.Provider value={value}>
      {children}
      {load ? (
        <Suspense fallback={null}>
          <ClerkBridge onChange={setAccount} takePending={takePending} />
        </Suspense>
      ) : null}
    </AccountContext.Provider>
  );
}
