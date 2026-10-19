// Tiny analytics hook. Sends a GA4 event when NEXT_PUBLIC_GA4_ID is set; otherwise it does nothing.

type Params = Record<string, unknown>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(event: string, params: Params = {}) {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", event, params);
  } catch {
    // analytics must never break the app
  }
}
