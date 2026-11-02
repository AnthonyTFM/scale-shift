// Browser side of the anonymous endless-run counter (src/lib/plays.ts): when a run ends, send how long it was. No id
// goes with it, and each run is sent once (its seed is remembered in this browser).
const SENT = "atlas-run-sent";
let sentHere: string | null = null;

export function reportRun(seed: string, streak: number) {
  if (sentHere === seed) return;
  sentHere = seed;
  try {
    if (localStorage.getItem(SENT) === seed) return;
    localStorage.setItem(SENT, seed);
  } catch {
    // storage blocked: still count it, once per page
  }
  fetch("/api/plays", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ run: streak }), keepalive: true }).catch(() => {});
}
