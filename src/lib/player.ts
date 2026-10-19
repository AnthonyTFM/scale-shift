// This browser's leaderboard identity: a random ID (kept private), the public nickname and the private sign-up email.

export type Player = { id: string; name: string; email?: string };

const KEY = "atlas-player-v1";

export function loadPlayer(): Player | null {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (p && typeof p.id === "string" && typeof p.name === "string") return p;
  } catch {
    /* storage blocked */
  }
  return null;
}

/** Keeps the same ID when the nickname changes, so past scores stay yours. */
export function savePlayer(name: string, email?: string): Player {
  const old = loadPlayer();
  const p: Player = { id: old?.id ?? crypto.randomUUID(), name, email: email || old?.email };
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage blocked: works for this visit only */
  }
  return p;
}

/** Player ID for "highlight me" on the leaderboard, without creating one. */
export const playerId = () => loadPlayer()?.id ?? null;
