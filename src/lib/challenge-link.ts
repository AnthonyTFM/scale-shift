// The shape of a "beat my score" link, with no imports so `npm test` can load it in Node.
//
// New links are pages, so a text or a post shows a preview with the sender's score: /d/<day>.<score>.<name>
// (the name is optional). Older links put the same three things after a #: /daily#c=<day>.<score>.<name>. Both are read.

export type ChallengeLink = { day: number; score: number; name: string };

/** 1 to 16 letters, digits, spaces, dots, dashes or underscores, starting with a letter or digit. */
export const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} _.-]*$/u;
export const NAME_MAX = 16;

/** Trims, squeezes spaces and cuts a shared name to length. Returns "" for anything that isn't a plain name. */
export function tidyName(raw: string) {
  const name = raw.replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
  return NAME_RE.test(name) ? name : "";
}

/** The link's path: "/d/16.3.Anthony", or "/d/16.3" with no name. */
export function challengePath(day: number, score: number, name: string | null) {
  const n = tidyName(name ?? "");
  return `/d/${day}.${score}${n ? `.${encodeURIComponent(n)}` : ""}`;
}

/** The old form, kept for links already sent: "#c=16.3.Anthony". */
export function challengeHash(day: number, score: number, name: string | null) {
  return `#c=${day}.${score}.${encodeURIComponent(tidyName(name ?? ""))}`;
}

const dayOk = (s: string) => /^\d{1,5}$/.test(s) && Number(s) >= 1;
const scoreOk = (s: string) => /^[0-5]$/.test(s);

function decode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return "";
  }
}

/**
 * Reads the part after /d/ ("16.3.Anthony", still URL-encoded). A bad day or score is no link at all; a bad name is "".
 * A name can hold dots ("Mr. T"), so only the first two are separators.
 */
export function parseChallengeSegment(segment: string | undefined): ChallengeLink | null {
  if (!segment) return null;
  const [day, score, ...rest] = segment.split(".");
  if (!dayOk(day) || score === undefined || !scoreOk(score)) return null;
  return { day: Number(day), score: Number(score), name: tidyName(decode(rest.join("."))) };
}

/** Reads a page address: the new path, or the old #c= form. */
export function parseChallengeUrl(pathname: string, hash: string): ChallengeLink | null {
  const path = /^\/d\/([^/]+)\/?$/.exec(pathname);
  if (path) return parseChallengeSegment(path[1]);
  const m = /[#&]c=(\d{1,5})\.([0-5])\.?([^&]*)/.exec(hash);
  if (!m || !dayOk(m[1])) return null;
  return { day: Number(m[1]), score: Number(m[2]), name: tidyName(decode(m[3])) };
}
