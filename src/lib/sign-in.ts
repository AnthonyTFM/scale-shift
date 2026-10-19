/** Leaderboard sign-in is on once Clerk's publishable key is set in Vercel (it's public; the secret key stays server-side). */
export const signInOn = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
