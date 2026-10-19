// "Challenge a friend" links: /daily#c=<day>.<score>.<nickname>. Kept in the # so the page stays static and nothing reaches the server.
import { isOffensive } from "./name-filter";

export type Challenge = { day: number; score: number; name: string };

export function challengeHash(day: number, score: number, name: string | null) {
  return `#c=${day}.${score}.${encodeURIComponent((name ?? "").slice(0, 16))}`;
}

/** Reads a challenge from the page address. Bad or offensive names become "A friend". */
export function readChallenge(hash: string): Challenge | null {
  const m = /[#&]c=(\d{1,5})\.([0-5])\.?([^&]*)/.exec(hash);
  if (!m) return null;
  let name = "";
  try {
    name = decodeURIComponent(m[3]).replace(/\s+/g, " ").trim().slice(0, 16);
  } catch {
    /* malformed: fall back below */
  }
  if (!/^[\p{L}\p{N}][\p{L}\p{N} _.-]*$/u.test(name) || isOffensive(name)) name = "A friend";
  return { day: Number(m[1]), score: Number(m[2]), name };
}
