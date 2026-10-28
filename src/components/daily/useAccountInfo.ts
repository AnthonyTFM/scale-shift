"use client";

import { useEffect, useRef, useState } from "react";
import { loadPlayer, rememberPlayer } from "@/lib/player";
import { accountCopy as A } from "@/content/account";
import { useAccount } from "./SignInProvider";

export type AccountInfo = { id: string; name: string | null; reminders: boolean; welcomed?: boolean } | null;

/**
 * The signed-in player's username and reminder setting, and saving either. `info` is undefined while loading (or after a
 * failed load: see `failed`), and null for an account that has never played. Used by the one-time welcome pop-up and the
 * account page. `auto: false` skips the load on sign-in, for a caller that loads once it's ready (after saving a score).
 */
export function useAccountInfo({ auto = true }: { auto?: boolean } = {}) {
  const { isLoaded, isSignedIn } = useAccount();
  const [info, setInfo] = useState<AccountInfo | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  // only the latest load counts: an older answer (or one from before a sign-out) arriving late is ignored
  const latest = useRef(0);

  const refresh = (): Promise<AccountInfo | undefined> => {
    const n = ++latest.current;
    setFailed(false);
    return fetch("/api/leaderboard/me")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<{ player?: AccountInfo }>;
      })
      .then((d) => {
        const p = d.player ?? null;
        if (n !== latest.current) return p;
        if (p) rememberPlayer({ id: p.id, name: p.name });
        setInfo(p);
        return p;
      })
      .catch(() => {
        if (n === latest.current) setFailed(true);
        return undefined;
      });
  };

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      latest.current++;
      queueMicrotask(() => {
        setInfo(undefined);
        setFailed(false);
      });
      return;
    }
    if (auto) queueMicrotask(refresh);
  }, [isLoaded, isSignedIn, auto]);

  const post = async (url: string, body: Record<string, unknown>) => {
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ player: loadPlayer()?.id ?? "", ...body }) });
      return (await res.json()) as { ok: boolean; error?: string; player?: { id: string; name: string } };
    } catch {
      return { ok: false, error: A.errors.network };
    }
  };

  /** Resolves to an error message, or "" once saved. */
  const saveName = async (name: string): Promise<string> => {
    const d = await post("/api/leaderboard/name", { name });
    if (!d.ok || !d.player) return d.error ?? A.errors.generic;
    const p = d.player;
    rememberPlayer(p);
    setInfo((i) => ({ id: p.id, name: p.name, reminders: i?.reminders ?? false, welcomed: true }));
    return "";
  };

  /** Resolves to an error message, or "" once saved. */
  const saveReminders = async (on: boolean): Promise<string> => {
    const d = await post("/api/leaderboard/reminders", { on });
    if (!d.ok) return d.error ?? A.errors.generic;
    setInfo((i) => (i ? { ...i, reminders: on } : i));
    return "";
  };

  /** The welcome pop-up has been shown: no other device shows it again. */
  const markWelcomed = () => {
    setInfo((i) => (i ? { ...i, welcomed: true } : i));
    fetch("/api/leaderboard/me", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ welcomed: true }) }).catch(() => {});
  };

  return { info, failed, refresh, saveName, saveReminders, markWelcomed };
}
