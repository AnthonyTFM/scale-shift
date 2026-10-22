"use client";

import { useEffect } from "react";
import { ClerkProvider, useAuth, useClerk } from "@clerk/nextjs";
import { SIGNIN_RETURN, type Account } from "./SignInProvider";

type Props = { onChange: (a: Account) => void; takePending: () => string | null };

/** Loaded on demand by SignInProvider: starts Clerk and reports the sign-in state back up. */
export default function ClerkBridge(props: Props) {
  return (
    <ClerkProvider>
      <Report {...props} />
    </ClerkProvider>
  );
}

function Report({ onChange, takePending }: Props) {
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();

  useEffect(() => {
    if (!isLoaded) return;
    const openSignIn = (back: string) => {
      // Google sign-in leaves the page; this tells the page it comes back to that Clerk is needed straight away
      try {
        sessionStorage.setItem(SIGNIN_RETURN, "1");
      } catch {
        /* storage blocked: the dev token in the address bar still tells */
      }
      clerk.openSignIn({ withSignUp: true, forceRedirectUrl: back, signUpForceRedirectUrl: back });
    };
    onChange({
      isLoaded: true,
      isSignedIn: !!isSignedIn,
      opening: false,
      openSignIn,
      signOut: (back) => void clerk.signOut({ redirectUrl: back }),
      prepare: () => {},
    });
    // signed in inside the window (no page change): the return flag isn't needed
    if (isSignedIn) {
      try {
        sessionStorage.removeItem(SIGNIN_RETURN);
      } catch {
        /* storage blocked */
      }
    }
    // the player tapped "Sign in" while Clerk was still downloading
    const back = takePending();
    if (back && !isSignedIn) openSignIn(back);
  }, [isLoaded, isSignedIn, clerk, onChange, takePending]);

  return null;
}
