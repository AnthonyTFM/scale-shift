"use client";

import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useRef, useState } from "react";
import { maybeSignedIn, signInOn } from "@/lib/sign-in";

/** What the daily game and leaderboard need from sign-in, whether or not Clerk has loaded. */
export type Account = {
  /** false until we know whether this browser is signed in */
  isLoaded: boolean;
  isSignedIn: boolean;
  /** opens the sign-in window; `back` is the page to return to afterwards */
  openSignIn: (back: string) => void;
  signOut: (back: string) => void;
  /** start downloading Clerk ahead of a likely sign-in (no window opens) */
  prepare: () => void;
  /** true between a tap on "Sign in" and Clerk's window opening */
  opening: boolean;
  /** true when a sign-in window was asked for but never opened (Clerk blocked or offline); cleared by the next try */
  openFailed?: boolean;
};

const noop = () => {};
const AccountContext = createContext<Account>({ isLoaded: true, isSignedIn: false, openSignIn: noop, signOut: noop, prepare: noop, opening: false });

/** Sign-in state for the daily game and the leaderboard. */
export const useAccount = () => useContext(AccountContext);

const RELOADED = "signin-chunk-reload";
// Clerk (about 1.2MB of scripts) only downloads for players who are signed in or tap "Sign in". If its code can't be
// fetched (usually a new deploy replaced it), reload once to get the current version rather than crash the page.
const ClerkBridge = lazy(() =>
  import("./ClerkBridge").catch(() => {
    try {
      if (!sessionStorage.getItem(RELOADED)) {
        sessionStorage.setItem(RELOADED, "1");
        location.reload();
      }
    } catch {
      /* storage blocked: stay signed out rather than loop */
    }
    return new Promise<never>(() => {});
  }),
);

/** Set when a sign-in window opens: a sign-in that leaves the page (Google) comes back to a fresh page load. */
export const SIGNIN_RETURN = "signin-return";
const returningFromSignIn = () => {
  try {
    // Clerk's development token in the address bar, or our own flag
    if (/[?&]__clerk_/.test(location.search)) return true;
    if (sessionStorage.getItem(SIGNIN_RETURN)) {
      sessionStorage.removeItem(SIGNIN_RETURN);
      return true;
    }
  } catch {
    /* storage blocked */
  }
  return false;
};

/** If the sign-in window hasn't opened after this long (blocked, offline), let the player try again. */
const OPEN_TIMEOUT = 15_000;

/**
 * Loads sign-in (Clerk) on the pages that post scores, only when it's needed: straight away for a returning signed-in
 * player, otherwise on the first tap of a sign-in button. Without Clerk's keys it renders the page as before.
 */
export function SignInProvider({ children }: { children: React.ReactNode }) {
  // why Clerk is loading: a signed-in player came back ("session"), or someone tapped "Sign in" ("tap")
  const [load, setLoad] = useState<"session" | "tap" | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [checked, setChecked] = useState(false);
  const [opening, setOpening] = useState(false);
  const [openFailed, setOpenFailed] = useState(false);
  // a sign-in tapped before Clerk arrived, opened as soon as it's ready
  const pending = useRef<string | null>(null);
  const takePending = useCallback(() => {
    const back = pending.current;
    pending.current = null;
    return back;
  }, []);
  const prepare = useCallback(() => setLoad((l) => l ?? "tap"), []);

  useEffect(() => {
    if (!opening) return;
    const id = setTimeout(() => {
      setOpening(false);
      setOpenFailed(true);
      // don't open it later, out of context, if Clerk turns up after all
      pending.current = null;
    }, OPEN_TIMEOUT);
    return () => clearTimeout(id);
  }, [opening]);

  useEffect(() => {
    if (!signInOn) return;
    queueMicrotask(() => {
      if (maybeSignedIn() || returningFromSignIn()) setLoad("session");
      setChecked(true);
    });
  }, []);

  const value: Account = account ?? {
    // a likely signed-in player waits for Clerk; everyone else is signed out until they tap "Sign in"
    isLoaded: checked && load !== "session",
    isSignedIn: false,
    opening,
    openFailed,
    openSignIn: (back) => {
      pending.current = back;
      setOpenFailed(false);
      setOpening(true);
      setLoad((l) => l ?? "tap");
    },
    signOut: noop,
    prepare,
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
