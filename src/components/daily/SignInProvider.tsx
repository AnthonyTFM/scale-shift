import { ClerkProvider } from "@clerk/nextjs";
import { signInOn } from "@/lib/sign-in";

/** Loads sign-in (Clerk) on the pages that post scores. Without Clerk's keys it renders the page as before. */
export function SignInProvider({ children }: { children: React.ReactNode }) {
  return signInOn ? <ClerkProvider>{children}</ClerkProvider> : <>{children}</>;
}
