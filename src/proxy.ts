import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Sign-in for the leaderboard (see src/lib/account.ts). Runs only on the pages and API that use it, so the map and the
// rest of the site never wait on it. Until Clerk's keys are set in Vercel it lets every request straight through.
const on = !!(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default on ? clerkMiddleware() : () => NextResponse.next();

export const config = {
  matcher: ["/daily", "/leaderboard", "/api/leaderboard/:path*"],
};
