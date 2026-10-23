// This browser's leaderboard identity: a random ID (kept private), the public nickname, the private sign-up email
// and whether they asked for reminder emails.

export type Player = { id: string; name: string; email?: string; reminders?: boolean };

// v2: reset on Oct 19 with the fresh leaderboard (players now sign in)
const KEY = "atlas-player-v2";

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
export function savePlayer(name: string, email?: string, reminders?: boolean): Player {
  const old = loadPlayer();
  const p: Player = { id: old?.id ?? crypto.randomUUID(), name, email: email || old?.email, reminders: reminders ?? old?.reminders };
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage blocked: works for this visit only */
  }
  return p;
}

/** After signing in: this browser becomes the account's player (the email stays on the server). */
export function rememberPlayer(p: { id: string; name: string }) {
  try {
    const old = loadPlayer();
    localStorage.setItem(KEY, JSON.stringify({ id: p.id, name: p.name, reminders: old?.id === p.id ? old.reminders : undefined }));
  } catch {
    /* storage blocked */
  }
}

/** Player ID for "highlight me" on the leaderboard, without creating one. */
export const playerId = () => loadPlayer()?.id ?? null;

/** After deleting their data: this browser forgets the player too. */
export function forgetPlayer() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage blocked */
  }
}
