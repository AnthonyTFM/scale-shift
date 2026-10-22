"use client";

import { useEffect } from "react";
import { ClerkProvider, useAuth, useClerk } from "@clerk/nextjs";
import type { Account } from "./SignInProvider";

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
    const openSignIn = (back: string) => clerk.openSignIn({ withSignUp: true, forceRedirectUrl: back, signUpForceRedirectUrl: back });
    onChange({
      isLoaded: true,
      isSignedIn: !!isSignedIn,
      opening: false,
      openSignIn,
      signOut: (back) => void clerk.signOut({ redirectUrl: back }),
    });
    // the player tapped "Sign in" while Clerk was still downloading
    const back = takePending();
    if (back && !isSignedIn) openSignIn(back);
  }, [isLoaded, isSignedIn, clerk, onChange, takePending]);

  return null;
}
