/** Leaderboard sign-in is on once Clerk's publishable key is set in Vercel (it's public; the secret key stays server-side). */
export const signInOn = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/** Probably signed in, without loading Clerk: it sets this cookie to the time of the last sign-in, and to 0 when signed out. */
export const maybeSignedIn = () => typeof document !== "undefined" && /(?:^|;\s*)__client_uat(?:_[^=]*)?=[1-9]/.test(document.cookie);
