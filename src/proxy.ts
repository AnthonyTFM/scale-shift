import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Sign-in for the leaderboard (see src/lib/account.ts). Runs only on the API that reads it: the /daily and /leaderboard
// pages load Clerk in the browser when it's needed (SignInProvider), so first-time visitors aren't bounced through
// Clerk's servers before the page shows. Until Clerk's keys are set in Vercel it lets every request straight through.
const on = !!(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default on ? clerkMiddleware() : () => NextResponse.next();

export const config = {
  matcher: ["/api/leaderboard/:path*"],
};
