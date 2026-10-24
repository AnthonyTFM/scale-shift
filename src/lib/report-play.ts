// Browser side of the anonymous play counter (src/lib/plays.ts): once per day, after the daily puzzle is finished, send
// the date, the score and how many days ago this player first finished one. No id goes with it. Signed-in players
// bring their account's history to a new device, so they count as returning there, not new.
import { daysBetween, type DailySave } from "@/lib/daily";

const SENT = "atlas-plays-sent";
// a count that couldn't be sent (offline, server busy): tried again on the next visit to /daily
const PENDING = "atlas-plays-pending";

type Payload = { date: string; score: number; first: number };

function send(p: Payload) {
  fetch("/api/plays", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p), keepalive: true })
    .then((res) => {
      try {
        // counted, or refused for good (a day no longer playable): either way, stop trying
        if (res.ok || res.status === 400) localStorage.removeItem(PENDING);
        else localStorage.setItem(PENDING, JSON.stringify(p));
      } catch {
        /* storage blocked */
      }
    })
    .catch(() => {
      try {
        localStorage.setItem(PENDING, JSON.stringify(p));
      } catch {
        /* storage blocked */
      }
    });
}

export function reportPlay(save: DailySave, date: string, score: number) {
  try {
    if (localStorage.getItem(SENT) === date) return;
    localStorage.setItem(SENT, date);
  } catch {
    // storage blocked: still count it
  }
  const finished = Object.keys(save.days)
    .filter((d) => typeof save.days[d].s === "number" && d <= date)
    .sort();
  send({ date, score, first: Math.max(0, daysBetween(finished[0] ?? date, date)) });
}

/** Sends a count left over from a visit where it failed. */
export function retryPendingPlay() {
  try {
    const p = JSON.parse(localStorage.getItem(PENDING) ?? "null") as Payload | null;
    if (p && typeof p.date === "string") send(p);
  } catch {
    /* nothing to send */
  }
}
