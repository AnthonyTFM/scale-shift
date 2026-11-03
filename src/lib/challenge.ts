// "Beat my score" links (see src/lib/challenge-link.ts for their shape). Nothing in a link reaches the server
// except the page address itself; the score to beat is only ever shown, never trusted for anything.
import { isOffensive } from "./name-filter";
import { parseChallengeSegment, parseChallengeUrl, type ChallengeLink } from "./challenge-link";

export { challengeHash, challengePath, tidyName } from "./challenge-link";

export type Challenge = ChallengeLink;

export const FALLBACK_NAME = "A friend";

/** A link with no name, or an offensive one, comes from "A friend". */
function named(c: ChallengeLink | null): Challenge | null {
  if (!c) return null;
  return { ...c, name: c.name && !isOffensive(c.name) ? c.name : FALLBACK_NAME };
}

/** Reads a challenge page's address part ("16.3.Anthony"); null when it isn't a challenge. */
export const challengeFromSegment = (segment: string | undefined) => named(parseChallengeSegment(segment));

/** Reads a challenge from the page address: the /d page, or an old /daily#c= link. */
export const readChallenge = (pathname: string, hash: string) => named(parseChallengeUrl(pathname, hash));
