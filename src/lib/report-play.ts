// Browser side of the anonymous play counter (src/lib/plays.ts): once per day, after the daily puzzle is finished, send
// the date, the score and how many days ago this browser first finished one. No id goes with it.
import { daysBetween, type DailySave } from "@/lib/daily";

const SENT = "atlas-plays-sent";

export function reportPlay(save: DailySave, date: string, score: number) {
  try {
    if (localStorage.getItem(SENT) === date) return;
    localStorage.setItem(SENT, date);
  } catch {
    // storage blocked: still count it, the server's per-network limit stops repeats
  }
  const finished = Object.keys(save.days)
    .filter((d) => typeof save.days[d].s === "number" && d <= date)
    .sort();
  const first = Math.max(0, daysBetween(finished[0] ?? date, date));
  fetch("/api/plays", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, score, first }),
    keepalive: true,
  }).catch(() => {});
}
